# SOP — Orchestrator

**Owner:** `orchestrator.ts`
**Spec source:** CLAUDE.md §2 (A.N.T. mapping), §8 invariants
**Status:** Locked 2026-05-20

---

## Purpose

Define the end-to-end sequence in which atomic scripts run during a single ingest cycle, the idempotency contract, and the contract for partial-failure handling.

## Sequence

```
┌──────────────────────────────────────────────────────────────┐
│ 1. INIT — create ingest_runs row, status='running'           │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. PREFLIGHT                                                 │
│   - parse_master_roster.ts → Roster                          │
│   - parse_staff_directory.ts → StaffAllowlist                │
│   - Roster preflight checks (fail-closed on fatals)          │
│   - parse_exceptions.ts → ParsedException[]                  │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. INGEST SOURCE FILES                                       │
│   - parse_unify_csv.ts → UnifyRow[]                          │
│   - parse_volunteer_credit.ts → CreditRecord[]               │
│     (iterates over all {TeamMascot}-*.xlsx in shared dir)    │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. APPLY EXCEPTIONS (SPLIT)                                  │
│   - apply_exceptions.ts: for each UnifyRow, match SPLITs,    │
│     produce per-rep dollar allocations                       │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. CATEGORIZE + RESOLVE IDENTITY                             │
│   - For each per-rep allocation: item categorization →       │
│     contribution; resolve sales_rep_id → full_contact_id     │
│   - For each CreditRecord: route by block + Type/Campaign;   │
│     resolve full_contact_id → roster row                     │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. AGGREGATE + APPLY ADJUST                                  │
│   - compute_metrics.ts: sum contributions per volunteer,     │
│     apply ADJUST exceptions, compute thresholds + Good       │
│     Standing + tier + rank, build team rollups               │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. WRITE                                                     │
│   - write_supabase.ts: idempotent upsert volunteers + teams  │
│     + ingest_errors + exceptions mirror + ingest_run         │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. FINALIZE                                                  │
│   - Write /.tmp/missing_matches_{date}.csv                   │
│   - Update ingest_runs row: status, counts, finished_at      │
└──────────────────────────────────────────────────────────────┘
```

## Idempotency contract

**Invariant (CLAUDE.md §8):** re-running ingestion with the same input produces the same output.

### How each layer enforces it

| Layer | Dedup key | Why this works |
|---|---|---|
| Unify rows | `(source_file, source_row_hash)` | Same CSV row = same hash. Re-ingesting the same file produces the same set of normalized records. |
| SF credit rows | `(full_contact_id, source_block, normalized_opportunity_or_job_name, amount, source_file_fingerprint+timestamp)` | Codex condition (c). Re-ingesting same file → same key. Different export timestamp = new batch, supersedes prior. |
| Exceptions | `(exceptions.txt sha256, exception.id)` | If file content unchanged, no upsert. If changed, full re-sync of the `exceptions` table for that file's content hash. |
| Volunteers / Teams | full row upsert keyed by `full_contact_id` / team slug | Deterministic outputs from deterministic inputs. Re-run = same row contents. |
| `ingest_errors` | `(ingest_run_id, kind, source_file, source_row_hash, full_contact_id)` | One row per (run, error). Different runs = different rows; same run, same problem = single row. |

### Superseding batches

When a credit-export file shows up with a NEWER `{timestamp}` for the same `{TeamMascot}` than a previously-ingested file:

1. Engine ingests the new file.
2. Records from the OLD file's batch for that team are NOT auto-deleted — they remain in the `contributions` table tagged with their `source_file_fingerprint`.
3. compute_metrics excludes superseded batches: for each `(full_contact_id, team)`, the latest file timestamp wins; older batch contributions are filtered out at aggregation time.

This means amendments don't double-count and old data isn't silently destroyed.

## Partial-failure handling

| Condition during run | Behavior |
|---|---|
| A non-fatal `ingest_errors` row (severity `error` or `warning`) fires | Continue. Don't abort the run. |
| A fatal condition fires (per `sop_ingest_errors.md`) | Abort. Update `ingest_runs.status = 'failed'`. Do NOT write the volunteers/teams snapshot. Previous successful snapshot remains the truth. |
| Engine crashes mid-run (uncaught exception) | The `ingest_runs` row stays at `status='running'`. A janitor on next start marks any `running` rows older than 30 minutes as `failed` and the previous successful snapshot remains the truth. |

The Nest UI reads only the latest `status IN ('success', 'partial')` snapshot. Failed runs are invisible to volunteers.

## Source-file discovery

For pilot: shared local directory (configurable via `INGEST_SOURCE_DIR` env var; defaults to `Process Documentation/` for dev).

Files the orchestrator expects:

| Glob | Required? | Notes |
|---|---|---|
| `Report Data - *.csv` | yes | Latest-by-filename Unify export. Older files in the same directory are ignored. |
| `26-27 Full Roster.xlsx` (pilot) / future single-sheet `Master Volunteer Roster.xlsx` | yes | Latest by mtime. |
| `Sales Staff Directory.xlsx` (project root, not Process Documentation) | no | Foundation sales staff allowlist. If absent, run with empty allowlist (every non-roster ID emits `unknown_sales_rep_id` warning). |
| `*-*.xlsx` matching `{TeamMascot}-{timestamp}.xlsx` | yes (≥ 1) | All teams. Filenames are pattern-matched against known team mascots (loaded from Supabase `teams` table). |
| `exceptions.txt` | no | If absent, run with zero exceptions. Logged as a warning. |

Post-pilot: discovery swaps from local directory to SharePoint Graph API via the `ReportSource` interface (CLAUDE.md §3 / decisions.md).

## Triggering modes

| Mode | How |
|---|---|
| Manual CLI | `tsx execution/orchestrator.ts` (operator at terminal during pilot) |
| Manual UI | Drag-and-drop upload in Nest admin tab (post-pilot) → uploads to Supabase Storage → invokes Edge Function that runs the orchestrator |
| Scheduled | Supabase Edge Function on a cron (post-pilot, once SharePoint Graph API access lands) |

For this session: only the CLI mode is in scope. UI + cron are downstream streams in the pilot plan.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | `ingest_runs.status = 'success'` |
| 1 | `ingest_runs.status = 'partial'` (warnings or row-level errors but a coherent snapshot was written) |
| 2 | `ingest_runs.status = 'failed'` (fatal abort) |
| 3 | Unhandled exception (caught by top-level try/catch and re-logged before exit) |

## Logging

- Structured JSON to stdout via a thin logger (`info`, `warn`, `error` levels).
- Every log line includes `ingest_run_id`.
- Errors that produce `ingest_errors` rows ALSO log a single `warn` line per row (so an operator tailing the CLI sees them in real time).

## What this SOP does NOT cover

- Individual script logic → respective SOPs
- Supabase schema → `execution/sql/*.sql`
- The pilot CLI vs production cron trigger → CLAUDE.md §9 (TBD in Phase T)
