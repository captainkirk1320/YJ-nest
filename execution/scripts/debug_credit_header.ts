import { read, utils } from 'xlsx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const path = resolve(import.meta.dirname, '..', '..', 'Process Documentation', '2026-27 Gorlocks-2026-05-18-14-34-26.xlsx');
const buf = readFileSync(path);
const wb = read(buf, { cellDates: true, raw: false });
const sheet = wb.Sheets[wb.SheetNames[0]!]!;
const grid = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, blankrows: true });

const r = 21; // 0-indexed for row 22
const row = grid[r];
console.log('row length:', row?.length);
console.log('row contents:', row);
const cellsLower = row!.map((c) => (c == null ? '' : String(c).trim().toLowerCase()));
console.log('cellsLower:', cellsLower);
console.log('cellsLower[2]:', JSON.stringify(cellsLower[2]));
console.log('match opportunity: opportunity name?', cellsLower[2] === 'opportunity: opportunity name');
console.log('match volunteer job: volunteer job name?', cellsLower[6] === 'volunteer job: volunteer job name');
