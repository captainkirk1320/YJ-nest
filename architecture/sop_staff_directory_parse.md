# SOP — Sales Staff Directory Parse

**Owner:** `parse_staff_directory.ts`
**Spec source:** Decision 2026-05-21 (staff allowlist resolution); referenced by `sop_identity_and_join_model.md`, `sop_multi_rep_split.md`
**Status:** Locked 2026-05-21

---

## Purpose

Parse the foundation's sales staff directory into an in-memory allowlist of `sales_rep_id`s that should be filtered out of multi-rep credit splits without warning. Mirrored into a Supabase `staff_rep_ids` table for queryability.

## Why this exists

Foundation employees (ticket reps, sales staff, suite coordinators, etc.) occasionally co-appear on Unify CSV rows when they help close a sale. They are NOT volunteers — they should not receive credit, and they should not count in the multi-rep divisor (otherwise volunteer co-reps get diluted credit). Maintaining a small allowlist lets the engine handle this silently while still surfacing genuine unknowns for triage.

## Input contract

| File | Source | Cadence |
|---|---|---|
| `Sales Staff Directory.xlsx` (project root) | Maintained by Kirk / Conor | Manual; updated when staff turnover happens (rarely) |

**Location is the project root**, not `Process Documentation/`. The directory is engine config, not source data, and lives next to `CLAUDE.md` for visibility.

## Expected column shape (current sample, locked)

Sheet 1, header row 1, data row 2+:

| Column | Type | Required | Notes |
|---|---|---|---|
| `Sales Rep ID` | int | YES | The Unify rep ID. Matches the parenthesized number in `(repId) Display Name` tokens. |
| `Category` | string | YES | Free-form. Current values: `Sales`. May expand (`Suite`, `Tickets`, etc.) in the future. Engine treats all categories identically for now. |
| `Name` | string | YES | Display name. Diagnostic only — NEVER a join key. |

Current entries (pilot seed, 2026-05-21):

| Sales Rep ID | Category | Name |
|---|---|---|
| 200288 | Sales | Tony Econ |
| 2095453 | Sales | Austin Zawicki |

## Parsing strategy

1. Load `Sales Staff Directory.xlsx` with `xlsx` library, `cellDates: true`, `raw: false`.
2. Locate sheet 1 (only sheet expected).
3. Header row is row 1. Validate it contains at least `Sales Rep ID`, `Category`, `Name` columns. **Hard fail** if missing — the file's purpose is to provide structured staff IDs; a malformed header is a structural problem.
4. For each data row:
   - Parse `Sales Rep ID` as integer.
   - Trim `Category` and `Name`.
   - If `Sales Rep ID` not parseable → `ingest_errors` of kind `unparseable_staff_rep_id`, row skipped.
   - Otherwise → add to allowlist.
5. Deduplicate by `Sales Rep ID` (last write wins; warn on duplicate).

## Output: in-memory allowlist

```ts
type StaffEntry = {
  sales_rep_id: number;
  category: string;          // e.g. "Sales"
  name: string;              // diagnostic
};

type StaffAllowlist = {
  entries: StaffEntry[];
  by_sales_rep_id: Map<number, StaffEntry>;
};
```

Used by `sop_multi_rep_split.md` to classify each rep on a Unify row.

## File-absent behavior

If `Sales Staff Directory.xlsx` is missing at run time:
- Engine continues with an empty allowlist.
- Single warning logged at startup (`staff_directory_absent`).
- Every Unify rep ID not in the roster will emit `unknown_sales_rep_id` (warning) until the directory is restored. Volunteer credit math is unaffected (unknown reps are still filtered from the divisor); operator just sees more warnings to triage.

This is intentional: the engine never blocks ingest on a missing allowlist, because the staff directory is small and edits are rare, and a missing file shouldn't halt fundraising data.

## Validation

| Check | On failure |
|---|---|
| Sheet 1 exists and has the 3 required header columns | **Hard fail.** |
| Every data row has a parseable `Sales Rep ID` | Row-level `ingest_errors` (`unparseable_staff_rep_id`), row skipped. |
| `Sales Rep ID` is unique across the file | Warning of kind `duplicate_staff_rep_id`; last entry wins. |
| `Sales Rep ID` does NOT collide with a roster `sales_rep_id` | **Hard fail** of kind `staff_rep_id_collides_with_roster`. A rep can't be both staff and a volunteer; one of the two is wrong and operator must resolve. |

## Supabase mirror

```sql
staff_rep_ids (
  sales_rep_id integer primary key,
  category text not null,
  name text not null,
  source_file_hash text not null,
  ingested_at timestamptz default now()
);
```

On each ingest cycle, the table is fully re-synced from the file: entries no longer in the file are deleted, new entries are inserted, existing entries are updated. Idempotent.

## What this SOP does NOT cover

- How the allowlist is used at split time → `sop_multi_rep_split.md`
- How unknown (not-in-allowlist + not-in-roster) reps are handled → `sop_multi_rep_split.md` + `sop_ingest_errors.md`
- The `org_uncredited` synthetic bucket for N=0 rows → `sop_multi_rep_split.md`
