// Regression tests for bugs surfaced in Codex's adversarial review (Stage 7).
// Each test pins a specific defect we'd otherwise be at risk of reintroducing.

import { describe, it, expect } from 'vitest';
import { parseUnifyCsv } from '../src/parse_unify_csv.js';
import { computeMetrics } from '../src/compute_metrics.js';
import { IngestErrorCollector } from '../src/ingest_errors.js';
import { applyExceptionsAndSplit } from '../src/apply_exceptions.js';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CreditDollarsRecord,
  Roster,
  RosterRow,
  StaffAllowlist,
  UnifyRow,
} from '../src/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const TMP = resolve(here, 'codex_tmp');
mkdirSync(TMP, { recursive: true });

function makeRoster(rows: RosterRow[]): Roster {
  return {
    rows,
    by_full_contact_id: new Map(rows.filter((r) => r.full_contact_id).map((r) => [r.full_contact_id!, r])),
    by_sales_rep_id: new Map(rows.filter((r) => r.sales_rep_id != null).map((r) => [r.sales_rep_id!, r])),
  };
}
function makeStaff(ids: number[]): StaffAllowlist {
  const entries = ids.map((id) => ({ sales_rep_id: id, category: 'Sales', name: `Staff${id}` }));
  return { entries, by_sales_rep_id: new Map(entries.map((e) => [e.sales_rep_id, e])) };
}
function row(overrides: Partial<RosterRow>): RosterRow {
  return {
    full_contact_id: null,
    sales_rep_id: null,
    first_name: 'X',
    last_name: 'Y',
    full_name: 'X Y',
    email: null,
    phone: null,
    team: null,
    is_sales_captain: false,
    member_type: 'Yellow Jacket',
    active: true,
    first_year_of_volunteering: null,
    fiesta_ticket_link: null,
    rate_ticket_link: null,
    last_year_fundraising_dollars: null,
    last_year_fundraising_rank: null,
    job: null,
    ...overrides,
  };
}

describe('Codex P2 — Unify tokenizer trailing-comma fix', () => {
  it('captures the final rep when the field ends with a trailing comma', () => {
    const csv = `"Yellow Jacket Rep","Item","Total Sale Value","Account Name"
"(123) Jane Doe,","Fiesta Bowl","100.00","Trailing Comma Sale"
`;
    const path = resolve(TMP, 'trailing_comma.csv');
    writeFileSync(path, csv, 'utf8');
    const errors = new IngestErrorCollector();
    const out = parseUnifyCsv({ csvPath: path, errors });
    expect(out.length).toBe(1);
    expect(out[0]!.sales_rep_id).toBe(123);
    expect(errors.errorCount()).toBe(0);
    rmSync(path);
  });

  it('captures two reps when both have a trailing comma after the last token', () => {
    const csv = `"Yellow Jacket Rep","Item","Total Sale Value","Account Name"
"(111) Alice,(222) Bob,","Fiesta Bowl","200.00","Two Reps Trailing"
`;
    const path = resolve(TMP, 'two_reps_trailing.csv');
    writeFileSync(path, csv, 'utf8');
    const errors = new IngestErrorCollector();
    const out = parseUnifyCsv({ csvPath: path, errors });
    expect(out.length).toBe(2);
    expect(out.map((r) => r.sales_rep_id).sort()).toEqual([111, 222]);
    rmSync(path);
  });
});

describe('Codex P2 — unknown_sales_rep_id dedup fix', () => {
  it('emits exactly one warning per (file, unknown rep) across many rows', () => {
    const roster = makeRoster([row({ sales_rep_id: 100, full_name: 'Known Volunteer' })]);
    const staff = makeStaff([]);
    const errors = new IngestErrorCollector();

    // 5 Unify rows, all pairing the same unknown rep with the known volunteer.
    const unifyRows: UnifyRow[] = Array.from({ length: 5 }, (_, i) => ({
      source_file: 'r.csv',
      source_row_number: i + 2,
      source_row_hash: `hash${i}`,
      sales_rep_id: 999,
      display_name_raw: 'Unknown',
      item: 'Fiesta Bowl',
      total_sale_value: 100,
      account_name: 'Acct',
      rep_count_on_row: 2,
      all_rep_ids_on_row: [999, 100],
    }));
    // Also push the known-volunteer's records (same row context).
    for (let i = 0; i < 5; i++) {
      unifyRows.push({ ...unifyRows[i]!, sales_rep_id: 100, display_name_raw: 'Known' });
    }

    applyExceptionsAndSplit({ unifyRows, roster, staff, exceptions: [], errors });
    const unknownWarnings = errors.all().filter((e) => e.kind === 'unknown_sales_rep_id');
    expect(unknownWarnings.length).toBe(1); // one warning, not five
    expect(unknownWarnings[0]!.sales_rep_id).toBe(999);
  });
});

describe('Codex P1 — superseding credit-export batches per team', () => {
  it('keeps only the latest-timestamped credit batch per team mascot', () => {
    const v = row({
      sales_rep_id: 100,
      full_contact_id: 'C100',
      full_name: 'Test Vol',
      team: 'Gorlocks',
      member_type: 'Yellow Jacket',
    });
    const roster = makeRoster([v]);
    const errors = new IngestErrorCollector();

    const oldRec: CreditDollarsRecord = {
      source_file: 'Gorlocks-2026-05-01-10-00-00.xlsx',
      source_block: 'opportunities',
      source_row_number: 23,
      source_row_hash: 'oldhash',
      source_file_fingerprint: 'oldfp',
      source_file_timestamp: '2026-05-01-10-00-00',
      team_mascot_from_filename: 'Gorlocks',
      full_contact_id: 'C100',
      contact_full_name_raw: 'Test Vol',
      opportunity_name: 'Old Sponsor',
      amount_dollars: 1000,
      type: 'Sponsorship',
    };
    const newRec: CreditDollarsRecord = {
      ...oldRec,
      source_file: 'Gorlocks-2026-05-21-10-00-00.xlsx',
      source_row_hash: 'newhash',
      source_file_fingerprint: 'newfp',
      source_file_timestamp: '2026-05-21-10-00-00',
      opportunity_name: 'New Sponsor',
      amount_dollars: 500,
    };

    const { volunteers } = computeMetrics({
      unifyAllocations: [],
      creditRecords: [oldRec, newRec],
      exceptions: [],
      roster,
      errors,
    });

    // Only the newer $500 should land; the older $1000 must be dropped.
    const testVol = volunteers.find((vol) => vol.id === 'C100');
    expect(testVol).toBeDefined();
    expect(testVol!.metrics.totalFundraising).toBe(500);
    // A diagnostic ingest_error should mention the superseded file.
    const mismatches = errors.all().filter((e) => e.kind === 'file_team_mismatch');
    expect(mismatches.length).toBeGreaterThan(0);
    expect(JSON.stringify(mismatches[0]!.detail)).toContain('Gorlocks-2026-05-01-10-00-00.xlsx');
  });
});
