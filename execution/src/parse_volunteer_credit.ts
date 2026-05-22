// Salesforce Volunteer Credit Export parser.
// SOP: architecture/sop_volunteer_credit_routing.md
// Reads the two-block Gorlocks-shape xlsx (one file per team).

import { read, utils } from 'xlsx';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { IngestErrorCollector } from './ingest_errors.js';
import type {
  CreditDollarsRecord,
  CreditPointsRecord,
  CreditRecord,
  Roster,
} from './types.js';

export type CashRoutingRule = {
  type: string; // 'Cash' (the gated case)
  opportunity_name_pattern: string;
  routing: 'dollars' | 'ignore';
};

export type ParseCreditOptions = {
  creditPath: string;
  roster: Roster;
  cashRoutingAllowlist: CashRoutingRule[];
  errors: IngestErrorCollector;
};

export class FatalCreditExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalCreditExportError';
  }
}

// Filename pattern: "{TeamMascot}-{timestamp}.xlsx" or "{prefix} {TeamMascot}-{timestamp}.xlsx"
// We extract the team mascot as everything between the last "-{timestamp}" and the basename start.
// The timestamp is the trailing "-YYYY-MM-DD-HH-MM-SS" segment.
function extractTeamAndTimestamp(fileBasename: string): {
  team_mascot: string;
  timestamp: string;
} {
  const stripped = fileBasename.replace(/\.xlsx$/i, '');
  // Match trailing "-YYYY-MM-DD-HH-MM-SS"
  const tsMatch = /^(.+?)-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})$/.exec(stripped);
  if (!tsMatch) {
    return { team_mascot: stripped, timestamp: '' };
  }
  // Team mascot may have a leading "YYYY-" report-cycle prefix (e.g. "2026-27 Gorlocks")
  const teamPart = tsMatch[1]!;
  const teamMatch = /^(?:\d{4}-\d{2}\s+)?(.+)$/.exec(teamPart);
  return {
    team_mascot: (teamMatch?.[1] ?? teamPart).trim(),
    timestamp: tsMatch[2]!,
  };
}

// Locate header row by scanning for both block-label cells.
// Returns the 0-indexed row in the grid plus per-block column maps.
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

    // Locate the two block-anchor labels (each appears exactly once).
    const leftOpp = cellsLower.indexOf('opportunity: opportunity name');
    const rightJob = cellsLower.indexOf('volunteer job: volunteer job name');
    if (leftOpp < 0 || rightJob < 0) continue;

    // Columns that exist in both blocks: capture all occurrences and split by
    // proximity to the block anchor. First occurrence → left, second → right.
    const allFcid: number[] = [];
    const allCfn: number[] = [];
    for (let c = 0; c < cellsLower.length; c++) {
      if (cellsLower[c] === 'full contact id') allFcid.push(c);
      if (cellsLower[c] === 'contact full name') allCfn.push(c);
    }
    // First occurrence → left block, second → right block.
    const fcidLeft = allFcid.length >= 1 ? allFcid[0]! : -1;
    const fcidRight = allFcid.length >= 2 ? allFcid[1]! : -1;
    const cfnLeft = allCfn.length >= 1 ? allCfn[0]! : -1;
    const cfnRight = allCfn.length >= 2 ? allCfn[1]! : -1;

    // Block-unique labels.
    const amount = cellsLower.indexOf('amount credited');
    const type = cellsLower.indexOf('type');
    const points = cellsLower.indexOf('volunteer points');
    const campaign = cellsLower.indexOf('volunteer job: campaign');

    // Required: each block must have its unique labels present.
    if (cfnLeft < 0 || amount < 0 || type < 0) continue;
    if (cfnRight < 0 || points < 0 || campaign < 0) continue;

    return {
      headerRowIdx: r,
      left: {
        full_contact_id: fcidLeft,
        contact_full_name: cfnLeft,
        opportunity_name: leftOpp,
        amount_credited: amount,
        type,
      },
      right: {
        full_contact_id: fcidRight,
        contact_full_name: cfnRight,
        job_name: rightJob,
        points,
        campaign,
      },
    };
  }
  throw new FatalCreditExportError(
    'Could not locate header row containing both "Opportunity: Opportunity Name" and "Volunteer Job: Volunteer Job Name".',
  );
}

function isTotalOrFooterRow(row: unknown[], leftFcid: number, rightFcid: number): boolean {
  // Heuristic: any row where the first non-null cell is "Total" or "Confidential"
  // or where Full Contact ID columns are both empty AND non-id cells contain
  // those terminator strings.
  for (const cell of row) {
    if (cell == null || cell === '') continue;
    const s = String(cell).trim();
    if (/^total$/i.test(s) || /^confidential/i.test(s) || /^copyright/i.test(s)) return true;
    return false; // first non-null cell isn't a terminator
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

export function parseVolunteerCredit(opts: ParseCreditOptions): CreditRecord[] {
  const { creditPath, roster, cashRoutingAllowlist, errors } = opts;
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

  const grid = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: true,
  });

  const layout = findHeader(grid);

  // Hard-fail if either block lacks Full Contact ID (production precondition).
  if (layout.left.full_contact_id < 0 || layout.right.full_contact_id < 0) {
    throw new FatalCreditExportError(
      `Credit export "${basename(creditPath)}" is missing "Full Contact ID" column in ` +
        `${layout.left.full_contact_id < 0 ? 'left (Opportunities)' : 'right (Volunteer Points)'} block. ` +
        `Engine refuses to run against pre-production files.`,
    );
  }

  const fileBasename = basename(creditPath);
  const { team_mascot, timestamp } = extractTeamAndTimestamp(fileBasename);
  const out: CreditRecord[] = [];

  // Build cash allowlist lookup.
  const cashAllowlist = new Map<string, 'dollars' | 'ignore'>();
  for (const r of cashRoutingAllowlist) {
    if (r.type.toLowerCase() === 'cash') cashAllowlist.set(r.opportunity_name_pattern.toLowerCase(), r.routing);
  }

  for (let r = layout.headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row) continue;
    if (isTotalOrFooterRow(row, layout.left.full_contact_id, layout.right.full_contact_id)) break;

    const sheetRow = r + 1; // 1-indexed for human display

    // ─── LEFT BLOCK (Opportunities → dollars) ──────────────────────────
    const leftFcid = cellStr(row, layout.left.full_contact_id);
    const leftName = cellStr(row, layout.left.contact_full_name);
    const oppName = cellStr(row, layout.left.opportunity_name);
    const amountDollars = cellNum(row, layout.left.amount_credited);
    const oppType = cellStr(row, layout.left.type);

    // A row is "present in left block" if it has *any* left-block content beyond name.
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
        const typeLower = oppType.toLowerCase();
        let route: 'dollars' | 'ignore' | null = null;
        if (typeLower === 'sponsorship' || typeLower === 'in-kind') {
          route = 'dollars';
        } else if (typeLower === 'cash') {
          const allow = cashAllowlist.get(oppName.toLowerCase());
          if (allow == null) {
            errors.add({
              kind: 'unallowlisted_opportunity_name',
              source_file: fileBasename,
              source_row_number: sheetRow,
              source_row_hash: leftHash,
              full_contact_id: leftFcid,
              detail: { type: oppType, opportunity_name: oppName },
            });
          } else {
            route = allow;
          }
        } else {
          errors.add({
            kind: 'unknown_credit_type',
            source_file: fileBasename,
            source_row_number: sheetRow,
            source_row_hash: leftHash,
            full_contact_id: leftFcid,
            detail: { type: oppType, opportunity_name: oppName },
          });
        }

        if (route === 'dollars') {
          const record: CreditDollarsRecord = {
            source_file: fileBasename,
            source_block: 'opportunities',
            source_row_number: sheetRow,
            source_row_hash: leftHash,
            source_file_fingerprint,
            source_file_timestamp: timestamp,
            team_mascot_from_filename: team_mascot,
            full_contact_id: leftFcid,
            contact_full_name_raw: leftName,
            opportunity_name: oppName,
            amount_dollars: amountDollars,
            type: oppType as CreditDollarsRecord['type'],
          };
          out.push(record);
        }
      }
    }

    // ─── RIGHT BLOCK (Volunteer Points → points) ───────────────────────
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
        const record: CreditPointsRecord = {
          source_file: fileBasename,
          source_block: 'volunteer_points',
          source_row_number: sheetRow,
          source_row_hash: rightHash,
          source_file_fingerprint,
          source_file_timestamp: timestamp,
          team_mascot_from_filename: team_mascot,
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

  return out;
}
