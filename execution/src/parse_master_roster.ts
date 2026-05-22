// Master Volunteer Roster parser.
// SOP: architecture/sop_master_roster_parse.md
// Preflight rules: architecture/sop_identity_and_join_model.md

import { read, utils } from 'xlsx';
import { readFileSync, existsSync } from 'node:fs';
import { parse as parseCsv } from 'csv-parse/sync';
import { IngestErrorCollector } from './ingest_errors.js';
import type { MemberType, Roster, RosterRow } from './types.js';

export type ParseRosterOptions = {
  rosterPath: string;
  pilotSalesCaptainsCsvPath?: string | null;
  errors: IngestErrorCollector;
};

export class FatalRosterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalRosterError';
  }
}

// Legacy-field → member_type map per sop_master_roster_parse.md
function deriveMemberType(
  representativeCategory: string | null,
  yjCategory: string | null,
): MemberType | null {
  const rc = (representativeCategory ?? '').trim();
  const yj = (yjCategory ?? '').trim();
  if (rc === 'Yellow Jacket' && yj === 'Committee Member') return 'Yellow Jacket';
  if (rc === 'Yellow Jacket' && yj === 'Future') return 'Future';
  if (rc === 'Life Directors & Members' && yj === 'Life Member') return 'Life Member';
  if (rc === 'Life Directors & Members' && yj === 'Life Director') return 'Life Director';
  if (rc === 'Board of Directors' && yj === 'Board') return 'Board';
  return null;
}

function emptyToNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function parseInt0(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function loadPilotSalesCaptains(
  path: string,
  errors: IngestErrorCollector,
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (!existsSync(path)) return map;
  const csv = readFileSync(path, 'utf8');
  const rows = parseCsv(csv, { columns: true, trim: true, skip_empty_lines: true });
  for (const r of rows as Array<Record<string, string>>) {
    const id = r['full_contact_id'];
    const flag = (r['is_sales_captain'] ?? '').toLowerCase();
    if (!id) continue;
    map.set(id, flag === 'true' || flag === 'yes' || flag === '1');
  }
  return map;
}

export function parseMasterRoster(opts: ParseRosterOptions): Roster {
  const { rosterPath, pilotSalesCaptainsCsvPath, errors } = opts;
  if (!existsSync(rosterPath)) {
    throw new FatalRosterError(`Master roster file not found: ${rosterPath}`);
  }
  const buf = readFileSync(rosterPath);
  const wb = read(buf, { cellDates: true, raw: false });

  const fullRosterSheet = wb.Sheets['Full Roster'];
  if (!fullRosterSheet) {
    throw new FatalRosterError(
      `Master roster missing required sheet "Full Roster". Sheets present: ${JSON.stringify(wb.SheetNames)}`,
    );
  }

  const fullRosterRows = utils.sheet_to_json<Record<string, unknown>>(fullRosterSheet, {
    defval: null,
  });

  // Optional side tables.
  const sfRoster = new Map<string, { team: string | null; first_year: number | null }>();
  const sfRosterSheet = wb.Sheets['SF Roster'];
  if (sfRosterSheet) {
    const rows = utils.sheet_to_json<Record<string, unknown>>(sfRosterSheet, { defval: null });
    for (const r of rows) {
      const fcid = emptyToNull(r['Full Contact ID']);
      if (!fcid) continue;
      sfRoster.set(fcid, {
        team: emptyToNull(r['Yellow Jacket Team']),
        first_year: parseInt0(r['First Year of Volunteering']),
      });
    }
  }

  const fundraisingByName = new Map<
    string,
    { dollars: number | null; rank: number | null; email: string | null; phone: string | null; job: string | null }
  >();
  const fundraisingSheet = wb.Sheets['Yellow Jacket Fundraising 25-26'];
  if (fundraisingSheet) {
    const rows = utils.sheet_to_json<Record<string, unknown>>(fundraisingSheet, { defval: null });
    for (const r of rows) {
      const name = emptyToNull(r['Full Name']);
      if (!name) continue;
      const dollarsRaw = r['25-26 Fundraising Dollars'];
      const rankRaw = r['25-26 Fundraising Rank'];
      const dollars =
        typeof dollarsRaw === 'number'
          ? dollarsRaw
          : Number.isFinite(Number(dollarsRaw))
            ? Number(dollarsRaw)
            : null;
      const rank = parseInt0(rankRaw);
      fundraisingByName.set(name.toLowerCase(), {
        dollars,
        rank,
        email: emptyToNull(r['Email']),
        phone: emptyToNull(r['Phone']),
        job: emptyToNull(r['Job']),
      });
    }
  }

  const salesCaptainsByContactId = pilotSalesCaptainsCsvPath
    ? loadPilotSalesCaptains(pilotSalesCaptainsCsvPath, errors)
    : new Map<string, boolean>();

  const out: RosterRow[] = [];
  const byFullContactId = new Map<string, RosterRow>();
  const bySalesRepId = new Map<number, RosterRow>();
  const seenFullNames = new Map<string, RosterRow>();

  fullRosterRows.forEach((raw, idx) => {
    const sheetRow = idx + 2; // header is row 1
    const full_contact_id = emptyToNull(raw['Full Contact ID']);
    const sales_rep_id = parseInt0(raw['Sale Rep ID']);
    const first_name = emptyToNull(raw['First Name']) ?? '';
    const last_name = emptyToNull(raw['Last Name']) ?? '';
    const full_name = emptyToNull(raw['Full Name']) ?? `${first_name} ${last_name}`.trim();
    const representativeCategory = emptyToNull(raw['Representative Category']);
    const yjCategory = emptyToNull(raw['YJ Category']);
    const active = raw['Active'] === true || raw['Active'] === 'true' || raw['Active'] === 'TRUE';

    // Per-row identity rule: at least one ID required.
    if (!full_contact_id && sales_rep_id == null) {
      errors.add({
        kind: 'roster_row_no_identity',
        source_file: rosterPath,
        source_row_number: sheetRow,
        detail: { full_name, representative_category: representativeCategory, yj_category: yjCategory },
      });
      return;
    }

    // Derive member_type.
    const member_type = deriveMemberType(representativeCategory, yjCategory);
    if (!member_type) {
      errors.add({
        kind: 'ambiguous_member_type',
        source_file: rosterPath,
        source_row_number: sheetRow,
        full_contact_id,
        sales_rep_id,
        detail: { full_name, representative_category: representativeCategory, yj_category: yjCategory },
      });
      return;
    }

    // Hard-fail on duplicate IDs.
    if (full_contact_id && byFullContactId.has(full_contact_id)) {
      throw new FatalRosterError(
        `Duplicate full_contact_id "${full_contact_id}" on sheet row ${sheetRow} — already seen on a prior row. Resolve in the source spreadsheet before re-running.`,
      );
    }
    if (sales_rep_id != null && bySalesRepId.has(sales_rep_id)) {
      throw new FatalRosterError(
        `Duplicate sales_rep_id ${sales_rep_id} on sheet row ${sheetRow}. Resolve in the source spreadsheet before re-running.`,
      );
    }

    // Side-table merges.
    const sf = full_contact_id ? sfRoster.get(full_contact_id) ?? null : null;
    const fundraising = fundraisingByName.get(full_name.toLowerCase()) ?? null;

    const team = sf?.team ?? emptyToNull(raw['Sales team']);
    const phone = emptyToNull(raw['Phone Number']) ?? fundraising?.phone ?? null;
    const email = emptyToNull(raw['Email']) ?? fundraising?.email ?? null;
    const job = emptyToNull(raw['Company - Job']) ?? fundraising?.job ?? null;

    const row: RosterRow = {
      full_contact_id,
      sales_rep_id,
      first_name,
      last_name,
      full_name,
      email,
      phone,
      team,
      is_sales_captain: full_contact_id ? salesCaptainsByContactId.get(full_contact_id) ?? false : false,
      member_type,
      active,
      first_year_of_volunteering: sf?.first_year ?? null,
      fiesta_ticket_link: null,
      rate_ticket_link: null,
      last_year_fundraising_dollars: fundraising?.dollars ?? null,
      last_year_fundraising_rank: fundraising?.rank ?? null,
      job,
    };

    // Warn-only checks.
    const nameKey = full_name.toLowerCase();
    if (seenFullNames.has(nameKey)) {
      errors.add({
        kind: 'duplicate_full_name',
        source_file: rosterPath,
        source_row_number: sheetRow,
        full_contact_id,
        sales_rep_id,
        detail: { full_name, also_seen_for_contact: seenFullNames.get(nameKey)?.full_contact_id ?? null },
      });
    } else {
      seenFullNames.set(nameKey, row);
    }

    if (active && (member_type === 'Yellow Jacket' || member_type === 'Future') && !phone) {
      errors.add({
        kind: 'missing_phone',
        source_file: rosterPath,
        source_row_number: sheetRow,
        full_contact_id,
        sales_rep_id,
        detail: { full_name, member_type },
      });
    }

    out.push(row);
    if (full_contact_id) byFullContactId.set(full_contact_id, row);
    if (sales_rep_id != null) bySalesRepId.set(sales_rep_id, row);
  });

  // Synthetic-ID collision preflight (Codex F3). Two roster rows can collide
  // on the derived volunteer.id when one row's full_contact_id is literally
  // "rep_<N>" and another row has sales_rep_id = N with no full_contact_id.
  // The reserved id "org_uncredited" is also off-limits.
  const seenSyntheticIds = new Map<string, string>(); // id → debug label of first row
  for (const r of out) {
    const id = r.full_contact_id ?? (r.sales_rep_id != null ? `rep_${r.sales_rep_id}` : null);
    if (id == null) continue; // row would have been dropped at preflight
    if (id === 'org_uncredited') {
      throw new FatalRosterError(
        `Roster row for "${r.full_name}" derives reserved synthetic id "org_uncredited". ` +
          `Rename the source row or supply a different full_contact_id before re-running.`,
      );
    }
    const prior = seenSyntheticIds.get(id);
    if (prior) {
      throw new FatalRosterError(
        `Synthetic volunteer id collision on "${id}": "${prior}" and "${r.full_name}" both ` +
          `derive the same id. One row's full_contact_id likely matches "rep_<N>" while another row's ` +
          `sales_rep_id is N. Resolve in the source spreadsheet before re-running.`,
      );
    }
    seenSyntheticIds.set(id, r.full_name);
  }

  return { rows: out, by_full_contact_id: byFullContactId, by_sales_rep_id: bySalesRepId };
}
