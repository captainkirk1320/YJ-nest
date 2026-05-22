# SOP — Master Volunteer Roster Parse

**Owner:** `parse_master_roster.ts`
**Spec source:** CLAUDE.md §4.2, §7.2
**Status:** Locked 2026-05-20

---

## Purpose

Parse the Master Volunteer Roster Excel file into the canonical in-memory bridge table that every other ingest step joins through.

## Input contract

| File | Source | Cadence | Authoritative? |
|---|---|---|---|
| `Process Documentation/26-27 Full Roster.xlsx` (pilot) | Kirk-built; later Conor's consolidated SF report | Manual refresh; updated when volunteers join/leave | **YES** — this is THE bridge file. |

## Expected column shape (target, §7.2)

| Column | Type | Required? | Notes |
|---|---|---|---|
| `full_contact_id` | string | nullable* | 15- or 18-char alphanumeric SF Contact ID. Preferred identity. Missing for staged board / life members without a current SF Contact record. |
| `sales_rep_id` | int | nullable* | Numeric Unify Rep ID. May be missing for non-selling members (some board, future YJs without Unify access). |
| `first_name`, `last_name`, `full_name` | string | YES | Identity (display + diagnostics). |
| `email` | string | YES (Yellow Jacket + Future) | Comms + share-out channel. |
| `phone` | string (E.164 preferred) | YES (Yellow Jacket + Future) | SMS OTP login via Twilio. |
| `team` | string | nullable | Mascot team. Null for Life Members, Life Directors, Board. |
| `is_sales_captain` | boolean | YES | Default `false`. True for the ~10–12 volunteers who lead a team's volunteers (a sales captain). **Distinct from the tier named "Captain"** (50K-point tier 3) — sales captain = role; Captain tier = points reward. |
| `member_type` | enum | YES | `Yellow Jacket` / `Future` / `Life Member` / `Life Director` / `Board`. |
| `active` | boolean | YES | Inactive members filtered from leaderboards but kept queryable. |

\* Per row, AT LEAST ONE of `full_contact_id` / `sales_rep_id` must be non-null. Both null → row dropped from in-memory roster (warning logged). See `sop_identity_and_join_model.md` for the relaxed preflight rule.
| `first_year_of_volunteering` | int | optional | Tenure display. |
| `fiesta_ticket_link` | string | nullable | Personal SeatGeek URL — Fiesta Bowl. |
| `rate_ticket_link` | string | nullable | Personal SeatGeek URL — Rate Bowl. |
| `last_year_fundraising_dollars` | numeric | nullable | YoY display. |
| `last_year_fundraising_rank` | int | nullable | YoY display. |
| `job` | string | nullable | Employer + title (admin context). |

## Current sample shape (gap analysis)

`Process Documentation/26-27 Full Roster.xlsx` (as of 2026-05-18) has three sheets:

| Sheet | Shape | Status |
|---|---|---|
| `Full Roster` | `Sale Rep ID`, `Full Contact ID`, `First Name`, `Last Name`, `Full Name`, `Representative Category`, `YJ Category`, `Active`, `Sales team`, `Phone Number`, `Email`, `Company - Job`, `25-26 Dollars`, `Future Class`, `In SF` | Has both IDs ✅; missing `is_sales_captain`; `member_type` still split across `Representative Category` + `YJ Category` |
| `SF Roster` | `Full Contact ID`, `First Name`, `Last Name`, `Yellow Jacket Team`, `First Year of Volunteering`, `Bowl Position` | Carries `team` + tenure + bowl position |
| `Yellow Jacket Fundraising 25-26` | `First name`, `Last name`, `Full Name`, `Email`, `Phone`, `Job`, `25-26 Fundraising Dollars`, `25-26 Fundraising Rank`, `Future Class` | Historical performance |

The roster is being finalized by Kirk. Parser must tolerate the current 3-sheet shape AND switch cleanly to a single-sheet shape when delivered.

## Parsing strategy

### Pilot (current sample shape)

1. Load `26-27 Full Roster.xlsx` with `xlsx` library, `cellDates: true`, `raw: false`.
2. Sheet 1 (`Full Roster`) is the spine. Each row → one roster record.
3. Left-join sheet 2 (`SF Roster`) on `Full Contact ID` to pick up `Yellow Jacket Team` (canonical `team`) + `First Year of Volunteering` + `Bowl Position`.
4. Left-join sheet 3 (`Yellow Jacket Fundraising 25-26`) on `Full Name` (only available key) to pick up last-year dollars + rank + email/phone/job fallback when missing on sheet 1.
5. **Derive `member_type` from legacy fields** using this mapping (locked 2026-05-20):

   | `Representative Category` | `YJ Category` | → `member_type` |
   |---|---|---|
   | `Yellow Jacket` | `Committee Member` | `Yellow Jacket` |
   | `Yellow Jacket` | `Future` | `Future` |
   | `Life Directors & Members` | `Life Member` | `Life Member` |
   | `Life Directors & Members` | `Life Director` | `Life Director` |
   | `Board of Directors` | `Board` | `Board` |
   | (other / blank) | (other / blank) | → `ingest_errors` of kind `ambiguous_member_type`; row dropped |

6. **`is_sales_captain`** — not present in current sample. Until Conor adds the SF custom field (named `Sales Captain` in SF, mapped to `is_sales_captain` in the engine), the engine reads a separate pilot-scope CSV (`Process Documentation/pilot_sales_captains.csv`, columns `full_contact_id,is_sales_captain`). If the file is absent, `is_sales_captain = false` for everyone and a warning is logged once. Throwaway path — remove when SF custom field lands.

### Post-pilot (target shape)

When Conor delivers the consolidated single-sheet `Master Volunteer Roster.xlsx`, the parser:
- Auto-detects shape by sheet count (1 = new, 3 = legacy).
- New shape: one row per volunteer, all columns native. No joining required.

## Output: in-memory roster

```ts
type RosterRow = {
  full_contact_id: string;          // canonical identity
  sales_rep_id: number | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  team: string | null;
  is_sales_captain: boolean;
  member_type: 'Yellow Jacket' | 'Future' | 'Life Member' | 'Life Director' | 'Board';
  active: boolean;
  first_year_of_volunteering: number | null;
  fiesta_ticket_link: string | null;
  rate_ticket_link: string | null;
  last_year_fundraising_dollars: number | null;
  last_year_fundraising_rank: number | null;
  job: string | null;
};

type Roster = {
  rows: RosterRow[];
  by_full_contact_id: Map<string, RosterRow>;
  by_sales_rep_id: Map<number, RosterRow>;
};
```

The parser returns a `Roster` object with both lookup indexes pre-built so every downstream join is O(1).

## Preflight validations

Per `sop_identity_and_join_model.md`:

| Check | On failure |
|---|---|
| Each row has at least one of `(full_contact_id, sales_rep_id)` | `ingest_errors` of kind `roster_row_no_identity` (warning); row dropped from in-memory roster. |
| `full_contact_id` (where non-null) is unique | **Hard fail.** |
| `sales_rep_id` (where non-null) is unique | **Hard fail.** |
| `full_name` is unique | `ingest_errors` of kind `duplicate_full_name`, **WARN ONLY** — ingest continues. |
| Phone present for `member_type ∈ {Yellow Jacket, Future}` AND `active` | `ingest_errors` of kind `missing_phone`, continue. |
| `member_type` resolvable from legacy fields | Row-level `ingest_errors`, row dropped. |

## What this SOP does NOT cover

- How the roster is used as a join target → `sop_identity_and_join_model.md`
- What downstream steps do when a join misses → `sop_ingest_errors.md`
