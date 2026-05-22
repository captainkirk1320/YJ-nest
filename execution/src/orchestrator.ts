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

import { existsSync, readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IngestErrorCollector } from './ingest_errors.js';
import { parseMasterRoster, FatalRosterError } from './parse_master_roster.js';
import { parseStaffDirectory, FatalStaffDirectoryError } from './parse_staff_directory.js';
import { parseExceptions } from './parse_exceptions.js';
import { parseUnifyCsv, FatalUnifyCsvError } from './parse_unify_csv.js';
import { parseVolunteerCredit, FatalCreditExportError, type CashRoutingRule } from './parse_volunteer_credit.js';
import { applyExceptionsAndSplit } from './apply_exceptions.js';
import { computeMetrics } from './compute_metrics.js';
import { InMemorySink } from './write_supabase.js';
import type { CreditRecord, IngestSink, IngestRunSummary } from './types.js';

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
  sink: IngestSink;
  triggeredBy?: 'cli' | 'cron' | 'manual';
  tmpDir?: string;                             // defaults to {cwd}/.tmp
  logger?: (level: 'info' | 'warn' | 'error', msg: string, extra?: unknown) => void;
};

export type OrchestrateResult = {
  status: 'success' | 'partial' | 'failed';
  exitCode: 0 | 1 | 2;
  summary: IngestRunSummary;
  fatalError: Error | null;
};

const DEFAULT_CASH_ALLOWLIST: CashRoutingRule[] = [
  { type: 'Cash', opportunity_name_pattern: 'AI Help', routing: 'dollars' },
];

function findLatestUnifyCsv(dir: string): string | null {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((n) => /^Report Data - .+\.csv$/i.test(n))
    .map((n) => ({ name: n, path: join(dir, n) }));
  if (files.length === 0) return null;
  files.sort((a, b) => b.name.localeCompare(a.name));
  return files[0]!.path;
}

function findVolunteerCreditFiles(dir: string, knownTeamMascots: Set<string>): string[] {
  if (!existsSync(dir)) return [];
  const ts = /-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})\.xlsx$/i;
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const m = ts.exec(name);
    if (!m) continue;
    const beforeTs = name.slice(0, name.length - m[0].length);
    // Strip optional leading "YYYY-YY " report-cycle prefix.
    const candidate = beforeTs.replace(/^\d{4}-\d{2}\s+/, '').trim();
    // Filename must end in a known team mascot. Compare case-insensitively.
    const candidateLower = candidate.toLowerCase();
    let matched = false;
    for (const mascot of knownTeamMascots) {
      if (candidateLower === mascot.toLowerCase()) {
        matched = true;
        break;
      }
    }
    if (matched) out.push(join(dir, name));
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
    const creditFiles = findVolunteerCreditFiles(opts.sourceDir, knownMascots);
    partialSummary.source_files.credit_xlsxs = creditFiles;
    if (creditFiles.length === 0 && !opts.allowEmptyCredits) {
      throw new FatalCreditExportError(
        `No Volunteer Credit Export files found in ${opts.sourceDir} ` +
          `(filename pattern: {TeamMascot}-{YYYY-MM-DD-HH-MM-SS}.xlsx, mascot must match the roster). ` +
          `Per sop_orchestrator.md, at least one credit export is required. ` +
          `Pass allowEmptyCredits=true to override for Unify-only dev runs.`,
      );
    }
    const allCredits: CreditRecord[] = [];
    for (const path of creditFiles) {
      log('info', 'ingest:credit', { path });
      const records = parseVolunteerCredit({
        creditPath: path,
        roster,
        cashRoutingAllowlist: cashAllowlist,
        errors,
      });
      for (const r of records) allCredits.push(r);
    }
    log('info', 'credit:loaded', { files: creditFiles.length, records: allCredits.length });

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
