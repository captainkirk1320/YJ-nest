# SOP — Current-Sprint Aggregation

**Owner:** `compute_current_sprint.ts`
**Spec source:** v2 `SprintMetrics` interface; v2 mock fixtures in `constants.ts`; CLAUDE.md §6.8 (push = time-bounded campaign window); the `pushes` table in `001_core_tables.sql`.
**Status:** Locked 2026-05-22 (Stream C)

---

## Purpose

Find the single currently-active `pushes` row (if any) and aggregate per-volunteer dollars + points within `[startsAt, endsAt)` into `volunteers.metrics.currentSprint`.

## "Active push" definition

A push P is **active at `now`** when **all** of the following hold:

1. `P.active === true` (admin-toggled flag).
2. `P.startsAt <= now < P.endsAt`.

If multiple pushes match, pick the one with the most recent `startsAt` (tiebreak: lex order on `id`, descending — last-created wins). If none match, every volunteer's `currentSprint` is `null`.

The Nest UI assumes at most one active push at a time. Multiple active pushes is an operator misconfiguration; the engine resolves it deterministically rather than failing.

## Algorithm

Inputs:
- `volunteers`: v1 output, with synthetic IDs populated.
- `creditRecords`: post-`filterToLatestCreditBatchPerTeam`.
- `roster`: for resolving `full_contact_id → volunteer_id`.
- `pushes`: rows from the `pushes` table.
- `now`: injected clock.

Steps:

```
1. activePush = pick_active_push(pushes, now)        // see above
   if activePush is null:
     for every volunteer V: V.currentSprint = null
     return

2. windowStart = activePush.startsAt
   windowEnd   = activePush.endsAt

3. Initialize, per volunteer V where has_nest_access:
   acc[V.id] = { fundraisingThisSprint: 0, pointsThisSprint: 0 }

4. For each credit record C where windowStart <= C.source_file_timestamp < windowEnd:
   resolve V from C.full_contact_id (via roster).
   skip if V is null or has_nest_access === false.
   if C.source_block === 'opportunities':
     acc[V.id].fundraisingThisSprint += C.amount_dollars
     acc[V.id].pointsThisSprint      += C.amount_dollars * points_multiplier  (1.0 for pilot)
   else if C.source_block === 'volunteer_points':
     acc[V.id].pointsThisSprint      += C.amount_points

5. For each volunteer V:
   if V.has_nest_access:
     V.currentSprint = {
       sprintId:                 activePush.id,
       fundraisingThisSprint:    round2(acc[V.id].fundraisingThisSprint),
       pointsThisSprint:         round(acc[V.id].pointsThisSprint),
       sharesThisSprint:         null,            // see "Shares" below
     }
   else:
     V.currentSprint = null
```

## Why Unify rows are not aggregated here

Unify CSV rows have no per-row date (§4.1). They cannot be assigned to a push window. Including them would double-count credit that's also in the SF Volunteer Credit Export, and would arbitrarily attribute them based on file mtime.

Sprint dollars therefore measure **only SF-credited dollars in window**. This is conservative and honest: it surfaces the credits we can pin to a window. When Unify gains a per-row date (post-pilot data improvement) or when the engine starts persisting per-ingest snapshots, the sprint dollars rule widens.

## Shares

`sharesThisSprint` is **null** for the entire pilot. The engine has no share telemetry source today — shares are produced by the Nest UI's "Share" action and need a Supabase write path that does not yet exist.

Per the no-sentinels rule (Decision 2026-05-20):
- Emitting `0` would imply "we looked, there were zero shares" — false, since we never looked.
- Emitting `null` correctly says "this dimension is not yet measured."

The v2 frontend consumers already null-coalesce (`?? 0`); Stream E widens the `SprintMetrics.sharesThisSprint` type to `number | null` and surfaces "shares not yet tracked" where useful.

When share telemetry lands (post-pilot), `compute_current_sprint` becomes the place to roll it up into `sharesThisSprint`.

## Output type widening

```ts
type VolunteerCurrentSprint = {
  sprintId: string;
  fundraisingThisSprint: number;
  pointsThisSprint: number;
  sharesThisSprint: number | null;
} | null;
```

Engine writes this object into `volunteers.metrics.currentSprint`.

## Edge cases

| Case | Behavior |
|---|---|
| No pushes in DB | All `currentSprint = null`. |
| Multiple `active=true` pushes overlapping `now` | Pick the one with the latest `startsAt` (tiebreak by id desc). Log a `warn`-level orchestrator line — not an `ingest_errors` row — since the engine resolved deterministically. |
| Push with `startsAt > now` (future-dated) | Not active, ignored. |
| Push with `endsAt <= now` (ended) | Not active here. Counted by `compute_momentum.activeSprintsLast4`. |
| Credit batch timestamp exactly at `windowEnd` | Excluded (half-open window). |
| `org_uncredited` synthetic row | `has_nest_access = false`, so `currentSprint = null`. Its dollars are out-of-band by design and shouldn't appear in any sprint leaderboard. |
| Volunteer has no credits in window | `currentSprint = { sprintId, fundraisingThisSprint: 0, pointsThisSprint: 0, sharesThisSprint: null }`. Distinct from `currentSprint = null` (no active push). |

## What this SOP does NOT cover

- The historical-sprint snapshot table (post-pilot — needed for `sprintRank` and `weekPoints`).
- Share telemetry ingest (out of scope until the Nest UI writes share events).
- Push admin tooling (Stream D).
