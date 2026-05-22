# SOP — Momentum Computation

**Owner:** `compute_momentum.ts`
**Spec source:** v2 frontend `VolunteerMomentum` (types.ts); mock semantics in `volunteer-impact-dashboard-v2/src/constants.ts`; the v2 Home + CaptainHome consumers.
**Status:** Locked 2026-05-22 (Stream C)

---

## Purpose

For each volunteer with `has_nest_access === true`, populate the four-field `momentum` object that drives the Home "streak" card and the captain triage hint. Deterministic from the engine's existing inputs — credit records, roster, exceptions, the `pushes` table, and a clock.

For volunteers without Nest access, `momentum = null`.

## The four fields

| Field | Type | Meaning |
|---|---|---|
| `activeSprintsLast4` | integer 0..4 | Of the most recent `min(4, endedPushCount)` ended pushes, how many had ≥1 credit record attributed to this volunteer inside `[startsAt, endsAt)`. |
| `lastActionAt` | ISO date string or null | Max `source_file_timestamp` across credit records attributed to this volunteer. Null when the volunteer has zero credits. |
| `nextMilestoneActions` | integer 0 \| 1 or null | `0` if all four Good Standing thresholds are met, else `1`. `null` for Board / Life Member / Life Director (Good Standing rule does not apply — same gate as `sop_metrics_and_good_standing.md`). |
| `sprintParticipationRate` | float 0..1 or null | `activeSprintsLast4 / min(4, endedPushCount)`. `null` when `endedPushCount === 0`. |

## Data constraints (read this first)

The engine's inputs only carry **batch-level timestamps**, never per-row event times:

- Unify CSV rows have **no date column** (see CLAUDE.md §4.1).
- Credit records carry `source_file_timestamp` parsed from the filename `{TeamMascot}-{YYYY-MM-DD-HH-MM-SS}.xlsx`.

Consequences baked into this SOP:
- "Action" = a credit attribution. `lastActionAt` is the timestamp of the **batch** in which the credit was reported, not the moment the volunteer closed the deal.
- Unify rows cannot pin a sprint window. A `compute_momentum` "active sprint" relies only on credit records.
- Share telemetry does not yet exist as an engine input (see `sop_current_sprint.md`). Momentum says nothing about shares.

These limits are honest: the engine measures what's measurable. The UI must surface what is and isn't tracked (Stream E).

## Algorithm

Inputs:
- `volunteers`: the v1 `compute_metrics` output, already populated with `thresholds`, `has_nest_access`, `member_type`.
- `creditRecords`: the full set from `parse_volunteer_credit.ts`, AFTER `filterToLatestCreditBatchPerTeam` (so superseded batches don't double-count).
- `pushes`: rows from the `pushes` table. Each has `startsAt`, `endsAt`, `active`.
- `now`: injected `Date` (defaults to `new Date()`).

Steps:

```
1. Filter pushes: endedPushes = pushes where endsAt <= now, sorted by endsAt DESC.
   recentEnded = endedPushes.slice(0, 4)
   denom = recentEnded.length    // 0..4

2. For each volunteer V where has_nest_access === true:
   a. credits_for_V = creditRecords where full_contact_id resolves to V (via roster).
   b. lastActionAt = max(credits_for_V.source_file_timestamp) or null.
   c. activeSprintsLast4 = count of pushes P in recentEnded where
      ∃ credit in credits_for_V with P.startsAt <= credit.source_file_timestamp < P.endsAt
   d. sprintParticipationRate = denom > 0 ? activeSprintsLast4 / denom : null
   e. nextMilestoneActions:
      - null if member_type ∈ {Board, Life Member, Life Director}
      - 0 if all 4 thresholds === true
      - 1 otherwise
   f. V.momentum = { activeSprintsLast4, lastActionAt, nextMilestoneActions, sprintParticipationRate }

3. For each volunteer V where has_nest_access === false:
   V.momentum = null
```

## Edge cases

| Case | Behavior |
|---|---|
| Volunteer has zero credits | `lastActionAt = null`, `activeSprintsLast4 = 0`, `sprintParticipationRate = null` (if denom=0) or `0` (if denom>0). |
| Zero ended pushes | `activeSprintsLast4 = 0`, `sprintParticipationRate = null`. The Nest UI must render "no sprint history yet" — not "0%." |
| A credit's `source_file_timestamp` exactly equals a push's `endsAt` | Excluded from that push (half-open interval `[startsAt, endsAt)`). Belongs to whichever push it falls into next, or to none. |
| `lastActionAt` ISO string format | Same string the credit parser emits: `YYYY-MM-DDTHH:MM:SS` derived from the filename timestamp. No timezone normalization needed for pilot — all timestamps are in the foundation's local clock. |
| `org_uncredited` synthetic row | `has_nest_access = false`, so `momentum = null`. |

## Output type widening

The engine's `VolunteerOutput.momentum` widens from `null` to:

```ts
type VolunteerMomentum = {
  activeSprintsLast4: number;
  lastActionAt: string | null;
  nextMilestoneActions: number | null;
  sprintParticipationRate: number | null;
} | null;
```

Note `lastActionAt`, `nextMilestoneActions`, and `sprintParticipationRate` are each nullable inside the object. The v2 frontend currently types them as non-null primitives; Stream E will widen those to allow null and add null-guards in the Home + CaptainHome consumers.

## What this SOP does NOT cover

- Share counts (no engine source yet).
- `weekPoints`, `sprintRank`, `rankDelta7d` — out of scope per the Stream C scope memo (require historical snapshots).
- Per-share or per-action telemetry (deferred until The Nest writes share events to Supabase, post-pilot).
- Picking which push is "current" — see `sop_current_sprint.md`.
