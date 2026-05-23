// End-to-end ingest orchestrator.
// SOP: architecture/sop_orchestrator.md
//
// Sequence:
//   1. Init                                  (start ingest_run)
//   2. Preflight                             (roster, staff, exceptions)
//   3. Ingest source files                   (Unify, Volunteer Credit Exports)
//   4. Apply SPLIT exceptions                (and multi-rep split)
//   5. Categorize + resolve identity         (folded into compute_metrics)
//   6. Aggregate + ADJUST                    (compute_metrics)
//   7. Write                                 (sink)
//   8. Finalize                              (missing_matches CSV)

import { existsSync, readdirSync, writeFileSync, mkdirSync, statSync, readFileSync } from 'node:fs';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IngestErrorCollector } from './ingest_errors.js';
import { parseMasterRoster, FatalRosterError } from './parse_master_roster.js';
import { parseStaffDirectory, FatalStaffDirectoryError } from './parse_staff_directory.js';
import { parseExceptions } from './parse_exceptions.js';
import { parseUnifyCsv, FatalUnifyCsvError } from './parse_unify_csv.js';
import {
  parseVolunteerCredit,
  FatalCreditExportError,
  type CashRoutingRule,
  type CreditRoutingPattern,
} from './parse_volunteer_credit.js';
import { applyExceptionsAndSplit } from './apply_exceptions.js';
import { computeMetrics } from './compute_metrics.js';
import {
  computeHistoricalBaseline,
  isHistoricalFile,
} from './compute_historical_baseline.js';
import { deriveRole } from './derive_role.js';
import { computeMomentum } from './compute_momentum.js';
import { computeCurrentSprint } from './compute_current_sprint.js';
import { computeSignals } from './compute_signals.js';
import { InMemorySink } from './write_supabase.js';
import type {
  CreditRecord,
  IngestSink,
  IngestRunSummary,
  PushRecord,
} from './types.js';

/**
 * Opt-in Stream C bundle. When omitted, the engine emits genuine NULL for
 * role / signals / momentum / currentSprint (the v1-only contract). When
 * present, the four Stream C scripts run after compute_metrics in this
 * order — momentum → currentSprint → signals (depends on the prior two)
 * → role.
 */
export type StreamCOptions = {
  pushes: PushRecord[];
  adminVolunteerIds?: Set<string>;
  /** Defaults to `new Date()`. Injectable for deterministic tests. */
  now?: Date;
};

export type OrchestrateOptions = {
  sourceDir: string;                          // directory containing Unify CSV + credit exports + exceptions.txt
  rosterPath: string;                          // path to Master Roster xlsx
  staffDirectoryPath: string;                  // path to Sales Staff Directory.xlsx
  pilotSalesCaptainsCsvPath?: string | null;   // optional
  exceptionsPath?: string | null;              // defaults to sourceDir/exceptions.txt
  cashRoutingAllowlist?: CashRoutingRule[];    // defaults to pilot seed
  /**
   * Allow ingest to proceed with zero Volunteer Credit Export files.
   * Production default: false (hard-fail per sop_orchestrator.md). Set true
   * only for explicit Unify-only dev runs.
   */
  allowEmptyCredits?: boolean;
  /** Multi-dimensional opportunity-name pattern rules (substring, case-insensitive). */
  routingPatterns?: CreditRoutingPattern[];
  /**
   * SEASON_YEAR for historical-vs-current classification. Files whose
   * `opportunities_date_range.end < ${seasonYear}-01-01` route to historical
   * baseline. Defaults to the SEASON_YEAR env var (parsed as int) or the
   * current calendar year if unset.
   */
  seasonYear?: number;
  sink: IngestSink;
  triggeredBy?: 'cli' | 'cron' | 'manual';
  tmpDir?: string;                             // defaults to {cwd}/.tmp
  logger?: (level: 'info' | 'warn' | 'error', msg: string, extra?: unknown) => void;
  /**
   * Opt-in v2 field population. Omit (or set falsy) to keep the legacy v1-only
   * output where role/signals/momentum/currentSprint stay NULL.
   */
  streamC?: StreamCOptions;
};

export type OrchestrateResult = {
  status: 'success' | 'partial' | 'failed';
  exitCode: 0 | 1 | 2;
  summary: IngestRunSummary;
  fatalError: Error | null;
};

// Pilot seed mirror — keep in sync with execution/sql/004_seed_incentive_tiers.sql.
// Each entry's routing_metrics array is the source of truth at runtime; the
// legacy `routing` field is preserved for backward compatibility.
const DEFAULT_CASH_ALLOWLIST: CashRoutingRule[] = [
  { type: 'Cash', opportunity_name_pattern: 'AI Help', routing: 'dollars',
    routing_metrics: ['total_fundraising', 'total_points'] },
  { type: '*', opportunity_name_pattern: '2025 FKE Paddle Raise', routing: 'dollars',
    routing_metrics: ['total_fundraising', 'total_points'] },
  { type: '*', opportunity_name_pattern: 'Race for Wishes', routing: 'dollars',
    routing_metrics: ['total_fundraising', 'wishes_for_teachers', 'total_points'] },
  { type: '*', opportunity_name_pattern: '2025 Future Dues', routing: 'dollars',
    routing_metrics: ['total_fundraising', 'total_points'] },
  { type: '*', opportunity_name_pattern: 'Fiesta Sports Foundation - Donation', routing: 'dollars',
    routing_metrics: ['total_fundraising', 'total_points'] },
  { type: '*', opportunity_name_pattern: '2025 Par 3 - Silent Auction', routing: 'dollars',
    routing_metrics: ['total_fundraising', 'total_points'] },
  { type: '*', opportunity_name_pattern: '2025 Par 3 - Prize Donation', routing: 'dollars',
    routing_metrics: ['total_fundraising', 'total_points'] },
];

const DEFAULT_ROUTING_PATTERNS: CreditRoutingPattern[] = [
  { pattern: 'Rate Bowl', routing_metrics: ['total_fundraising', 'rate_bowl', 'total_points'], sort_order: 10 },
  { pattern: 'Wishes',    routing_metrics: ['total_fundraising', 'wishes_for_teachers', 'total_points'], sort_order: 20 },
];

function resolveSeasonYear(opt?: number): number {
  if (typeof opt === 'number' && Number.isFinite(opt)) return opt;
  const env = process.env['SEASON_YEAR'];
  if (env) {
    const n = parseInt(env, 10);
    if (Number.isFinite(n)) return n;
  }
  return new Date().getFullYear();
}

function findLatestUnifyCsv(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((n) => /^Report Data - .+\.csv$/i.test(n))
    .map((n) => ({ name: n, path: join(dir, n) }));
  if (files.length === 0) return null;
  files.sort((a, b) => b.name.localeCompare(a.name));
  return files[0]!.path;
}

/**
 * Sniff the first sheet of an xlsx for the credit-export block-anchor labels.
 * Returns true iff both `Opportunity: Opportunity Name` AND
 * `Volunteer Job: Volunteer Job Name` are found on a single row within the
 * first 60 rows of the first sheet. Used to confirm a candidate file actually
 * is a credit export before adding it to the ingest set (Codex DIM-8).
 */
function looksLikeCreditExport(filePath: string): boolean {
  try {
    const buf = readFileSync(filePath);
    const wb = xlsxRead(buf, { cellDates: true, raw: false, sheets: 0 });
    const name = wb.SheetNames[0];
    if (!name) return false;
    const sheet = wb.Sheets[name];
    if (!sheet) return false;
    const grid = xlsxUtils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      blankrows: true,
    });
    for (let r = 0; r < Math.min(grid.length, 60); r++) {
      const row = grid[r];
      if (!row) continue;
      const cellsLower = row.map((c) => (c == null ? '' : String(c).trim().toLowerCase()));
      if (
        cellsLower.includes('opportunity: opportunity name') &&
        cellsLower.includes('volunteer job: volunteer job name')
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Find Volunteer Credit Export files in a directory.
 *
 * 2026-05-22+ multi-team-per-file mode: filenames no longer carry a team
 * mascot. We accept any `*-YYYY-MM-DD-HH-MM-SS.xlsx` whose first sheet
 * contains the credit-export block-anchor labels. Legacy single-team fixtures
 * (`{TeamMascot}-{ts}.xlsx`) still pass via filename hint AND content sniff.
 */
function findVolunteerCreditFiles(
  dir: string,
  knownTeamMascots: Set<string>,
  excludeBasenames: Set<string>,
): string[] {
  if (!existsSync(dir)) return [];
  const ts = /-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})\.xlsx$/i;
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (excludeBasenames.has(name)) continue;
    if (!ts.test(name)) continue;

    const isMultiTeamProduction = /active yj/i.test(name);
    let isLegacySingleTeam = false;
    const m = ts.exec(name);
    if (m) {
      const beforeTs = name.slice(0, name.length - m[0].length);
      const candidate = beforeTs.replace(/^\d{4}-\d{2}\s+/, '').trim().toLowerCase();
      for (const mascot of knownTeamMascots) {
        if (candidate === mascot.toLowerCase()) {
          isLegacySingleTeam = true;
          break;
        }
      }
    }

    const filenameMatches = isMultiTeamProduction || isLegacySingleTeam;
    const fullPath = join(dir, name);

    // Content-based confirmation: even when the filename matches, verify the
    // sheet actually looks like a credit export. This prevents a roster or
    // unrelated xlsx (that happened to be timestamped) from being passed to
    // the parser, which would then hard-fail the whole run.
    if (filenameMatches && looksLikeCreditExport(fullPath)) {
      out.push(fullPath);
    }
  }
  return out;
}

function defaultLogger(level: 'info' | 'warn' | 'error', msg: string, extra?: unknown) {
  const line = extra
    ? `[${level.toUpperCase()}] ${msg} ${JSON.stringify(extra)}`
    : `[${level.toUpperCase()}] ${msg}`;
  if (level === 'error') console.error(line);
  else console.log(line);
}

export async function orchestrate(opts: OrchestrateOptions): Promise<OrchestrateResult> {
  const started_at = new Date().toISOString();
  const log = opts.logger ?? defaultLogger;
  const errors = new IngestErrorCollector();
  const cashAllowlist = opts.cashRoutingAllowlist ?? DEFAULT_CASH_ALLOWLIST;
  const tmpDir = opts.tmpDir ?? resolve(process.cwd(), '.tmp');

  const partialSummary: IngestRunSummary = {
    started_at,
    finished_at: '',
    status: 'failed',
    triggered_by: opts.triggeredBy ?? 'cli',
    source_files: {
      unify_csv: null,
      roster_xlsx: null,
      staff_directory_xlsx: null,
      credit_xlsxs: [],
      exceptions_txt: null,
    },
    volunteers_upserted: 0,
    errors_count: 0,
    warnings_count: 0,
    notes: null,
  };

  let fatal: Error | null = null;

  try {
    log('info', 'orchestrate:start', { sourceDir: opts.sourceDir });

    // ─── Step 2 — Preflight ──────────────────────────────────────────
    log('info', 'preflight:roster', { path: opts.rosterPath });
    const roster = parseMasterRoster({
      rosterPath: opts.rosterPath,
      pilotSalesCaptainsCsvPath: opts.pilotSalesCaptainsCsvPath ?? null,
      errors,
    });
    partialSummary.source_files.roster_xlsx = opts.rosterPath;
    log('info', `roster:loaded`, { rows: roster.rows.length });

    log('info', 'preflight:staff_directory', { path: opts.staffDirectoryPath });
    const staff = parseStaffDirectory({
      staffDirectoryPath: opts.staffDirectoryPath,
      roster,
      errors,
    });
    partialSummary.source_files.staff_directory_xlsx = opts.staffDirectoryPath;
    log('info', `staff:loaded`, { entries: staff.entries.length });

    const exceptionsPath =
      opts.exceptionsPath ?? join(opts.sourceDir, 'exceptions.txt');
    log('info', 'preflight:exceptions', { path: exceptionsPath });
    const exceptionsResult = parseExceptions({
      exceptionsPath,
      roster,
      errors,
    });
    if (exceptionsResult.file_present) {
      partialSummary.source_files.exceptions_txt = exceptionsPath;
    }
    log('info', 'exceptions:loaded', {
      parsed: exceptionsResult.parsed.length,
      active: exceptionsResult.parsed.filter((e) => e.active).length,
    });

    // ─── Step 3 — Ingest source files ───────────────────────────────
    const unifyCsvPath = findLatestUnifyCsv(opts.sourceDir);
    if (!unifyCsvPath) {
      throw new FatalUnifyCsvError(`No Unify "Report Data - *.csv" file found in ${opts.sourceDir}`);
    }
    partialSummary.source_files.unify_csv = unifyCsvPath;
    log('info', 'ingest:unify', { path: unifyCsvPath });
    const unifyRecords = parseUnifyCsv({ csvPath: unifyCsvPath, errors });
    log('info', 'unify:loaded', { records: unifyRecords.length });

    const knownMascots = new Set<string>();
    for (const r of roster.rows) {
      if (r.team) knownMascots.add(r.team);
    }
    const excludeBasenames = new Set<string>();
    excludeBasenames.add(basename(opts.rosterPath));
    excludeBasenames.add(basename(opts.staffDirectoryPath));
    const creditFiles = findVolunteerCreditFiles(opts.sourceDir, knownMascots, excludeBasenames);
    partialSummary.source_files.credit_xlsxs = creditFiles;
    if (creditFiles.length === 0 && !opts.allowEmptyCredits) {
      throw new FatalCreditExportError(
        `No Volunteer Credit Export files found in ${opts.sourceDir} ` +
          `(expected "*Active YJ*-YYYY-MM-DD-HH-MM-SS.xlsx" or legacy "{TeamMascot}-{ts}.xlsx"). ` +
          `Per sop_orchestrator.md, at least one credit export is required. ` +
          `Pass allowEmptyCredits=true to override for Unify-only dev runs.`,
      );
    }

    // Parse each credit file independently. Each parse call also captures
    // file-level metadata (teams_in_filter + date ranges). We then split the
    // records into current-season vs historical-baseline streams using
    // SEASON_YEAR.
    const seasonYear = resolveSeasonYear(opts.seasonYear);
    log('info', 'season_year:resolved', { seasonYear });
    const currentSeasonCredits: CreditRecord[] = [];
    const historicalCredits: CreditRecord[] = [];
    for (const path of creditFiles) {
      log('info', 'ingest:credit', { path });
      const { records, metadata } = parseVolunteerCredit({
        creditPath: path,
        roster,
        cashRoutingAllowlist: cashAllowlist,
        routingPatterns: opts.routingPatterns ?? DEFAULT_ROUTING_PATTERNS,
        errors,
      });
      const historical = isHistoricalFile({
        opportunitiesDateRangeEnd: metadata.opportunities_date_range?.end ?? null,
        seasonYear,
      });
      log('info', 'credit:file_classified', {
        path,
        classification: historical ? 'historical' : 'current',
        opportunities_date_range_end: metadata.opportunities_date_range?.end ?? null,
        teams_in_filter: metadata.teams_in_filter,
      });
      const target = historical ? historicalCredits : currentSeasonCredits;
      for (const r of records) target.push(r);
    }
    log('info', 'credit:loaded', {
      files: creditFiles.length,
      current_season_records: currentSeasonCredits.length,
      historical_records: historicalCredits.length,
    });

    // ─── Step 3b — Historical baseline ─────────────────────────────────
    // Populates RosterRow.last_year_fundraising_dollars + rank BEFORE
    // compute_metrics builds VolunteerOutput so the values flow into the
    // downstream sink. Historical credits do NOT enter computeMetrics.
    if (historicalCredits.length > 0) {
      log('info', 'historical_baseline:start', { records: historicalCredits.length });
      const result = computeHistoricalBaseline({
        creditRecords: historicalCredits,
        roster,
        errors,
      });
      log('info', 'historical_baseline:done', {
        volunteers_populated: result.appliedByFcid.size,
      });
    }
    const allCredits: CreditRecord[] = currentSeasonCredits;

    // ─── Step 4+5 — Multi-rep split + SPLIT exceptions ───────────────
    const allocations = applyExceptionsAndSplit({
      unifyRows: unifyRecords,
      roster,
      staff,
      exceptions: exceptionsResult.parsed,
      errors,
    });
    log('info', 'allocations:built', { count: allocations.length });

    // ─── Step 6 — Compute metrics ────────────────────────────────────
    const { volunteers, teams } = computeMetrics({
      unifyAllocations: allocations,
      creditRecords: allCredits,
      exceptions: exceptionsResult.parsed,
      roster,
      errors,
    });
    log('info', 'metrics:computed', {
      volunteers: volunteers.length,
      teams: teams.length,
    });

    // ─── Step 6b — Stream C v2 field population (opt-in) ─────────────
    // SOPs: sop_momentum.md → sop_current_sprint.md → sop_signals.md → sop_role.md
    if (opts.streamC) {
      const sc = opts.streamC;
      const scNow = sc.now ?? new Date();
      log('info', 'stream_c:start', {
        pushes: sc.pushes.length,
        admins: sc.adminVolunteerIds?.size ?? 0,
        now: scNow.toISOString(),
      });
      computeMomentum({
        volunteers,
        creditRecords: allCredits,
        pushes: sc.pushes,
        roster,
        now: scNow,
      });
      computeCurrentSprint({
        volunteers,
        creditRecords: allCredits,
        pushes: sc.pushes,
        roster,
        now: scNow,
        logger: log,
      });
      computeSignals({
        volunteers,
        now: scNow,
      });
      deriveRole({
        volunteers,
        roster,
        adminVolunteerIds: sc.adminVolunteerIds,
      });
      log('info', 'stream_c:done');
    }

    // ─── Step 7 — Write ──────────────────────────────────────────────
    const finished_at = new Date().toISOString();
    const errsCount = errors.errorCount();
    const warnsCount = errors.warningCount();
    const status: 'success' | 'partial' = errsCount > 0 || warnsCount > 0 ? 'partial' : 'success';
    const summary: IngestRunSummary = {
      ...partialSummary,
      finished_at,
      status,
      volunteers_upserted: volunteers.length,
      errors_count: errsCount,
      warnings_count: warnsCount,
    };

    await opts.sink.writeVolunteers(volunteers);
    await opts.sink.writeTeams(teams);
    await opts.sink.writeIngestErrors(errors.all());
    if (exceptionsResult.file_present) {
      await opts.sink.writeExceptionsMirror(
        exceptionsResult.parsed,
        exceptionsResult.source_file_hash,
      );
    }
    await opts.sink.writeIngestRun(summary);

    // ─── Step 8 — Operator-facing CSV ────────────────────────────────
    try {
      mkdirSync(tmpDir, { recursive: true });
      const today = finished_at.slice(0, 10);
      const csvPath = join(tmpDir, `missing_matches_${today}.csv`);
      const header = 'kind,severity,source_file,source_row_number,full_contact_id,sales_rep_id,detail\n';
      const lines = errors.all().map((e) => {
        const detail = JSON.stringify(e.detail).replace(/"/g, '""');
        return `${e.kind},${e.severity},${e.source_file ?? ''},${e.source_row_number ?? ''},${e.full_contact_id ?? ''},${e.sales_rep_id ?? ''},"${detail}"`;
      });
      writeFileSync(csvPath, header + lines.join('\n'));
      log('info', 'missing_matches:written', { path: csvPath, rows: lines.length });
    } catch (e) {
      log('warn', 'missing_matches:write_failed', { error: (e as Error).message });
    }

    log('info', 'orchestrate:done', { status, errors: errsCount, warnings: warnsCount });
    return { status, exitCode: status === 'success' ? 0 : 1, summary, fatalError: null };
  } catch (e) {
    fatal = e as Error;
    const finished_at = new Date().toISOString();
    const summary: IngestRunSummary = {
      ...partialSummary,
      finished_at,
      status: 'failed',
      errors_count: errors.errorCount(),
      warnings_count: errors.warningCount(),
      notes: fatal.message,
    };
    log('error', 'orchestrate:failed', { error: fatal.message });
    try {
      await opts.sink.writeIngestRun(summary);
    } catch {
      /* swallow secondary failure */
    }
    return { status: 'failed', exitCode: 2, summary, fatalError: fatal };
  }
}

// CLI entry point.
const isMain = (() => {
  try {
    const here = fileURLToPath(import.meta.url);
    const arg0 = process.argv[1] ? resolve(process.argv[1]) : '';
    return here === arg0;
  } catch {
    return false;
  }
})();

if (isMain) {
  const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SOURCE_DIR = process.env['INGEST_SOURCE_DIR'] ?? join(PROJECT_ROOT, 'Process Documentation');
  const ROSTER_PATH = process.env['ROSTER_PATH'] ?? join(SOURCE_DIR, '26-27 Full Roster.xlsx');
  const STAFF_DIR = process.env['STAFF_DIRECTORY_PATH'] ?? join(PROJECT_ROOT, 'Sales Staff Directory.xlsx');

  const sink = new InMemorySink();
  const result = await orchestrate({
    sourceDir: SOURCE_DIR,
    rosterPath: ROSTER_PATH,
    staffDirectoryPath: STAFF_DIR,
    sink,
  });
  console.log('\n=== Result ===');
  console.log(JSON.stringify(result.summary, null, 2));
  process.exit(result.exitCode);
}
