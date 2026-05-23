// Salesforce Volunteer Credit Export parser.
// SOP: architecture/sop_volunteer_credit_routing.md
//
// 2026-05-22 update: multi-team filter inside the file (rows 11 + 16),
// multi-dimensional opportunity-name routing (routing_metrics arrays),
// CreditFileMetadata exposing teams + date ranges.

import { read, utils } from 'xlsx';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { IngestErrorCollector } from './ingest_errors.js';
import type {
  CreditDollarsRecord,
  CreditFileMetadata,
  CreditPointsRecord,
  CreditRecord,
  MetricName,
  Roster,
} from './types.js';

// ─── Routing rule types (in-memory mirror of Supabase tables) ─────────────

/**
 * Exact opportunity-name → routing_metrics. `type` is informational only —
 * the engine prefers `routing_metrics` regardless of Type. Legacy rows with
 * type='Cash' + empty routing_metrics still flow via the legacy gate (see
 * resolveRouting below).
 */
export type CreditAllowlistEntry = {
  type: string; // 'Cash' | 'Sponsorship' | 'In-Kind' | '*' | other
  opportunity_name_pattern: string; // exact, case-insensitive
  routing: 'dollars' | 'ignore';
  routing_metrics: MetricName[];
};

export type CreditRoutingPattern = {
  pattern: string;        // substring, case-insensitive
  routing_metrics: MetricName[];
  sort_order: number;
};

// Back-compat alias used by orchestrator.ts.
export type CashRoutingRule = CreditAllowlistEntry;

export type ParseCreditOptions = {
  creditPath: string;
  roster: Roster;
  cashRoutingAllowlist: CreditAllowlistEntry[];
  routingPatterns?: CreditRoutingPattern[];
  errors: IngestErrorCollector;
};

export type ParseCreditResult = {
  records: CreditRecord[];
  metadata: CreditFileMetadata;
};

export class FatalCreditExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalCreditExportError';
  }
}

// ─── Filename → timestamp + version label ────────────────────────────────

function extractTimestampAndVersion(fileBasename: string): {
  timestamp: string;
  version_label: string | null;
} {
  const stripped = fileBasename.replace(/\.xlsx$/i, '');
  const tsMatch = /^(.+?)-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})$/.exec(stripped);
  if (!tsMatch) return { timestamp: '', version_label: null };
  const head = tsMatch[1]!;
  const verMatch = /\s-\s*([0-9]+\.[0-9]+)\s*$/.exec(head);
  return {
    timestamp: tsMatch[2]!,
    version_label: verMatch ? verMatch[1]! : null,
  };
}

// Best-effort team-mascot extraction for back-compat with single-team
// fixtures. Returns '' when filename has no recognizable team token
// (the multi-team production filename). Engine no longer uses this for
// team-scope checks — it's preserved only on CreditRecord.team_mascot_from_filename.
function extractLegacyTeamMascot(fileBasename: string): string {
  const stripped = fileBasename.replace(/\.xlsx$/i, '');
  const tsMatch = /^(.+?)-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})$/.exec(stripped);
  if (!tsMatch) return stripped;
  const teamPart = tsMatch[1]!;
  // Drop optional leading "YYYY-YY " report-cycle prefix.
  const teamMatch = /^(?:\d{4}-\d{2}\s+)?(.+)$/.exec(teamPart);
  const candidate = (teamMatch?.[1] ?? teamPart).trim();
  // Recognize the multi-team format ("Active YJ", optional "- N.M" version
  // suffix) and treat as no-team.
  if (/active yj(\s*-\s*\d+\.\d+)?$/i.test(candidate)) return '';
  return candidate;
}

// ─── Header locator ───────────────────────────────────────────────────────

type HeaderLayout = {
  headerRowIdx: number;
  left: {
    full_contact_id: number;
    contact_full_name: number;
    opportunity_name: number;
    amount_credited: number;
    type: number;
  };
  right: {
    full_contact_id: number;
    contact_full_name: number;
    job_name: number;
    points: number;
    campaign: number;
  };
};

function findHeader(grid: unknown[][]): HeaderLayout {
  for (let r = 0; r < Math.min(grid.length, 60); r++) {
    const row = grid[r];
    if (!row) continue;
    const cellsLower = row.map((c) => (c == null ? '' : String(c).trim().toLowerCase()));
    const leftOpp = cellsLower.indexOf('opportunity: opportunity name');
    const rightJob = cellsLower.indexOf('volunteer job: volunteer job name');
    if (leftOpp < 0 || rightJob < 0) continue;
    const allFcid: number[] = [];
    const allCfn: number[] = [];
    for (let c = 0; c < cellsLower.length; c++) {
      if (cellsLower[c] === 'full contact id') allFcid.push(c);
      if (cellsLower[c] === 'contact full name') allCfn.push(c);
    }
    const fcidLeft = allFcid.length >= 1 ? allFcid[0]! : -1;
    const fcidRight = allFcid.length >= 2 ? allFcid[1]! : -1;
    const cfnLeft = allCfn.length >= 1 ? allCfn[0]! : -1;
    const cfnRight = allCfn.length >= 2 ? allCfn[1]! : -1;
    const amount = cellsLower.indexOf('amount credited');
    const type = cellsLower.indexOf('type');
    const points = cellsLower.indexOf('volunteer points');
    const campaign = cellsLower.indexOf('volunteer job: campaign');
    if (cfnLeft < 0 || amount < 0 || type < 0) continue;
    if (cfnRight < 0 || points < 0 || campaign < 0) continue;
    return {
      headerRowIdx: r,
      left: { full_contact_id: fcidLeft, contact_full_name: cfnLeft, opportunity_name: leftOpp, amount_credited: amount, type },
      right: { full_contact_id: fcidRight, contact_full_name: cfnRight, job_name: rightJob, points, campaign },
    };
  }
  throw new FatalCreditExportError(
    'Could not locate header row containing both "Opportunity: Opportunity Name" and "Volunteer Job: Volunteer Job Name".',
  );
}

// ─── Filter-row extraction (multi-team + date ranges) ─────────────────────

const TEAM_FILTER_RE = /Yellow Jacket Team\s+equals\s+(.+)$/i;
// Captures "Custom (MM/DD/YYYY to MM/DD/YYYY)".
const DATE_RANGE_RE = /Custom\s*\(\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*\)/i;

function parseTeamFilter(cellText: string): string[] | null {
  const m = TEAM_FILTER_RE.exec(cellText);
  if (!m) return null;
  return m[1]!
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseDateRangeCell(cellText: string): { start: string; end: string } | null {
  const m = DATE_RANGE_RE.exec(cellText);
  if (!m) return null;
  return { start: toIsoDate(m[1]!), end: toIsoDate(m[2]!) };
}

function toIsoDate(mdY: string): string {
  // "12/9/2024" → "2024-12-09"
  const [m, d, y] = mdY.split('/').map((s) => s.trim());
  const mm = String(parseInt(m!, 10)).padStart(2, '0');
  const dd = String(parseInt(d!, 10)).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

type FilterScan = {
  team_filters_found: string[][];   // each filter row's parsed list (0–2 entries)
  date_ranges_found: Array<{ start: string; end: string }>;
};

/**
 * Scan rows ABOVE the header for team-filter and date-range descriptors.
 * Returns whatever we found (0, 1, or 2 of each). Caller resolves into
 * CreditFileMetadata + emits warnings for missing/disagreeing filters.
 */
function scanFilterRows(grid: unknown[][], headerRowIdx: number): FilterScan {
  const out: FilterScan = { team_filters_found: [], date_ranges_found: [] };
  for (let r = 0; r < headerRowIdx; r++) {
    const row = grid[r];
    if (!row) continue;
    for (const cell of row) {
      if (cell == null) continue;
      const s = String(cell).trim();
      if (!s) continue;
      const teams = parseTeamFilter(s);
      if (teams) out.team_filters_found.push(teams);
      const dr = parseDateRangeCell(s);
      if (dr) out.date_ranges_found.push(dr);
    }
  }
  return out;
}

function unionLists(lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const lst of lists) {
    for (const item of lst) {
      const key = item.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function listsAgree(lists: string[][]): boolean {
  if (lists.length < 2) return true;
  const first = new Set(lists[0]!.map((s) => s.toLowerCase()));
  for (let i = 1; i < lists.length; i++) {
    const second = new Set(lists[i]!.map((s) => s.toLowerCase()));
    if (first.size !== second.size) return false;
    for (const v of first) if (!second.has(v)) return false;
  }
  return true;
}

// ─── Footer detection / cell helpers ──────────────────────────────────────

function isTotalOrFooterRow(row: unknown[]): boolean {
  for (const cell of row) {
    if (cell == null || cell === '') continue;
    const s = String(cell).trim();
    if (/^total$/i.test(s) || /^confidential/i.test(s) || /^copyright/i.test(s)) return true;
    return false;
  }
  return false;
}

function cellStr(row: unknown[], col: number): string {
  if (col < 0 || col >= row.length) return '';
  const v = row[col];
  return v == null ? '' : String(v).trim();
}

function cellNum(row: unknown[], col: number): number | null {
  if (col < 0 || col >= row.length) return null;
  const v = row[col];
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[,$\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// ─── Routing precedence resolver ──────────────────────────────────────────

const VALID_METRICS: ReadonlySet<MetricName> = new Set<MetricName>([
  'total_fundraising',
  'rate_bowl',
  'wishes_for_teachers',
  'total_points',
]);

function sanitizeRoutingMetrics(arr: unknown): MetricName[] {
  if (!Array.isArray(arr)) return [];
  const out: MetricName[] = [];
  for (const v of arr) {
    if (typeof v === 'string' && VALID_METRICS.has(v as MetricName)) {
      out.push(v as MetricName);
    }
  }
  return out;
}

type RoutingResolution =
  | { ok: true; routing_metrics: MetricName[]; source: 'exact' | 'pattern' | 'type_default' }
  | { ok: false; reason: 'unallowlisted_opportunity_name' | 'unknown_credit_type' }
  | { ok: 'ignore'; source: 'exact_ignore' };

/**
 * Implements sop_volunteer_credit_routing.md § Routing precedence.
 * 1. Exact seed match (regardless of Type). Explicit ignore seeds short-circuit
 *    here so they cannot be overridden by a pattern or Type fallback (Codex DIM-3).
 * 2. Pattern match (regardless of Type).
 * 3. Type-based default: Sponsorship / In-Kind → dollars; Cash → error; other → error.
 */
function resolveRouting(args: {
  opportunityName: string;
  type: string;
  allowlistByName: Map<string, MetricName[]>;
  ignoredByName: Set<string>;
  patterns: CreditRoutingPattern[];
}): RoutingResolution {
  const nameLower = args.opportunityName.toLowerCase();

  // (1a) Exact ignore — short-circuit. Drop row silently; no warning, no
  // fallback. Operator opted to exclude this opportunity by name.
  if (args.ignoredByName.has(nameLower)) {
    return { ok: 'ignore', source: 'exact_ignore' };
  }

  // (1b) Exact route.
  const exact = args.allowlistByName.get(nameLower);
  if (exact && exact.length > 0) {
    return { ok: true, routing_metrics: exact, source: 'exact' };
  }

  // (2) Pattern (sort_order ascending — caller pre-sorts).
  for (const p of args.patterns) {
    if (nameLower.includes(p.pattern.toLowerCase())) {
      return { ok: true, routing_metrics: p.routing_metrics, source: 'pattern' };
    }
  }

  // (3) Type-based default.
  const t = args.type.toLowerCase();
  if (t === 'sponsorship' || t === 'in-kind' || t === 'in kind') {
    return {
      ok: true,
      routing_metrics: ['total_fundraising', 'total_points'],
      source: 'type_default',
    };
  }
  if (t === 'cash') {
    return { ok: false, reason: 'unallowlisted_opportunity_name' };
  }
  return { ok: false, reason: 'unknown_credit_type' };
}

// ─── Main parse entry point ───────────────────────────────────────────────

export function parseVolunteerCredit(opts: ParseCreditOptions): ParseCreditResult {
  const { creditPath, roster, cashRoutingAllowlist, errors } = opts;
  const routingPatterns = (opts.routingPatterns ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

  if (!existsSync(creditPath)) {
    throw new FatalCreditExportError(`Credit export not found: ${creditPath}`);
  }
  const buf = readFileSync(creditPath);
  const source_file_fingerprint = createHash('sha256').update(buf).digest('hex').slice(0, 16);
  const wb = read(buf, { cellDates: true, raw: false });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new FatalCreditExportError(`Credit export has no sheets: ${creditPath}`);
  }
  const sheet = wb.Sheets[firstSheetName];
  if (!sheet) {
    throw new FatalCreditExportError(`Credit export first sheet unreadable: ${firstSheetName}`);
  }
  const grid = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: true });
  const layout = findHeader(grid);
  if (layout.left.full_contact_id < 0 || layout.right.full_contact_id < 0) {
    throw new FatalCreditExportError(
      `Credit export "${basename(creditPath)}" is missing "Full Contact ID" column in ` +
        `${layout.left.full_contact_id < 0 ? 'left (Opportunities)' : 'right (Volunteer Points)'} block. ` +
        `Engine refuses to run against pre-production files.`,
    );
  }

  const fileBasename = basename(creditPath);
  const { timestamp, version_label } = extractTimestampAndVersion(fileBasename);
  const legacyTeamMascot = extractLegacyTeamMascot(fileBasename);

  // Filter scan.
  const scan = scanFilterRows(grid, layout.headerRowIdx);
  let teams_in_filter: string[] = [];
  let opportunities_date_range: { start: string; end: string } | null = null;
  let points_date_range: { start: string; end: string } | null = null;

  // Team-filter rows: production layout has exactly 2 (rows 11 + 16). Warn if
  // the count differs from 2 (Codex DIM-4). Engine continues with whatever's
  // found, taking the union when they disagree.
  if (scan.team_filters_found.length === 0) {
    errors.add({
      kind: 'credit_filter_unreadable',
      source_file: fileBasename,
      detail: { missing: 'team_filter_rows', headerRow1Based: layout.headerRowIdx + 1 },
    });
  } else {
    teams_in_filter = unionLists(scan.team_filters_found);
    if (scan.team_filters_found.length !== 2) {
      errors.add({
        kind: 'credit_filter_unreadable',
        source_file: fileBasename,
        detail: {
          missing: 'partial_team_filter_rows',
          expected_count: 2,
          actual_count: scan.team_filters_found.length,
          team_filters_found: scan.team_filters_found,
        },
      });
    }
    if (!listsAgree(scan.team_filters_found)) {
      errors.add({
        kind: 'credit_filter_team_disagreement',
        source_file: fileBasename,
        detail: { team_filters_found: scan.team_filters_found, union: teams_in_filter },
      });
    }
  }

  // Date-range rows: production layout has exactly 2 (rows 9 + 14). Warn if
  // count differs from 2 (Codex DIM-4). Map by position: first → opportunities,
  // second → points.
  if (scan.date_ranges_found[0]) opportunities_date_range = scan.date_ranges_found[0];
  if (scan.date_ranges_found[1]) points_date_range = scan.date_ranges_found[1];
  if (scan.date_ranges_found.length !== 2) {
    errors.add({
      kind: 'credit_filter_unreadable',
      source_file: fileBasename,
      detail: {
        missing: scan.date_ranges_found.length === 0 ? 'date_range_rows' : 'partial_date_range_rows',
        expected_count: 2,
        actual_count: scan.date_ranges_found.length,
      },
    });
  }

  const file_metadata: CreditFileMetadata = {
    source_file: fileBasename,
    source_file_fingerprint,
    source_file_timestamp: timestamp,
    version_label,
    teams_in_filter,
    opportunities_date_range,
    points_date_range,
  };

  // Build exact-name allowlist lookups: one for routed entries, one for
  // explicit ignore entries (Codex DIM-3 — ignore must short-circuit, not
  // fall through to pattern/Type fallback).
  const allowlistByName = new Map<string, MetricName[]>();
  const ignoredByName = new Set<string>();
  for (const r of cashRoutingAllowlist) {
    const nameLower = r.opportunity_name_pattern.toLowerCase();
    const metrics = sanitizeRoutingMetrics(r.routing_metrics);
    if (metrics.length > 0) {
      allowlistByName.set(nameLower, metrics);
    } else if (r.routing === 'dollars') {
      allowlistByName.set(nameLower, ['total_fundraising', 'total_points']);
    } else if (r.routing === 'ignore') {
      ignoredByName.add(nameLower);
    }
  }

  const out: CreditRecord[] = [];

  for (let r = layout.headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    if (isTotalOrFooterRow(row)) break;
    const sheetRow = r + 1;

    // ─── LEFT BLOCK ────────────────────────────────────────────────────
    const leftFcid = cellStr(row, layout.left.full_contact_id);
    const leftName = cellStr(row, layout.left.contact_full_name);
    const oppName = cellStr(row, layout.left.opportunity_name);
    const amountDollars = cellNum(row, layout.left.amount_credited);
    const oppType = cellStr(row, layout.left.type);
    const leftHasData = oppName !== '' || amountDollars != null || oppType !== '';
    if (leftHasData) {
      const leftHash = createHash('sha256')
        .update([leftFcid, oppName, amountDollars ?? '', oppType].join('|'))
        .digest('hex')
        .slice(0, 16);

      if (leftFcid === '') {
        errors.add({
          kind: 'missing_full_contact_id_on_credit_row',
          source_file: fileBasename,
          source_row_number: sheetRow,
          source_row_hash: leftHash,
          detail: { block: 'opportunities', contact_full_name: leftName, opportunity_name: oppName },
        });
      } else if (!roster.by_full_contact_id.has(leftFcid)) {
        errors.add({
          kind: 'unknown_full_contact_id',
          source_file: fileBasename,
          source_row_number: sheetRow,
          source_row_hash: leftHash,
          full_contact_id: leftFcid,
          detail: { block: 'opportunities', contact_full_name: leftName, opportunity_name: oppName },
        });
      } else if (amountDollars == null || amountDollars <= 0) {
        errors.add({
          kind: 'non_positive_amount_credited',
          source_file: fileBasename,
          source_row_number: sheetRow,
          source_row_hash: leftHash,
          full_contact_id: leftFcid,
          detail: { amount_credited: amountDollars, opportunity_name: oppName },
        });
      } else {
        const resolution = resolveRouting({
          opportunityName: oppName,
          type: oppType,
          allowlistByName,
          ignoredByName,
          patterns: routingPatterns,
        });
        if (resolution.ok === false) {
          errors.add({
            kind: resolution.reason,
            source_file: fileBasename,
            source_row_number: sheetRow,
            source_row_hash: leftHash,
            full_contact_id: leftFcid,
            detail: { type: oppType, opportunity_name: oppName },
          });
        } else if (resolution.ok === 'ignore') {
          // Explicit ignore-seed match: drop silently.
        } else {
          maybeEmitTeamMismatch({
            errors,
            fileBasename,
            sheetRow,
            rowHash: leftHash,
            fcid: leftFcid,
            rosterTeam: roster.by_full_contact_id.get(leftFcid)!.team,
            teams_in_filter,
            legacyMascot: legacyTeamMascot,
            block: 'opportunities',
            context: { opportunity_name: oppName, type: oppType },
          });
          const record: CreditDollarsRecord = {
            source_file: fileBasename,
            source_block: 'opportunities',
            source_row_number: sheetRow,
            source_row_hash: leftHash,
            source_file_fingerprint,
            source_file_timestamp: timestamp,
            team_mascot_from_filename: legacyTeamMascot,
            file_metadata,
            full_contact_id: leftFcid,
            contact_full_name_raw: leftName,
            opportunity_name: oppName,
            amount_dollars: amountDollars,
            type: oppType as CreditDollarsRecord['type'],
            routing_metrics: resolution.routing_metrics,
          };
          out.push(record);
        }
      }
    }

    // ─── RIGHT BLOCK ───────────────────────────────────────────────────
    const rightFcid = cellStr(row, layout.right.full_contact_id);
    const rightName = cellStr(row, layout.right.contact_full_name);
    const jobName = cellStr(row, layout.right.job_name);
    const pointsRaw = cellNum(row, layout.right.points);
    const campaign = cellStr(row, layout.right.campaign);
    const rightHasData = jobName !== '' || pointsRaw != null || campaign !== '';
    if (rightHasData) {
      const rightHash = createHash('sha256')
        .update([rightFcid, jobName, pointsRaw ?? '', campaign].join('|'))
        .digest('hex')
        .slice(0, 16);
      if (rightFcid === '') {
        errors.add({
          kind: 'missing_full_contact_id_on_credit_row',
          source_file: fileBasename,
          source_row_number: sheetRow,
          source_row_hash: rightHash,
          detail: { block: 'volunteer_points', contact_full_name: rightName, job_name: jobName },
        });
      } else if (!roster.by_full_contact_id.has(rightFcid)) {
        errors.add({
          kind: 'unknown_full_contact_id',
          source_file: fileBasename,
          source_row_number: sheetRow,
          source_row_hash: rightHash,
          full_contact_id: rightFcid,
          detail: { block: 'volunteer_points', contact_full_name: rightName, job_name: jobName },
        });
      } else if (pointsRaw == null || !Number.isInteger(pointsRaw) || pointsRaw < 0) {
        errors.add({
          kind: 'invalid_volunteer_points',
          source_file: fileBasename,
          source_row_number: sheetRow,
          source_row_hash: rightHash,
          full_contact_id: rightFcid,
          detail: { volunteer_points: pointsRaw, job_name: jobName },
        });
      } else if (!campaign.toLowerCase().includes('committee participation points')) {
        errors.add({
          kind: 'unexpected_points_campaign',
          source_file: fileBasename,
          source_row_number: sheetRow,
          source_row_hash: rightHash,
          full_contact_id: rightFcid,
          detail: { campaign, job_name: jobName },
        });
      } else {
        maybeEmitTeamMismatch({
          errors,
          fileBasename,
          sheetRow,
          rowHash: rightHash,
          fcid: rightFcid,
          rosterTeam: roster.by_full_contact_id.get(rightFcid)!.team,
          teams_in_filter,
          legacyMascot: legacyTeamMascot,
          block: 'volunteer_points',
          context: { job_name: jobName, campaign },
        });
        const record: CreditPointsRecord = {
          source_file: fileBasename,
          source_block: 'volunteer_points',
          source_row_number: sheetRow,
          source_row_hash: rightHash,
          source_file_fingerprint,
          source_file_timestamp: timestamp,
          team_mascot_from_filename: legacyTeamMascot,
          file_metadata,
          full_contact_id: rightFcid,
          contact_full_name_raw: rightName,
          volunteer_job_name: jobName,
          amount_points: pointsRaw,
          campaign,
        };
        out.push(record);
      }
    }
  }

  return { records: out, metadata: file_metadata };
}

// ─── Per-row team-mismatch check ──────────────────────────────────────────

function maybeEmitTeamMismatch(args: {
  errors: IngestErrorCollector;
  fileBasename: string;
  sheetRow: number;
  rowHash: string;
  fcid: string;
  rosterTeam: string | null;
  teams_in_filter: string[];
  legacyMascot: string; // for back-compat with single-team fixtures
  block: 'opportunities' | 'volunteer_points';
  context: Record<string, unknown>;
}): void {
  // sop_volunteer_credit_routing.md § File-team vs roster-team mismatch.
  if (args.rosterTeam == null) return;
  const rosterTeamLower = args.rosterTeam.toLowerCase();

  // Multi-team mode: roster team must be in teams_in_filter.
  if (args.teams_in_filter.length > 0) {
    const filterLower = args.teams_in_filter.map((t) => t.toLowerCase());
    if (filterLower.includes(rosterTeamLower)) return;
    args.errors.add({
      kind: 'file_team_mismatch',
      source_file: args.fileBasename,
      source_row_number: args.sheetRow,
      source_row_hash: args.rowHash,
      full_contact_id: args.fcid,
      detail: {
        block: args.block,
        teams_in_filter: args.teams_in_filter,
        roster_team: args.rosterTeam,
        ...args.context,
      },
    });
    return;
  }

  // Legacy single-team mode: filename mascot must match roster team.
  if (args.legacyMascot === '') return; // unknown filename pattern → silent OK
  if (args.legacyMascot.toLowerCase() === rosterTeamLower) return;
  args.errors.add({
    kind: 'file_team_mismatch',
    source_file: args.fileBasename,
    source_row_number: args.sheetRow,
    source_row_hash: args.rowHash,
    full_contact_id: args.fcid,
    detail: {
      block: args.block,
      filename_team_mascot: args.legacyMascot,
      roster_team: args.rosterTeam,
      ...args.context,
    },
  });
}
