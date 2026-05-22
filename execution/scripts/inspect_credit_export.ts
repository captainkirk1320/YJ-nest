// One-shot: dump the raw cell grid (rows 18-30) of the Gorlocks sample
// so we can confirm the block layout assumed in
// sop_volunteer_credit_routing.md. Not part of the runtime engine.

import { read, utils } from 'xlsx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const path = resolve(PROJECT_ROOT, 'Process Documentation', '2026-27 Gorlocks-2026-05-18-14-34-26.xlsx');

const buf = readFileSync(path);
const wb = read(buf, { cellDates: true, raw: false });
console.log(`Sheets: ${JSON.stringify(wb.SheetNames)}`);
const sheet = wb.Sheets[wb.SheetNames[0]!]!;

// Get the full grid as 2D array
const grid = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: true });
console.log(`Total rows: ${grid.length}`);
for (let i = 17; i < Math.min(35, grid.length); i++) {
  const row = grid[i];
  console.log(`row ${i + 1}: ${JSON.stringify(row)}`);
}
