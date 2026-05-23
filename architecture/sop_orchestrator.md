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
│     (iterates over credit-export xlsx files in shared dir;   │
│      multi-team-per-file model — see § Source-file discovery)│
│   - compute_historical_baseline.ts splits historical files   │
│     out of the current-season stream and produces a          │
│     last-year-dollars / last-year-rank map merged into       │
│     RosterRow before compute_metrics runs.                   │
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
│ 7. STREAM C COMPUTE  (opt-in, gated on streamC?: opts)       │
│   When `OrchestrateOptions.streamC` is supplied, these run   │
│   in order against the VolunteerOutput[] produced by step 6: │
│   - compute_momentum.ts      → momentum (sop_momentum.md)    │
│   - compute_current_sprint.ts → currentSprint                │
│         (sop_current_sprint.md; needs PushRecord[])          │
│   - compute_signals.ts       → signals (sop_signals.md;      │
│         depends on momentum + currentSprint)                 │
│   - derive_role.ts           → role (sop_role.md; uses       │
│         roster.is_sales_captain + admin allowlist)           │
│   When `streamC` is omitted (v1 contract), the four fields   │
│   stay genuinely `null` per the no-sentinel rule.            │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. WRITE                                                     │
│   - write_supabase.ts: idempotent upsert volunteers + teams  │
│     + ingest_errors + exceptions mirror + ingest_run         │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 9. FINALIZE                                                  │
│   - Write /.tmp/missing_matches_{date}.csv                   │
│   - Update ingest_runs row: status, counts, finished_at      │
└──────────────────────────────────────────────────────────────┘
```

### Stream C opt-in contract (added 2026-05-22)

Step 7 is conditional. The v1 §7.4 output contract leaves `role`, `signals`, `momentum`, and `currentSprint` as genuine `null` — Stream C runs only when the caller explicitly passes a `StreamCOptions` bundle:

```ts
type StreamCOptions = {
  pushes: PushRecord[];                     // currentSprint window source
  adminVolunteerIds?: Set<string>;          // promotes role to 'admin'
  now?: Date;                               // injectable clock for tests
};
```

Source files: `execution/src/derive_role.ts`, `compute_momentum.ts`, `compute_current_sprint.ts`, `compute_signals.ts`. Each has a matching `architecture/sop_*.md` cross-referenced in the box above. The four scripts mutate the `VolunteerOutput[]` from step 6 in-place; team rollups are NOT recomputed (Stream C is per-volunteer enrichment only).

The remaining v2 fields (`levelId`, `compositePoints`, `rankDelta7d`, `sprintRank`, `weekPoints`, `fundraisingPercentile`, `activityPercentile`) require historical snapshots and stay `null` until a future Stream is built — see `sop_metrics_and_good_standing.md` § "v2 extension fields."

## Idempotency contract

**Invariant (CLAUDE.md §8):** re-running ingestion with the same input produces the same output.

### How each layer enforces it

| Layer | Dedup key | Why this works |
|---|---|---|
| Unify rows | `(source_file, source_row_hash)` | Same CSV row = same hash. Re-ingesting the same file produces the same set of normalized records. |
| SF credit rows | `(full_contact_id, source_block, normalized_opportunity_or_job_name, amount, source_file_fingerprint+timestamp)` | Codex condition (c). Re-ingesting same file → same key. Different export timestamp = new batch, supersedes prior. Multi-team-per-file ingest (2026-05-22) leaves the row-level key unchanged — supersession partitions by `source_file_timestamp` globally, not per team. |
| Exceptions | `(exceptions.txt sha256, exception.id)` | If file content unchanged, no upsert. If changed, full re-sync of the `exceptions` table for that file's content hash. |
| Volunteers / Teams | full row upsert keyed by `full_contact_id` / team slug | Deterministic outputs from deterministic inputs. Re-run = same row contents. |
| `ingest_errors` | `(ingest_run_id, kind, source_file, source_row_hash, full_contact_id)` | One row per (run, error). Different runs = different rows; same run, same problem = single row. |

### Superseding batches

When a credit-export file shows up with a NEWER `{timestamp}` than a previously-ingested file (multi-team-per-file mode, 2026-05-22):

1. Engine ingests the new file.
2. Records from the OLD file's batch are NOT auto-deleted — they remain in the `contributions` table tagged with their `source_file_fingerprint`.
3. compute_metrics excludes superseded batches **globally**: the latest `source_file_timestamp` across ALL current-season credit files wins (multi-team and legacy alike); older batches are filtered out at aggregation time. There is no per-team partitioning under the multi-team model — Codex DIM-6 lockdown 2026-05-22.

Historical-baseline files (see `sop_historical_baseline_ingest.md`) are routed out of this stream before the supersede filter runs. They have their own per-prior-season-window supersession — within a given prior-season year window, latest `source_file_timestamp` wins; older historical batches for the same year are dropped.

This means amendments don't double-count and old data isn't silently destroyed.

### Same-timestamp ties (Codex F4, added 2026-05-22; logic retained in multi-team mode)

If two distinct credit-export files share the latest `{timestamp}` with different fingerprints, the engine cannot deterministically pick a winner. Behavior:

1. `compute_metrics.filterToLatestCreditBatch` detects the tie by counting distinct `source_file_fingerprint` values for the latest `source_file_timestamp`.
2. **Both batches are dropped** — no records flow through to aggregation. SF credit subtotals stay at zero for the run.
3. A single `ambiguous_credit_batch_timestamp` `ingest_errors` row is emitted with `detail.source_files` listing the offending filenames.
4. Operator resolves by deleting one file or amending its filename timestamp, then re-running.

> **Single-file caveat (2026-05-22):** Under Conor's current single-file delivery cadence, same-timestamp ties are unlikely (a second file would require Conor to manually re-export and rename simultaneously). The tie-detection logic remains active as a defensive guard. If pilot operations confirm a steady single-file cadence, the tie check is essentially dormant — but harmless.

Rationale: the SOP defines no tie-break semantics, and silently keeping both files would double-count credit. Fail-closed-with-warning preserves correctness without halting the run.

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
| `*-YYYY-MM-DD-HH-MM-SS.xlsx` Volunteer Credit Export files (multi-team per file, 2026-05-22+) | yes (≥ 1) | Identified by filename ending in `-YYYY-MM-DD-HH-MM-SS.xlsx` AND first-sheet content containing both block-anchor labels (`Opportunity: Opportunity Name`, `Volunteer Job: Volunteer Job Name`) on the same header row. Team mascot is NOT parsed from filename — team scope is read from inside the file's filter-descriptor rows. See `sop_volunteer_credit_routing.md` § File-level metadata. The orchestrator inspects each candidate file's first sheet to confirm it is a credit export (not e.g. a roster or unrelated xlsx in the same directory). |
| `exceptions.txt` | no | If absent, run with zero exceptions. Logged as a warning. |

Post-pilot: discovery swaps from local directory to SharePoint Graph API via the `ReportSource` interface (CLAUDE.md §3 / decisions.md).

## Historical-baseline routing (added 2026-05-22)

After Step 3 ingest, every Volunteer Credit Export's `opportunities_date_range` is inspected. The orchestrator partitions the credit-file set into two streams:

| Stream | Detection rule | Destination |
|---|---|---|
| **Current-season** | `opportunities_date_range.end` falls on or after `SEASON_YEAR-01-01` (or date range is null/unparseable) | Step 6 `compute_metrics` (legacy path) |
| **Historical-baseline** | `opportunities_date_range.end` is strictly before `SEASON_YEAR-01-01` | `compute_historical_baseline.ts` — populates `RosterRow.last_year_fundraising_dollars` + `last_year_fundraising_rank` only |

`SEASON_YEAR` defaults to the current calendar year and is overridable via the `SEASON_YEAR` env var (e.g. `SEASON_YEAR=2026` for the 2026-27 Fiesta Bowl season).

Historical-baseline data does NOT merge into `metrics.totalFundraising` and does NOT trigger tier/Good Standing/rank recomputation. The current snapshot is for prior-season display in the Nest UI (e.g., "Last year: $25,000 · rank 14"). See `sop_historical_baseline_ingest.md`.

> **Pilot deferral (Q7):** Date-range vs `SEASON_YEAR` validation (warning the operator when a file's filter window doesn't match expectations) is deferred. For pilot, the engine trusts whatever's in the file. Follow-up: revisit with Conor after first production run to define expected windows per cadence.

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
