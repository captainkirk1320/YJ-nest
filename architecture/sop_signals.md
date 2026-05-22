# SOP — Signals (At-Risk / Coasting / Rising)

**Owner:** `compute_signals.ts`
**Spec source:** v2 frontend `VolunteerSignals`; CaptainHome triage bucketing (`tabs/CaptainHome.tsx`); AdminDashboard signal filters (`tabs/AdminDashboard.tsx`); mock semantics in `constants.ts`.
**Status:** Locked 2026-05-22 (Stream C)

**Depends on:** `sop_momentum.md`, `sop_current_sprint.md` (signals reads both fields off the volunteer row).

---

## Purpose

For each volunteer with `has_nest_access === true`, assign a single signal state — `atRisk`, `coasting`, `rising`, or none — that drives captain triage and admin filtering. Deterministic from `momentum`, `currentSprint`, and a clock.

For volunteers without Nest access (Life Member, Life Director, Board, `org_uncredited`): `signals = null`. The signal rule does not apply.

## Output shape

```ts
type VolunteerSignals = {
  rising: boolean;
  coasting: boolean;
  atRisk: boolean;
  signalReason: string | null;   // human-readable summary; null when no signal fires
} | null;
```

**Mutual exclusion invariant:** at most one of the three booleans is `true` per volunteer. When none fire, all three are `false` and `signalReason = null` — "no signal" is a real, neutral state, not an error.

## Rule precedence

Evaluated **top-to-bottom**; first match wins; rules below the match are skipped.

| Priority | Rule | Sets | Reason template |
|---|---|---|---|
| 1 | `atRisk` rule (below) | `atRisk: true` | "No tracked activity in {N} days" (or "No tracked activity recorded" if `lastActionAt` is null) |
| 2 | `coasting` rule (below) | `coasting: true` | "{N} days since last tracked activity" |
| 3 | `rising` rule (below) | `rising: true` | "{activeSprintsLast4} of last {denom} sprints active" |
| 4 | none | all three `false` | `null` |

Mutual exclusion is by construction — once a higher-priority rule fires, lower-priority rules don't evaluate.

## Definitions

Let:
- `daysSince(lastActionAt)` = floor((now - lastActionAt) / 86_400_000). If `lastActionAt` is null, `daysSince = +Infinity`.
- `participation` = `momentum.sprintParticipationRate` (may be null).
- `sprintDollars` = `currentSprint?.fundraisingThisSprint ?? null`.

## The atRisk rule (priority 1)

Fires when **both** hold:
- `daysSince(lastActionAt) >= 21`
- `participation === null || participation === 0`

Rationale: the volunteer has been credit-silent for three weeks AND has missed every recent sprint (or there is no sprint history to vouch for them). The captain should reach out.

## The coasting rule (priority 2)

Fires when `daysSince(lastActionAt) >= 14` (and `atRisk` did not fire).

Rationale: two weeks quiet but not yet three. Still recoverable with a nudge.

## The rising rule (priority 3)

Fires when **all** hold:
- `daysSince(lastActionAt) <= 7`
- `sprintDollars !== null && sprintDollars > 0`
- `participation !== null && participation >= 0.75`

Rationale: active in the last week, contributing to the current sprint, and consistent across recent sprints. Captain can amplify with a "keep it up" nudge.

## None (priority 4)

Anything else. Examples that land here intentionally:
- Recent action but no current-sprint dollars yet (e.g., new push just started).
- Current-sprint dollars but only 1 of last 4 sprints active (inconsistent — not yet rising).
- 8–13 days quiet (between rising's freshness window and coasting's threshold).

Neutral is a feature: it keeps signal noise low so `rising`/`coasting`/`atRisk` mean something.

## Gating: who gets signals at all

Signals fire **only** for volunteers where:
- `has_nest_access === true`, AND
- `member_type ∈ {Yellow Jacket, Future}`.

Board members with override-granted Nest access still get `signals = null` for MVP — they're not subject to Good Standing or the activity triage, and a "coasting" badge on a Board member would be misleading. Stream D may revisit if it becomes useful.

## Worked examples (against the v2 mock fixture)

The v2 mock fixtures in `constants.ts` are illustrative, not normative — the rules above are the canonical truth. Some mock volunteers therefore land in a different bucket under the engine's deterministic rules than the hand-curated fixture text suggests. This is expected and acceptable.

Cross-check (with `now = 2026-05-22`):

| Mock | lastActionAt | days | participation | sprintDollars | Engine signal | Fixture signal | Diverges? |
|---|---|---|---|---|---|---|---|
| u-2 Elena | 2026-05-18 | 4 | 1.00 | 6800 | rising | rising | — |
| u-4 Michael | 2026-05-18 | 4 | 1.00 | 4200 | rising | rising | — |
| u-5 Jamie | 2026-04-26 | 26 | 0.00 | 0 | atRisk | atRisk | — |
| u-6 Devon | 2026-04-30 | 22 | 0.00 | 0 | atRisk | atRisk | — |
| u-3 Sarah | 2026-05-07 | 15 | 0.25 | 0 | coasting | coasting | — |
| u-7 Riley | 2026-05-04 | 18 | 0.50 | 200 | coasting | coasting | — |
| u-8 Casey | 2026-05-18 | 4 | 0.75 | 2400 | rising | rising | — |
| u-1 Kirk | 2026-05-17 | 5 | 0.75 | 3400 | rising | none | yes |

Kirk diverges because the engine's rules don't have an "approaching but not yet meeting Good Standing" suppressor that the fixture author applied. Under the engine, Kirk is rising. Stream E may add a Captain-specific UI suppression if that turns out to matter; the engine emits the deterministic signal regardless.

## Edge cases

| Case | Behavior |
|---|---|
| `lastActionAt` null and `participation` null (no credits, no ended pushes) | `daysSince = +∞`, `participation === null` → atRisk fires. Reason: "No tracked activity recorded". |
| Volunteer has currentSprint but `currentSprint.fundraisingThisSprint = 0` | rising can't fire (gate). Falls through to none unless coasting/atRisk catches them. |
| `momentum === null` (no Nest access) | `signals = null`. |
| Identical inputs across runs | Identical outputs (deterministic; no randomness; no time-of-day dependence beyond the injected `now`). |

## Output type widening

The engine's `VolunteerOutput.signals` widens from `null` to `VolunteerSignals` (defined above). The v2 frontend's `VolunteerSignals.signalReason` is already optional; Stream E adds the null-coalesce in CaptainHome (already present: `m.signals.signalReason ?? '—'`).

## What this SOP does NOT cover

- Nudge template selection (already lives in `constants.ts:NUDGE_TEMPLATES`; Stream E wires templates to signal types).
- The `good_standing` / `milestone` signal kinds named in `types.ts:SignalKind` — not on this surface; reserved for future expansion.
- Historical signal stability (e.g., "atRisk for 3 weeks running") — requires snapshot table (post-pilot).
- Telemetry of signal transitions for analytics (post-pilot).
