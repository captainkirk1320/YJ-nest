// One-shot: dump sheet names + first-row headers + first 2 data rows of every
// input file the engine consumes. Used to validate parser assumptions match
// reality. Not part of the runtime engine.

import { read, utils } from 'xlsx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');

function dump(label: string, path: string) {
  console.log(`\n=== ${label} ===`);
  console.log(`Path: ${path}`);
  const buf = readFileSync(path);
  const wb = read(buf, { cellDates: true, raw: false });
  console.log(`Sheets: ${JSON.stringify(wb.SheetNames)}`);
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
    console.log(`\n  --- Sheet: "${name}" (${rows.length} data rows) ---`);
    if (rows.length === 0) continue;
    const first = rows[0];
    if (!first) continue;
    console.log(`  Columns: ${JSON.stringify(Object.keys(first))}`);
    console.log(`  Row[0]: ${JSON.stringify(first)}`);
    if (rows.length > 1) console.log(`  Row[1]: ${JSON.stringify(rows[1])}`);
  }
}

dump('Master Roster', resolve(PROJECT_ROOT, 'Process Documentation', '26-27 Full Roster.xlsx'));
dump('Sales Staff Directory', resolve(PROJECT_ROOT, 'Sales Staff Directory.xlsx'));
