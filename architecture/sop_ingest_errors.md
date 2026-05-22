# SOP — Ingest Errors

**Owner:** every parse/apply/compute script
**Spec source:** CLAUDE.md §5.2, §8 invariants
**Status:** Locked 2026-05-20

---

## Purpose

Define the unified error-log mechanism so every script in the engine emits non-fatal data-quality problems to ONE catalog: the Supabase `ingest_errors` table + the operator-facing CSV at `/.tmp/missing_matches_{date}.csv`.

This SOP is the **complete enumeration** of `kind` values the engine emits, plus the rules for when each one fires.

## Hard rule

**Missing matches never break execution.** A `unknown_full_contact_id` row in the credit export means we skip THAT row, emit an `ingest_errors` row, and keep ingesting. The operator reviews the next morning. **Hard fails are reserved for structural problems** (file missing required column, file empty, roster preflight failure) — see each SOP's "validation" section.

## `ingest_errors` row shape

```sql
ingest_errors (
  id uuid primary key default gen_random_uuid(),
  ingest_run_id uuid not null,            -- links to `ingest_runs` table
  emitted_at timestamptz not null default now(),
  kind text not null,                     -- enum below
  severity text not null,                 -- 'warning' | 'error'
  source_file text,                       -- which file the row came from
  source_row_number int,                  -- 1-indexed where applicable
  source_row_hash text,                   -- sha256 of raw row text
  full_contact_id text,                   -- resolved volunteer ID if known
  sales_rep_id int,                       -- resolved rep ID if known
  detail jsonb not null,                  -- kind-specific payload
  resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by text,
  notes text
);
```

## Naming convention (locked)

- `exceptions` = the curated rules file + Supabase mirror table.
- `ingest_errors` = the error log.
- The two are deliberately distinct. Never collapse them. (Memory `project_exceptions_file.md`.)

## Full `kind` enumeration

### Severity: `error` (row dropped from ingest)

| `kind` | Emitted by | Trigger |
|---|---|---|
| ~~`unknown_sales_rep_id`~~ | _moved to warnings_ | _Per 2026-05-21 update: now a warning, not an error. See below._ |
| `unknown_full_contact_id` | `parse_volunteer_credit.ts` | Credit-export row's Full Contact ID not in roster. Row dropped. |
| `missing_full_contact_id_on_credit_row` | `parse_volunteer_credit.ts` | Credit row has an empty Full Contact ID cell. Row dropped. |
| `unparseable_yellow_jacket_rep` | `parse_unify_csv.ts` | Tokenizer found 0 matches. Row dropped. |
| `malformed_csv_row` | `parse_unify_csv.ts` | RFC-4180 parser failed (unclosed quote, etc.). Row dropped. |
| `unparseable_sale_value` | `parse_unify_csv.ts` | `Total Sale Value` not a number. Row dropped. |
| `non_positive_sale_value` | `parse_unify_csv.ts` | `Total Sale Value` ≤ 0 (refund/correction; not handled in V1). Row dropped. |
| `non_positive_amount_credited` | `parse_volunteer_credit.ts` | Left-block `Amount Credited` ≤ 0. Row dropped. |
| `invalid_volunteer_points` | `parse_volunteer_credit.ts` | Right-block `Volunteer Points` not a non-negative integer. Row dropped. |
| `unknown_credit_type` | `parse_volunteer_credit.ts` | Left-block `Type` not in {Cash, Sponsorship, In-Kind}. Row dropped. |
| `unallowlisted_opportunity_name` | `parse_volunteer_credit.ts` | Left-block Cash row whose opportunity name isn't on the allowlist. Row dropped — operator classifies and re-runs. |
| `unexpected_points_campaign` | `parse_volunteer_credit.ts` | Right-block row whose Campaign doesn't contain "Committee Participation Points". Row dropped. |
| `malformed_exception_block` | `parse_exceptions.ts` | Any per-block validation failure in `sop_exceptions_format.md`. Block skipped; rest of file applies. |
| `ambiguous_split_exception_match` | `apply_exceptions.ts` | Two+ active SPLITs match the same Unify row. Default even-split used as fallback. |
| `ambiguous_member_type` | `parse_master_roster.ts` | Roster row's legacy member-type fields don't map to the §4.2 enum. Row dropped from roster. |

### Severity: `warning` (ingest continues with data; flagged for review)

| `kind` | Emitted by | Trigger |
|---|---|---|
| `unknown_sales_rep_id` | `parse_unify_csv.ts` → `sop_multi_rep_split.md` | Unify row's rep token is in neither the roster nor the staff allowlist. Rep is filtered from the divisor (remaining known volunteers split the full sale). Operator triages: real staff to add to allowlist, real volunteer to add to roster, or typo? |
| `no_known_volunteer_on_row` | `apply_exceptions.ts` / split phase | A Unify row had reps but none of them resolved to known volunteers (all staff or unknown). Sale routes to `org_uncredited` synthetic bucket (counts toward org totals, no individual leaderboard credit). |
| `roster_row_no_identity` | `parse_master_roster.ts` preflight | Roster row has both `full_contact_id` and `sales_rep_id` null. Row dropped from in-memory roster; spreadsheet row kept for future ID assignment. |
| `duplicate_full_name` | `parse_master_roster.ts` preflight | Two roster rows share a `full_name`. Defense-in-depth flag — name is not a join key but operator should disambiguate. |
| `missing_phone` | `parse_master_roster.ts` preflight | Active YJ/Future volunteer has no phone. Twilio OTP login will fail. |
| `file_team_mismatch` | `parse_volunteer_credit.ts` | Credit file's filename mascot ≠ resolved volunteer's roster team. Credit still flows; flagged. |

## Severity: `fatal` (engine refuses to run)

These do NOT write to `ingest_errors`. They abort the ingest cycle with a logged error and a non-zero exit code. Reasons:
- The error is structural (no row to skip).
- Continuing would silently produce wrong totals.

Fatal conditions:

| Condition | Source |
|---|---|
| Master Roster preflight: any row missing `full_contact_id` | `sop_master_roster_parse.md` |
| Master Roster preflight: duplicate `full_contact_id` | same |
| Master Roster preflight: duplicate non-null `sales_rep_id` | same |
| Unify CSV file missing | `sop_unify_csv_ingest.md` |
| Unify CSV missing one of the 4 required columns | same |
| Volunteer Credit Export missing `Full Contact ID` column (production files) | `sop_volunteer_credit_routing.md` |
| Volunteer Credit Export header row 22 not found | same |
| `exceptions.txt` exists but can't be read | `sop_exceptions_format.md` (note: file absent is OK — engine runs with zero exceptions) |

## Operator-facing CSV

After each ingest run, the engine writes `/.tmp/missing_matches_{YYYY-MM-DD}.csv` containing all `ingest_errors` rows from the run, formatted for easy human review:

```
kind, severity, source_file, source_row_number, full_contact_id, sales_rep_id, detail, notes
```

This is a convenience copy. The Supabase table is the authoritative store.

## `ingest_runs` table (parent)

Each invocation of the orchestrator creates one row:

```sql
ingest_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,                   -- 'running' | 'success' | 'partial' | 'failed'
  triggered_by text not null,             -- 'cron' | 'manual' | 'cli'
  source_files jsonb not null,            -- {unify_csv: "path", roster_xlsx: "path", credit_xlsxs: ["path",...], exceptions_txt: "path"}
  volunteers_upserted int,
  errors_count int,
  warnings_count int,
  notes text
);
```

`status = 'partial'` if `errors_count > 0` but the run completed and wrote a coherent volunteers snapshot. `status = 'failed'` if a fatal condition aborted the run.

## What this SOP does NOT cover

- Per-script validation logic → each SOP's "Validation + error handling" section
- Orchestrator sequencing + idempotency → `sop_orchestrator.md`
