// Foundation Sales Staff Directory parser.
// SOP: architecture/sop_staff_directory_parse.md
// Resolves: Decision 2026-05-21 (staff allowlist resolution).

import { read, utils } from 'xlsx';
import { readFileSync, existsSync } from 'node:fs';
import { IngestErrorCollector } from './ingest_errors.js';
import type { Roster, StaffAllowlist, StaffEntry } from './types.js';

export type ParseStaffOptions = {
  staffDirectoryPath: string;
  roster: Roster;
  errors: IngestErrorCollector;
};

export class FatalStaffDirectoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FatalStaffDirectoryError';
  }
}

function emptyToNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function parseStaffDirectory(opts: ParseStaffOptions): StaffAllowlist {
  const { staffDirectoryPath, roster, errors } = opts;

  if (!existsSync(staffDirectoryPath)) {
    errors.add({
      kind: 'staff_directory_absent',
      source_file: staffDirectoryPath,
      detail: { reason: 'File not present; running with empty staff allowlist.' },
    });
    return { entries: [], by_sales_rep_id: new Map() };
  }

  const buf = readFileSync(staffDirectoryPath);
  const wb = read(buf, { cellDates: true, raw: false });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new FatalStaffDirectoryError(`Staff directory file has no sheets: ${staffDirectoryPath}`);
  }
  const sheet = wb.Sheets[firstSheetName];
  if (!sheet) {
    throw new FatalStaffDirectoryError(`Staff directory first sheet unreadable: ${firstSheetName}`);
  }

  // Validate headers via the raw cell grid — works even when zero data rows
  // are present (the prior implementation skipped header validation entirely
  // for empty sheets, silently accepting malformed files).
  const headerGrid = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: false });
  const headerRow = headerGrid[0];
  if (!headerRow) {
    throw new FatalStaffDirectoryError(
      `Staff directory sheet "${firstSheetName}" has no header row.`,
    );
  }
  const headers = new Set(
    headerRow.map((c) => (c == null ? '' : String(c).trim())).filter((s) => s !== ''),
  );
  for (const required of ['Sales Rep ID', 'Category', 'Name']) {
    if (!headers.has(required)) {
      throw new FatalStaffDirectoryError(
        `Staff directory sheet "${firstSheetName}" missing required column "${required}". Headers: ${JSON.stringify(Array.from(headers))}`,
      );
    }
  }

  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const entries: StaffEntry[] = [];
  const bySalesRepId = new Map<number, StaffEntry>();

  rows.forEach((raw, idx) => {
    const sheetRow = idx + 2;
    const repRaw = raw['Sales Rep ID'];
    const sales_rep_id =
      typeof repRaw === 'number' ? repRaw : Number.parseInt(String(repRaw ?? '').trim(), 10);
    if (!Number.isFinite(sales_rep_id)) {
      errors.add({
        kind: 'unparseable_staff_rep_id',
        source_file: staffDirectoryPath,
        source_row_number: sheetRow,
        detail: { raw: repRaw },
      });
      return;
    }

    // Hard-fail on collision with a roster sales_rep_id.
    if (roster.by_sales_rep_id.has(sales_rep_id)) {
      const roster_row = roster.by_sales_rep_id.get(sales_rep_id)!;
      throw new FatalStaffDirectoryError(
        `staff_rep_id_collides_with_roster: sales_rep_id ${sales_rep_id} appears in both the staff directory (${staffDirectoryPath}, row ${sheetRow}) and the master roster (${roster_row.full_name}). A rep cannot be both. Resolve before re-running.`,
      );
    }

    if (bySalesRepId.has(sales_rep_id)) {
      errors.add({
        kind: 'duplicate_staff_rep_id',
        source_file: staffDirectoryPath,
        source_row_number: sheetRow,
        sales_rep_id,
        detail: { last_write_wins: true },
      });
    }

    const entry: StaffEntry = {
      sales_rep_id,
      category: emptyToNull(raw['Category']) ?? '',
      name: emptyToNull(raw['Name']) ?? '',
    };
    entries.push(entry);
    bySalesRepId.set(sales_rep_id, entry);
  });

  return { entries, by_sales_rep_id: bySalesRepId };
}
