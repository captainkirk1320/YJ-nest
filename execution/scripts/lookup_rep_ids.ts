// One-shot: dump (sales_rep_id, full_name, team) from 26-27 Full Roster.xlsx
// so we can manually pick the right IDs for exception blocks.
// Not part of the runtime engine.

import { read, utils } from 'xlsx';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROSTER_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  'Process Documentation',
  '26-27 Full Roster.xlsx',
);

const buf = readFileSync(ROSTER_PATH);
const wb = read(buf, { cellDates: true, raw: false });
const sheet = wb.Sheets['Full Roster'];
if (!sheet) {
  console.error('Could not find "Full Roster" sheet. Sheets present:', wb.SheetNames);
  process.exit(1);
}

const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

// Search terms — last names + a few first names from the Manual Tweaks corpus
const NEEDLES = [
  'meyer', 'davis', 'schmock', 'bernstein', 'hays', 'higgs', 'senoski',
  'moll', 'harsell', 'nelson', 'sanders', 'boyer', 'barkyoumb', 'cummiskey',
  'stack', 'pray', 'prichard', 'kebert', 'hunter', 'saunders', 'gubernick',
  'crowson', 'green',
];

const matches: Array<{ rep_id: unknown; name: unknown; team: unknown; sheet_row: number }> = [];
rows.forEach((r, i) => {
  const name = String(r['Full Name'] ?? '').toLowerCase();
  if (!name) return;
  if (NEEDLES.some((n) => name.includes(n))) {
    matches.push({
      rep_id: r['Sale Rep ID'],
      name: r['Full Name'],
      team: r['Sales team'],
      sheet_row: i + 2, // +2 because header row 1, data starts row 2
    });
  }
});

console.log(`Found ${matches.length} matches in roster:`);
for (const m of matches) {
  console.log(`  row ${m.sheet_row}: rep_id=${String(m.rep_id).padEnd(10)} ${String(m.name).padEnd(28)} team=${m.team}`);
}
