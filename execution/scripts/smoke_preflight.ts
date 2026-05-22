// Smoke harness: run the 3 preflight parsers against the real sample files
// and dump a concise health summary. Not part of the runtime engine.

import { resolve } from 'node:path';
import { IngestErrorCollector } from '../src/ingest_errors.js';
import { parseMasterRoster } from '../src/parse_master_roster.js';
import { parseStaffDirectory } from '../src/parse_staff_directory.js';
import { parseExceptions } from '../src/parse_exceptions.js';

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const ROSTER = resolve(PROJECT_ROOT, 'Process Documentation', '26-27 Full Roster.xlsx');
const STAFF = resolve(PROJECT_ROOT, 'Sales Staff Directory.xlsx');
const EXCEPTIONS = resolve(PROJECT_ROOT, 'Process Documentation', 'exceptions.txt');

const errors = new IngestErrorCollector();

console.log('\n=== Master Roster ===');
const roster = parseMasterRoster({ rosterPath: ROSTER, errors });
const byMemberType: Record<string, number> = {};
for (const r of roster.rows) byMemberType[r.member_type] = (byMemberType[r.member_type] ?? 0) + 1;
console.log(`  rows in memory: ${roster.rows.length}`);
console.log(`  by member_type: ${JSON.stringify(byMemberType)}`);
console.log(`  by_full_contact_id size: ${roster.by_full_contact_id.size}`);
console.log(`  by_sales_rep_id size: ${roster.by_sales_rep_id.size}`);

console.log('\n=== Staff Directory ===');
const staff = parseStaffDirectory({ staffDirectoryPath: STAFF, roster, errors });
console.log(`  staff entries: ${staff.entries.length}`);
for (const e of staff.entries) console.log(`    ${e.sales_rep_id}  ${e.category.padEnd(10)} ${e.name}`);

console.log('\n=== exceptions.txt ===');
const exc = parseExceptions({ exceptionsPath: EXCEPTIONS, roster, errors });
console.log(`  file_present: ${exc.file_present}`);
console.log(`  parsed blocks: ${exc.parsed.length}`);
const active = exc.parsed.filter((b) => b.active);
console.log(`  active blocks: ${active.length}`);
for (const b of exc.parsed) {
  const detail = b.type === 'SPLIT' ? `${b.reps.length} reps` : `${b.adjustments.length} adjustments`;
  console.log(`    ${b.id}  ${b.type.padEnd(7)} active=${b.active}  ${detail}  account="${b.account.slice(0, 40)}"`);
}

console.log('\n=== Ingest Errors / Warnings ===');
console.log(`  errors: ${errors.errorCount()}    warnings: ${errors.warningCount()}`);
for (const e of errors.all()) {
  console.log(`  [${e.severity}] ${e.kind} :: file=${e.source_file?.split('/').pop() ?? '-'} row=${e.source_row_number ?? '-'} detail=${JSON.stringify(e.detail).slice(0, 140)}`);
}
