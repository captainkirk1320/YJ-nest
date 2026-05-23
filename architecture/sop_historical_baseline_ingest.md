# SOP — Historical Baseline Ingest

**Owner:** `compute_historical_baseline.ts`
**Spec source:** Kirk locked decisions 2026-05-22 (multi-team credit export + historical baseline routing); CLAUDE.md §4.2 fields `last_year_fundraising_dollars` + `last_year_fundraising_rank`
**Status:** Locked 2026-05-22

---

## Purpose

A Volunteer Credit Export from Salesforce can cover any date window. When Conor exports a file whose date filter is the **prior season**, that file is a *historical baseline* — it should populate the roster's "last year" display fields without contaminating current-season metrics, tiers, Good Standing, or rank.

This SOP defines:
1. How a credit-export file is classified as historical vs current.
2. What gets extracted from the historical file (opportunities block aggregate per volunteer, plus rank).
3. How the result merges into `RosterRow.last_year_fundraising_dollars` + `last_year_fundraising_rank`.
4. What the engine does NOT do with historical files (the negative space).

## Classification

After `parse_volunteer_credit.ts` produces `CreditFileMetadata`, the orchestrator inspects each file's `opportunities_date_range.end`:

| `opportunities_date_range.end` | Classification |
|---|---|
| null OR unparseable | **Current.** Fall back to legacy current-season ingest. Emit `credit_filter_unreadable` warning. |
| ≥ `SEASON_YEAR-01-01` | **Current.** Route to `compute_metrics.ts`. |
| < `SEASON_YEAR-01-01` | **Historical.** Route to `compute_historical_baseline.ts`. Skip `compute_metrics.ts` for these records. |

`SEASON_YEAR` is read from the `SEASON_YEAR` env var; default = current calendar year (`new Date().getFullYear()`). Example: for the 2026-27 Fiesta Bowl season, set `SEASON_YEAR=2026`.

> **Pilot deferral (Q7):** Engine trusts the file's date range verbatim. No validation against an expected season window. Follow-up with Conor after the first production run.

### Why use the Opportunities (left-block) date range only

Right-block volunteer points are never used to populate `last_year_fundraising_dollars` (that field is dollar-denominated). The points block's `Planned Start Date & Time` filter on row 14 is captured in `points_date_range` for diagnostics only.

## Inputs

```ts
type HistoricalBaselineInput = {
  creditRecords: CreditRecord[];   // pre-filtered to records from historical files
  roster: Roster;
  errors: IngestErrorCollector;
};
```

`creditRecords` includes BOTH blocks from the historical file (the parser doesn't pre-strip the points block), but only the **left block (Opportunities)** is used by this SOP. Right-block records from a historical file are silently discarded (last-year points are not a baseline display field).

## Algorithm

```
1. For each CreditDollarsRecord (left block) in input:
     - Resolve full_contact_id → roster row.
     - If unknown FCID: already flagged by parser as unknown_full_contact_id; skip.
     - Accumulate per_fcid_dollars[full_contact_id] += amount_dollars.
       (Note: routing_metrics is ignored for baseline aggregation — every left-block
       dollar contributes to the baseline regardless of which current-season
       dimensions it would route to. The "did we raise $25k last year?" question
       is about ALL fundraising dollars credited to the volunteer, not just the
       slice that would have hit a specific metric.)

2. Compute rank across the per_fcid_dollars map:
     - Sort entries by dollars DESC, tiebreak by full_contact_id ASC (deterministic).
     - Assign rank 1..N to each entry.
     - Only volunteers in the historical file get a rank — current-season-only
       volunteers (no historical credits) get null.

3. Merge into roster:
     For each (fcid, dollars, rank) in computed map:
       row = roster.by_full_contact_id.get(fcid)
       if row is null: already flagged; skip
       if row.last_year_fundraising_dollars != null and != dollars:
         emit roster_baseline_overridden warning naming both values
       row.last_year_fundraising_dollars = dollars
       row.last_year_fundraising_rank = rank
```

## Multiple historical files

The expected cadence is **0 or 1 historical file per past season** in any given run. When more than one historical file is detected:

| Case | Behavior |
|---|---|
| Multiple historical files with the same `opportunities_date_range.end` year | Apply `compute_metrics` supersede logic on the historical track separately: latest `source_file_timestamp` wins, older files dropped. |
| Multiple historical files spanning DIFFERENT prior-season windows (e.g., 2024-25 AND 2023-24 in the same run) | Process each prior-season window independently. The most recent historical file (by `opportunities_date_range.end`) populates `last_year_*`. Older windows are currently ignored for MVP (`last_two_years_*` is a post-MVP enhancement). Emit `multiple_historical_seasons_detected` warning naming the dropped windows. |

## What this SOP explicitly does NOT do

- Does NOT add historical credits to `metrics.totalFundraising`, `metrics.rateBowl`, `metrics.wishesForTeachers`, or `metrics.totalPoints`.
- Does NOT recompute tier, Good Standing, or current-season rank using historical data.
- Does NOT process the historical file's right block (volunteer points).
- Does NOT validate the historical date range against a roster-provided "since year" or any other constraint.
- Does NOT write back to Salesforce.

## Output contract

The output is mutation of `RosterRow` instances in-place:
- `last_year_fundraising_dollars: number | null`
- `last_year_fundraising_rank: number | null`

Downstream (`compute_metrics.ts` → `VolunteerOutput`) currently ignores these fields. Surface in the v2 frontend is a separate Stream E task (display "Last year: $X · rank Y").

## Error / warning kinds emitted

| Kind | Severity | Condition |
|---|---|---|
| `roster_baseline_overridden` | warning | Roster row carries a non-null `last_year_fundraising_dollars` (legacy roster column) that disagrees with the computed value. Computed wins. |
| `multiple_historical_seasons_detected` | warning | More than one prior-season window in a single run. Only the most recent prior season populates `last_year_*`. |
| `credit_filter_unreadable` | warning | Already emitted by the parser if the date-range row was absent/unparseable — file falls back to current-season ingest. |

## Idempotency

Historical-baseline computation is purely a function of the historical credit file's content. Re-running the orchestrator with the same input produces identical `last_year_*` values. The supersede mechanic ensures amended historical files override prior batches deterministically.

## What this SOP does NOT cover

- Detecting + parsing the file structure → `sop_volunteer_credit_routing.md`
- Current-season aggregation → `sop_metrics_and_good_standing.md`
- Orchestrator wiring → `sop_orchestrator.md` § Historical-baseline routing
- Identity join mechanics → `sop_identity_and_join_model.md`
