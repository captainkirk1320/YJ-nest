// Programmatically builds the synthetic input files the golden ingest test
// consumes. Re-run when the fixture design changes:
//   npx tsx fixtures/build_golden_fixtures.ts
//
// Outputs land in fixtures/inputs/. Hand-derivation lives in
// fixtures/golden_derivation.md; expected outputs in fixtures/golden_expected.json.

import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const INPUTS_DIR = resolve(here, 'inputs');
mkdirSync(INPUTS_DIR, { recursive: true });

// ─── 1. Master Roster (3-sheet pilot shape) ───────────────────────────

const fullRoster = [
  // Header columns mirror Process Documentation/26-27 Full Roster.xlsx
  {
    'Sale Rep ID': 9101, 'Full Contact ID': '003A001', 'First Name': 'Alice', 'Last Name': 'Acorn',
    'Full Name': 'Alice Acorn', 'Representative Category': 'Yellow Jacket', 'YJ Category': 'Committee Member',
    'Active': true, 'Sales team': 'Gorlocks', 'Phone Number': '480-555-0101',
    'Email': 'alice@example.com', 'Company - Job': 'Acme — CEO', '25-26 Dollars': 50000,
  },
  {
    'Sale Rep ID': 9102, 'Full Contact ID': '003A002', 'First Name': 'Bob', 'Last Name': 'Birch',
    'Full Name': 'Bob Birch', 'Representative Category': 'Yellow Jacket', 'YJ Category': 'Committee Member',
    'Active': true, 'Sales team': 'Gorlocks', 'Phone Number': '480-555-0102',
    'Email': 'bob@example.com', 'Company - Job': 'Birch Co — VP', '25-26 Dollars': 30000,
  },
  {
    'Sale Rep ID': 9103, 'Full Contact ID': '003A003', 'First Name': 'Carla', 'Last Name': 'Cedar',
    'Full Name': 'Carla Cedar', 'Representative Category': 'Yellow Jacket', 'YJ Category': 'Future',
    'Active': true, 'Sales team': 'Pistol Petes', 'Phone Number': '480-555-0103',
    'Email': 'carla@example.com', 'Company - Job': 'Cedar LLC — Analyst', '25-26 Dollars': 'Future',
  },
  {
    'Sale Rep ID': 9104, 'Full Contact ID': '', 'First Name': 'Dave', 'Last Name': 'Dogwood',
    'Full Name': 'Dave Dogwood', 'Representative Category': 'Yellow Jacket', 'YJ Category': 'Committee Member',
    'Active': true, 'Sales team': 'Pistol Petes', 'Phone Number': '480-555-0104',
    'Email': 'dave@example.com', 'Company - Job': 'Dogwood Inc — Director', '25-26 Dollars': 5000,
  },
  {
    'Sale Rep ID': 9105, 'Full Contact ID': '', 'First Name': 'Eve', 'Last Name': 'Elm',
    'Full Name': 'Eve Elm', 'Representative Category': 'Life Directors & Members', 'YJ Category': 'Life Member',
    'Active': true, 'Sales team': '', 'Phone Number': '480-555-0105',
    'Email': 'eve@example.com', 'Company - Job': 'Retired', '25-26 Dollars': 0,
  },
  {
    'Sale Rep ID': null, 'Full Contact ID': '003A006', 'First Name': 'Frank', 'Last Name': 'Fir',
    'Full Name': 'Frank Fir', 'Representative Category': 'Board of Directors', 'YJ Category': 'Board',
    'Active': true, 'Sales team': '', 'Phone Number': '480-555-0106',
    'Email': 'frank@example.com', 'Company - Job': 'Foundation Board', '25-26 Dollars': 0,
  },
  {
    'Sale Rep ID': 9107, 'Full Contact ID': '003A007', 'First Name': 'Grace', 'Last Name': 'Ginkgo',
    'Full Name': 'Grace Ginkgo', 'Representative Category': 'Yellow Jacket', 'YJ Category': 'Committee Member',
    'Active': true, 'Sales team': 'Gorlocks', 'Phone Number': '',
    'Email': 'grace@example.com', 'Company - Job': 'Ginkgo Group — Mgr', '25-26 Dollars': 0,
  },
  {
    'Sale Rep ID': 9108, 'Full Contact ID': '003A008', 'First Name': 'Hank', 'Last Name': 'Holly',
    'Full Name': 'Hank Holly', 'Representative Category': 'Yellow Jacket', 'YJ Category': 'Committee Member',
    'Active': true, 'Sales team': 'Gorlocks', 'Phone Number': '480-555-0108',
    'Email': 'hank@example.com', 'Company - Job': 'Holly Holdings — Partner', '25-26 Dollars': 15000,
  },
];

const sfRoster = [
  { 'Full Contact ID': '003A001', '__EMPTY': null, 'First Name': 'Alice', 'Last Name': 'Acorn', 'Yellow Jacket Team': 'Gorlocks', 'First Year of Volunteering': '2020', 'Bowl Position': 'Committee Member' },
  { 'Full Contact ID': '003A002', '__EMPTY': null, 'First Name': 'Bob',   'Last Name': 'Birch', 'Yellow Jacket Team': 'Gorlocks', 'First Year of Volunteering': '2021', 'Bowl Position': 'Committee Member' },
  { 'Full Contact ID': '003A003', '__EMPTY': null, 'First Name': 'Carla', 'Last Name': 'Cedar', 'Yellow Jacket Team': 'Pistol Petes', 'First Year of Volunteering': '2026', 'Bowl Position': 'Committee Member' },
  { 'Full Contact ID': '003A006', '__EMPTY': null, 'First Name': 'Frank', 'Last Name': 'Fir',   'Yellow Jacket Team': '', 'First Year of Volunteering': '2010', 'Bowl Position': 'Board' },
  { 'Full Contact ID': '003A007', '__EMPTY': null, 'First Name': 'Grace', 'Last Name': 'Ginkgo','Yellow Jacket Team': 'Gorlocks', 'First Year of Volunteering': '2022', 'Bowl Position': 'Committee Member' },
  { 'Full Contact ID': '003A008', '__EMPTY': null, 'First Name': 'Hank',  'Last Name': 'Holly', 'Yellow Jacket Team': 'Gorlocks', 'First Year of Volunteering': '2019', 'Bowl Position': 'Committee Member' },
];

const yjFundraising = [
  { 'First name': 'Alice', 'Last name': 'Acorn', 'Full Name': 'Alice Acorn', 'Email': 'alice@example.com', 'Phone': '480-555-0101', 'Job': 'Acme — CEO', '25-26 Fundraising Dollars': 50000, '25-26 Fundraising Rank': 5 },
];

const rosterWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(rosterWb, XLSX.utils.json_to_sheet(fullRoster), 'Full Roster');
XLSX.utils.book_append_sheet(rosterWb, XLSX.utils.json_to_sheet(sfRoster), 'SF Roster');
XLSX.utils.book_append_sheet(rosterWb, XLSX.utils.json_to_sheet(yjFundraising), 'Yellow Jacket Fundraising 25-26');
XLSX.writeFile(rosterWb, resolve(INPUTS_DIR, 'Master Roster.xlsx'));

// ─── 2. Sales Staff Directory ─────────────────────────────────────────

const staffWb = XLSX.utils.book_new();
const staffSheet = XLSX.utils.json_to_sheet([
  { 'Sales Rep ID': 9201, 'Category': 'Sales', 'Name': 'Test Tony' },
  { 'Sales Rep ID': 9202, 'Category': 'Sales', 'Name': 'Test Austin' },
]);
XLSX.utils.book_append_sheet(staffWb, staffSheet, 'Sheet1');
XLSX.writeFile(staffWb, resolve(INPUTS_DIR, 'Sales Staff Directory.xlsx'));

// ─── 3. Unify CSV ─────────────────────────────────────────────────────

const unifyRows = [
  ['Yellow Jacket Rep', 'Item', 'Total Sale Value', 'Account Name'],
  ['(9101) Alice Acorn', 'Vrbo Fiesta Bowl - CFP Semifinal', '1500.0000', 'Acme Bank'],
  ['(9102) Bob Birch', 'Rate Bowl - Tickets', '400.0000', 'Birch Holdings'],
  ['(9103) Future Carla Cedar', 'Wishes for Teachers Donation', '300.0000', 'Cedar Family Trust'],
  ['(9104) Dave Dogwood', 'PARKING - Rate Bowl', '50.0000', 'Dogwood LLC'],
  ['(9108) Hank Holly', 'Par 3 Challenge - Foursome', '150.0000', 'Holly Holdings'],
  ['(9101) Alice Acorn,(9102) Bob Birch', 'Vrbo Fiesta Bowl - CFP Semifinal', '2000.0000', 'Joint Account'],
  ['(9201) Test Tony,(9108) Hank Holly', 'Vrbo Fiesta Bowl - Club 71', '500.0000', 'Mixed Sale'],
  ['(9105) Life Member Eve Elm,(9102) Bob Birch', 'Vrbo Fiesta Bowl - Tickets', '800.0000', 'Elm Estate'],
  ['(9201) Test Tony,(9202) Test Austin', 'Rate Bowl - Tickets', '200.0000', 'Staff Only Sale'],
  ['(99999) Mystery Person,(9101) Alice Acorn', 'Vrbo Fiesta Bowl - Tickets', '600.0000', 'Account With Unknown'],
  ['(9101) Alice Acorn', 'Vrbo Fiesta Bowl - Tickets', '400.0000', 'Family redirect to Carla and Hank'],
  ['(9101) Alice Acorn', 'Vrbo Fiesta Bowl Suite - VIP', '20000.0000', 'Acme Corporate'],
];

const csvText =
  '﻿' + // BOM, matching the real Unify export
  unifyRows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\n') + '\n';
writeFileSync(resolve(INPUTS_DIR, 'Report Data - 2026-05-21T100000.000.csv'), csvText, 'utf8');

// ─── 4. Volunteer Credit Export (synthetic with Full Contact ID) ──────
// Layout matches the two-block Gorlocks production target shape.
// Includes 3 SF dollars rows + 2 SF points rows.

function buildCreditGrid(): unknown[][] {
  const grid: unknown[][] = [];
  // Rows 1-18: metadata + filter descriptors (ignored by parser).
  for (let i = 0; i < 17; i++) grid.push([]);
  grid.push([null, 'Yellow Jacket Team equals Gorlocks']);                                          // row 18
  grid.push([]);                                                                                    // row 19 separator
  grid.push([null, 'Contacts with Custom Object', null, null, null, null, 'Contacts with Custom Object']); // row 20
  grid.push([null, 'Yellow Jacket Credit- Opportunities', null, null, null, null, 'Volunteer Points']); // row 21

  // Row 22 — header. Layout (column-index based, 0-indexed):
  //   1 Full Contact ID (left)
  //   2 Contact Full Name (left)
  //   3 Opportunity: Opportunity Name
  //   4 Amount Credited
  //   5 Type
  //   6 Full Contact ID (right)
  //   7 Contact Full Name (right)
  //   8 Volunteer Job: Volunteer Job Name
  //   9 Volunteer Points
  //  10 Volunteer Job: Campaign
  grid.push([
    null,
    'Full Contact ID', 'Contact Full Name', 'Opportunity: Opportunity Name', 'Amount Credited', 'Type',
    'Full Contact ID', 'Contact Full Name', 'Volunteer Job: Volunteer Job Name', 'Volunteer Points', 'Volunteer Job: Campaign',
  ]);

  // Data rows. Left + right blocks side-by-side per row.
  const left: Array<{ fcid: string; name: string; opp: string; amt: number; type: string }> = [
    { fcid: '003A002', name: 'Bob Birch',   opp: 'AI Help',           amt: 50,   type: 'Cash' },        // allowlisted Cash
    { fcid: '003A003', name: 'Carla Cedar', opp: 'Acme Co Sponsor',   amt: 1000, type: 'Sponsorship' }, // auto-allow Sponsorship
    { fcid: '003A001', name: 'Alice Acorn', opp: 'Refund Adjustment', amt: 25,   type: 'Cash' },        // unallowlisted → error
  ];
  const right: Array<{ fcid: string; name: string; job: string; pts: number; campaign: string }> = [
    { fcid: '003A001', name: 'Alice Acorn', job: 'April YJ Meeting', pts: 500, campaign: 'Committee Participation Points 2026-27' },
    { fcid: '003A002', name: 'Bob Birch',   job: 'Some Event',       pts: 200, campaign: 'Wrong Campaign' }, // unexpected campaign → error
  ];

  const maxRows = Math.max(left.length, right.length);
  for (let i = 0; i < maxRows; i++) {
    const l = left[i];
    const r = right[i];
    grid.push([
      null,
      l?.fcid ?? null, l?.name ?? null, l?.opp ?? null, l?.amt ?? null, l?.type ?? null,
      r?.fcid ?? null, r?.name ?? null, r?.job ?? null, r?.pts ?? null, r?.campaign ?? null,
    ]);
  }

  // Total row + footer (parser stops at "Total").
  grid.push([null, 'Total', null, 1075, null, null, null, null, 700, null]);
  grid.push([]);
  grid.push([null, 'Confidential Information - Do Not Distribute']);
  grid.push([null, 'Copyright © 2000-2026 salesforce.com, inc. All rights reserved.']);
  return grid;
}

const creditWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(creditWb, XLSX.utils.aoa_to_sheet(buildCreditGrid()), 'Gorlocks Credit');
// File name must match {TeamMascot}-{YYYY-MM-DD-HH-MM-SS}.xlsx; the orchestrator
// strips an optional "YYYY-YY " report-cycle prefix. We use "Gorlocks-..." directly.
XLSX.writeFile(creditWb, resolve(INPUTS_DIR, 'Gorlocks-2026-05-21-10-00-00.xlsx'));

// ─── 5. Exceptions ────────────────────────────────────────────────────

const exceptionsTxt = `# Golden-test exceptions fixture.
# Two active blocks exercising SPLIT (T-001) and ADJUST (T-002).

---
ID: T-001
Added: 2026-05-21
Active: yes
Type: SPLIT
Account: Family redirect
Match: contains
Reps:
  - 9103 Carla Cedar: 50%
  - 9108 Hank Holly: 50%
Notes: Test fixture — redirects 'Family redirect' account to Carla + Hank.

---
ID: T-002
Added: 2026-05-21
Active: yes
Type: ADJUST
Account: Test adjustment
Match: contains
Adjustments:
  - 9102 Bob Birch: +50 rate_bowl
  - 9108 Hank Holly: -50 rate_bowl
Notes: Test fixture — manual transfer of $50 Rate Bowl credit.
`;
writeFileSync(resolve(INPUTS_DIR, 'exceptions.txt'), exceptionsTxt, 'utf8');

console.log('Golden fixtures built in', INPUTS_DIR);
