// Smoke harness: parse the real Unify CSV + the real Volunteer Credit Export
// and report distribution + expected hard-fail on the credit-export precondition.

import { resolve } from 'node:path';
import { IngestErrorCollector } from '../src/ingest_errors.js';
import { parseMasterRoster } from '../src/parse_master_roster.js';
import { parseUnifyCsv } from '../src/parse_unify_csv.js';
import { parseVolunteerCredit } from '../src/parse_volunteer_credit.js';

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const ROSTER = resolve(PROJECT_ROOT, 'Process Documentation', '26-27 Full Roster.xlsx');
const UNIFY = resolve(PROJECT_ROOT, 'Process Documentation', 'Report Data - 2026-05-18T140432.139.csv');
const CREDIT = resolve(PROJECT_ROOT, 'Process Documentation', '2026-27 Gorlocks-2026-05-18-14-34-26.xlsx');

const errors = new IngestErrorCollector();
const roster = parseMasterRoster({ rosterPath: ROSTER, errors });

console.log('\n=== Unify CSV ===');
const unifyRecords = parseUnifyCsv({ csvPath: UNIFY, errors });
console.log(`  Output records (one per (row × rep)): ${unifyRecords.length}`);

// Distribution of reps per row
const repCountDist = new Map<number, number>();
const uniqueRows = new Set<string>();
for (const r of unifyRecords) {
  uniqueRows.add(r.source_row_hash);
  repCountDist.set(r.rep_count_on_row, (repCountDist.get(r.rep_count_on_row) ?? 0) + 1);
}
console.log(`  Unique source rows: ${uniqueRows.size}`);
console.log(`  Records per rep-count bucket: ${JSON.stringify(Object.fromEntries(repCountDist))}`);

// Classify rep IDs (volunteer vs not-in-roster)
const inRoster = new Set<number>();
const notInRoster = new Set<number>();
for (const r of unifyRecords) {
  if (roster.by_sales_rep_id.has(r.sales_rep_id)) inRoster.add(r.sales_rep_id);
  else notInRoster.add(r.sales_rep_id);
}
console.log(`  Unique sales_rep_ids in records: ${inRoster.size + notInRoster.size}`);
console.log(`    in roster:    ${inRoster.size}`);
console.log(`    NOT in roster: ${notInRoster.size}`);
console.log(`    NOT-in-roster IDs: ${[...notInRoster].sort((a, b) => a - b).join(', ')}`);

// Item distribution (rough)
const itemBuckets: Record<string, number> = {};
for (const r of unifyRecords) {
  let bucket = 'other';
  const item = r.item.toLowerCase();
  if (item.includes('rate bowl')) bucket = 'rate_bowl';
  else if (item.includes('wishes for teachers')) bucket = 'wishes';
  else if (item.includes('par 3')) bucket = 'par_3';
  else if (item.includes('football kickoff') || item.includes('koe')) bucket = 'kickoff';
  else if (item.includes('fiesta bowl')) bucket = 'fiesta_bowl';
  itemBuckets[bucket] = (itemBuckets[bucket] ?? 0) + 1;
}
console.log(`  Item buckets: ${JSON.stringify(itemBuckets)}`);

console.log('\n=== Volunteer Credit Export (expected to hard-fail) ===');
try {
  const creditRecords = parseVolunteerCredit({
    creditPath: CREDIT,
    roster,
    cashRoutingAllowlist: [{ type: 'Cash', opportunity_name_pattern: 'AI Help', routing: 'dollars' }],
    errors,
  });
  console.log(`  ⚠ unexpectedly succeeded; ${creditRecords.length} records`);
} catch (e) {
  console.log(`  ✓ expected hard-fail: ${(e as Error).message}`);
}

console.log('\n=== Errors / Warnings ===');
console.log(`  errors=${errors.errorCount()}  warnings=${errors.warningCount()}`);
const byKind = new Map<string, number>();
for (const e of errors.all()) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
for (const [k, v] of byKind.entries()) console.log(`    ${k}: ${v}`);
