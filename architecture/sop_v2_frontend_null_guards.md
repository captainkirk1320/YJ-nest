# SOP — v2 Frontend Null-Guard Convention

**Owner:** `volunteer-impact-dashboard-v2/`
**Spec source:** Decision 2026-05-20 "no sentinel defaults"; `sop_orchestrator.md` § Step 7 "Stream C opt-in contract"; `sop_metrics_and_good_standing.md` § "v2 extension fields"; `sop_tier_calculation.md` § "Captain tier vs Sales Captain role"
**Status:** Locked 2026-05-22

---

## Purpose

The reconciliation engine emits **genuine `null`** for every v2 extension field whose compute hasn't run. The v2 frontend MUST render every one of those nullable surfaces gracefully — without crashes, and without sentinel values that misrepresent "not yet measured" as "measured and zero/false."

This SOP is the binding contract for that convention.

## The hard rule

> **An engine `null` means "this attribute has not been measured." Render a neutral fallback. Never substitute a confident value like `false`, `0`, `0%`, "Today", or "On a roll."**

A sentinel default tells the user a determination has been made about them. For a Board member or Life Director — where Good Standing does not apply at all — that's actively misleading. For a Yellow Jacket pre-Stream-C, it falsely declares them "failing."

## Nullable fields the frontend must handle

| Field on `Volunteer` | Type | Emitted as `null` when… |
|---|---|---|
| `role` | `VolunteerRole \| null` | Stream C `derive_role` hasn't run |
| `signals` | `VolunteerSignals \| null` | `compute_signals` hasn't run |
| `momentum` | `VolunteerMomentum \| null` | `compute_momentum` hasn't run |
| `metrics.currentSprint` | `SprintMetrics \| null` | `compute_current_sprint` hasn't run, or no active push |
| `thresholds.*` (each of 4) | `boolean \| null` | volunteer is Board / Life Member / Life Director / `org_uncredited` (Good Standing doesn't apply) |
| `tierId` | `string \| null` | volunteer hasn't cleared Walk-On |
| `fundraisingPercentile`, `activityPercentile` | `number \| null` | derived-percentile compute deferred |
| `levelId`, `compositePoints`, `rankDelta7d`, `sprintRank`, `weekPoints` | `number \| null` | historical-snapshot streams deferred |
| Nested `signals.signalReason` | `string \| null` | signal computed but no human-readable reason emitted |
| Nested `momentum.lastActionAt`, `nextMilestoneActions`, `sprintParticipationRate` | nullable | partial momentum |
| Nested `currentSprint.sharesThisSprint`, `currentSprint.rank` | nullable | sub-metric not yet measured |

## Neutral-fallback table

| Surface | When the source is `null`, render… |
|---|---|
| Signal pill (badge) | **Nothing** (do not render the pill). A "no signal" badge would imply a check ran. |
| Triage bucket count (Rising/Coasting/At risk) | Member excluded from every bucket; bucket-empty text shown. |
| `signalReason` "Why" panel in NudgeModal | Panel hidden. |
| Sprint shares aggregate | "shares not yet measured" (not `0 shares this sprint`). |
| Per-member sprint shares line | Omit the `· N shares this sprint` suffix entirely, or render `· shares not yet measured` when the sprint *was* measured but a sub-metric is null. |
| `momentum.activeSprintsLast4`, `lastActionAt` cells | Em-dash `—`, with secondary line `Not yet measured`. |
| Avatar Good-Standing progress ring + % readout | Ring empty; readout `—` rather than `0%`. |
| Threshold pill (Dollars/Rate/Wish/Pts) | Neutral border-only styling (`bg-surface text-text-secondary border border-border`) — distinct from `bg-warning` (measured + missed) and `bg-success` (measured + cleared). |
| Met-thresholds counter (`X/4`) | `met/measured` where `measured` = count of non-null thresholds. If `measured === 0`, render `—`. |
| Standings hero (`STANDINGS_BY_USER` miss) | Replace the whole hero block with "Standings · Not yet measured" placeholder card. |
| Tier badge | Hide (no tier badge). |
| `tierId` in copy | Omit tier from "X pts to tier Y" string. |

## Branch-render safety

A render that uses `if (signals.X)` is **also** wrong when `signals === null`. Every conditional that reads a v2 field must collapse the null branch into the false branch only when the SOP says so (e.g., "treat a missing signal as 'don't display the pill'"). When the null branch carries different meaning than the false branch (e.g., thresholds — null = doesn't apply; false = applies and missed), the two MUST render differently.

### Threshold counting — the canonical pattern

```ts
const measured = Object.values(v.thresholds).filter(t => t != null);  // ignore null
const met      = measured.filter(t => t === true);
const allMeasured = measured.length === 4;
const inGoodStanding = allMeasured && met.length === 4;
```

Never use `Object.values(v.thresholds).every(Boolean)` — `null` is falsy, so the function silently returns `false` for Board / Life Member rows that should be EXCLUDED from the Good Standing rollup, not counted as failing.

## Captain tier vs Sales Captain role — UI copy invariant

The 50,000-point reward tier is named **Captain** (`tierId === 'captain'`). This is locked product copy from the 2025 Yellow Jacket Incentives PDF.

The team-lead **role** is named **Sales Captain** (`role === 'sales_captain'`). Renamed 2026-05-21 explicitly to remove ambiguity.

UI copy rules:

| Source | Surface | Allowed copy |
|---|---|---|
| `tier.name` for `tierId === 'captain'` | Tier ladder, "your tier" hero | "Captain" — unchanged. |
| Role badge for `role === 'sales_captain'` | Team page member row | "Sales Captain" |
| Anywhere both could appear | Disambiguate with prefix ("Sales Captain badge" vs "Captain tier"). |

**Forbidden:** rendering "Captain" as a role badge anywhere (e.g., hardcoding the badge to a specific user id). The badge must read from `member.role` and display "Sales Captain."

## Engine contract reminders

- The engine emits `null`, never sentinels (`atRisk: false`, `activeSprintsLast4: 0`, etc.). See `execution/src/compute_metrics.ts` for the v1 contract and `sop_metrics_and_good_standing.md` for the rule.
- Stream C opt-in: `orchestrate({ streamC: { pushes, adminVolunteerIds?, now? }, … })`. Without `streamC`, every Stream C field stays `null` on the way out.
- TypeScript enforcement: the v2 frontend's `tsconfig.json` enables `strictNullChecks` so the compiler catches missing guards. Do not disable it.

## Test discipline

Every component that reads a nullable v2 field has a dedicated `renders gracefully when X is null` test in `volunteer-impact-dashboard-v2/src/__tests__/`. Two anti-patterns to refuse during review:

1. Tests that assert a sentinel value (`expect(...).toHaveTextContent('0 shares this sprint')`) when the source is null. The right assertion is the neutral fallback (`shares not yet measured`).
2. Tests that swap `getByText` for `getAllByText` to dodge a duplicate-render failure without checking whether the duplicate is the symptom of a real bug. Use `getAllByText` only when the duplicate is meaningful (e.g., the same em-dash deliberately rendered for both "sprints active" and "last action").

`npm test` from `volunteer-impact-dashboard-v2/` runs the whole suite. `npm run lint` runs `tsc --noEmit`. Both must be green before merging.

## What this SOP does NOT cover

- Engine null emission rules → `sop_metrics_and_good_standing.md`, `sop_tier_calculation.md`
- Stream C compute scripts themselves → `sop_role.md`, `sop_signals.md`, `sop_momentum.md`, `sop_current_sprint.md`
- Live data wiring (Supabase auth, /api/chat, real Stream C run) → out of scope for the pilot ordering gate this SOP closes
