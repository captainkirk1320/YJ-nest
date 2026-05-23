# SOP — Metrics Aggregation & Good Standing

**Owner:** `compute_metrics.ts`
**Spec source:** CLAUDE.md §6.1, §6.2, §6.2.1, §6.7
**Status:** Locked 2026-05-20

---

## Purpose

Combine all routed contributions (Unify-derived + Salesforce credit-derived) per volunteer, apply ADJUST exceptions, and produce the per-volunteer metric record + Good Standing booleans that flow into the Supabase `volunteers` table.

## Input streams

1. **Unify-derived contributions** (post-split, post-categorization) from `sop_item_categorization.md`.
2. **SF credit-derived dollar contributions** from `sop_volunteer_credit_routing.md` (left block). Multi-dimensional: each contribution names an array of metric dimensions to credit (e.g. a `Race for Wishes` row credits `total_fundraising` + `wishes_for_teachers` + `total_points`).
3. **SF credit-derived points contributions** from `sop_volunteer_credit_routing.md` (right block). Always `[total_points]` only.
4. **ADJUST exceptions** from `sop_exceptions_format.md`.

> **Historical-baseline credits do NOT feed this aggregator.** Files whose `opportunities_date_range` predates the current season window are routed to `compute_historical_baseline.ts` which populates `RosterRow.last_year_fundraising_dollars` + `last_year_fundraising_rank` only. They never touch `metrics.totalFundraising` and never trigger tier / Good Standing / rank recomputation. See `sop_historical_baseline_ingest.md`.

## The 4 metric dimensions

| Dimension | Unit | Formula |
|---|---|---|
| `totalFundraising` | dollars | Σ Unify rows' dollars (per item-categorization rules) + Σ left-block SF credit dollars whose `routing_metrics` includes `total_fundraising` |
| `rateBowl` | dollars | Σ Unify rows' dollars where item matches `Rate Bowl` patterns + Σ left-block SF credit dollars whose `routing_metrics` includes `rate_bowl` |
| `wishesForTeachers` | dollars | Σ Unify rows' dollars where item matches `Wishes for Teachers` + Σ left-block SF credit dollars whose `routing_metrics` includes `wishes_for_teachers` |
| `totalPoints` | points | Σ (Unify row dollars × points_multiplier) + Σ left-block SF credit dollars whose `routing_metrics` includes `total_points` × points_multiplier + Σ right-block SF credit points |

### Important unit details

- `totalFundraising`, `rateBowl`, `wishesForTeachers` are in **dollars**.
- `totalPoints` is in **points** (integer or near-integer; multiplier may produce decimals — round to integer at write time).
- With current `points_multiplier = 1.0`, a $1 Unify donation produces 1 point. A $1 SF Sponsorship also produces 1 point + $1 to fundraising. A right-block SF points row contributes ONLY to points, not fundraising.

### Why SF left-block credits add to BOTH fundraising and points

Per §6.1: `totalFundraising` = Unify revenue + SF sponsorships + SF in-kind + SF direct donations. `totalPoints` = `totalFundraising × multiplier + volunteer_points`. A left-block SF Cash/Sponsorship/In-Kind row is dollars, so it adds to fundraising AND counts toward points via the multiplier.

### Why SF right-block credits do NOT add to fundraising

Right block is Volunteer Points only (Committee Participation, attendance). Per §6.2 RESOLVED ruling: points-denominated rows feed `totalPoints` only.

## Aggregation algorithm

```
For each volunteer V (keyed by full_contact_id):
  Init metrics = {totalFundraising: 0, rateBowl: 0, wishesForTeachers: 0, totalPoints: 0}

  # Phase 1 — sum contributions
  For each contribution C resolved to V:
    if C from Unify:
      metrics.totalFundraising  += C.contribution_dollars.total_fundraising
      metrics.rateBowl           += C.contribution_dollars.rate_bowl
      metrics.wishesForTeachers  += C.contribution_dollars.wishes_for_teachers
      metrics.totalPoints        += C.contribution_points
    elif C from SF left block:
      # routing_metrics is a multi-dim array per sop_volunteer_credit_routing.md.
      # Each named metric receives the FULL amount (additive, not split).
      for m in C.routing_metrics:
        if m == 'total_fundraising':   metrics.totalFundraising  += C.amount_dollars
        elif m == 'rate_bowl':         metrics.rateBowl           += C.amount_dollars
        elif m == 'wishes_for_teachers': metrics.wishesForTeachers += C.amount_dollars
        elif m == 'total_points':      metrics.totalPoints        += C.amount_dollars × points_multiplier
    elif C from SF right block:
      metrics.totalPoints        += C.amount_points

  # Phase 2 — apply ADJUST exceptions
  For each active ADJUST exception E where E lists V's sales_rep_id:
    For each adjustment A in E.adjustments where A.sales_rep_id == V.sales_rep_id:
      metrics[A.metric] += A.amount       # signed, can be negative
```

ADJUSTs are post-pass. They don't pass through item categorization or block routing. They directly add/subtract from the named metric.

## Rounding rule

- Internally: full precision (JavaScript `number`, IEEE 754 double).
- At write time to Supabase:
  - `totalFundraising`, `rateBowl`, `wishesForTeachers` → rounded to 2 decimals (cents).
  - `totalPoints` → rounded to nearest integer.
- Display: UI formats per its own rules; engine writes the rounded canonical value.

## Good Standing

**Good Standing only applies to `member_type ∈ {Yellow Jacket, Future}`.** Board, Life Member, and Life Director volunteers have their thresholds left as **NULL** — the rule doesn't apply to them, and a false boolean would misrepresent the situation as "measured and failing."

For YJ / Future volunteers:

```ts
const thresholds = {
  totalFundraising:    metrics.totalFundraising  >= 10_000,
  rateBowl:            metrics.rateBowl          >=  2_000,
  wishesForTeachers:   metrics.wishesForTeachers >=  1_000,
  totalPoints:         metrics.totalPoints       >= 17_500,
};

const goodStanding = thresholds.totalFundraising
                  && thresholds.rateBowl
                  && thresholds.wishesForTeachers
                  && thresholds.totalPoints;
```

For Board / Life Member / Life Director:

```ts
const thresholds = {
  totalFundraising:    null,
  rateBowl:            null,
  wishesForTeachers:   null,
  totalPoints:         null,
};

// goodStanding is not surfaced for these volunteers.
```

`thresholds` is stored as 4 nullable booleans on the `volunteers` row. The v2 `Volunteer.thresholds` interface needs widening to allow `boolean | null` per field (Stream E frontend work — already on the null-guard list). `goodStanding` is computed at display time as "all four true"; null fields mean "rule does not apply" — UI renders a neutral state, not a failure.

## Output: `volunteers` row (v1 §7.4 contract — this session's scope)

This SOP populates the §7.4 fields:

```ts
{
  id: string,                          // synthetic PK: full_contact_id if present else "rep_"+sales_rep_id
  full_contact_id: string | null,
  sales_rep_id: number | null,
  name: string,                        // from roster
  initials: string,                    // derived
  email: string | null,
  phone: string | null,
  team: string | null,
  teamId: string | null,               // slugified team
  member_type: 'Yellow Jacket' | 'Future' | 'Life Member' | 'Life Director' | 'Board',
  volunteerCategory: string,           // v2 mapping (see §"Member type mapping" below)
  active: boolean,
  has_nest_access: boolean,            // derived: YJ+Future or override
  raised: number,                      // = metrics.totalFundraising
  goal: number | null,                 // 10000 for YJ+Future; null otherwise (no personal goal)
  metrics: {
    totalFundraising: number,
    rateBowl: number,
    wishesForTeachers: number,
    totalPoints: number,
    // currentSprint: NULL — populated by Stream C
  },
  thresholds: {
    totalFundraising: boolean | null,  // null for non-YJ/Future
    rateBowl: boolean | null,
    wishesForTeachers: boolean | null,
    totalPoints: boolean | null,
  },
  tierId: 'walk-on' | 'starter' | 'captain' | 'all-conference' | 'all-american' | 'heisman' | null,  // see sop_tier_calculation.md
  rank: number | null,                 // null for non-Nest-access volunteers
}
```

### Member type mapping to v2 `volunteerCategory`

v2 type uses `'Active' | 'Future' | 'Life Member' | 'Life Director'` (no Board). For Board members, set `volunteerCategory = 'Active'` as the closest non-misleading value, with `has_nest_access = false` keeping them out of the UI. v2 widening (add `'Board'`) is a follow-up reconciliation; not blocking pilot.

### v2 extension fields (NOT populated this session — left genuinely null per Decision 2)

`role`, `signals`, `momentum`, `metrics.currentSprint`, `fundraisingPercentile`, `activityPercentile`, `levelId`, `compositePoints`, `rankDelta7d`, `sprintRank`, `weekPoints` — all NULL.

**Note on `role`:** when Stream C populates this field, the value for a sales captain is `'sales_captain'` (not `'captain'`) — see the role-rename decision 2026-05-21. v2 frontend type widening required in Stream E: `VolunteerRole = 'volunteer' | 'sales_captain' | 'admin'`.

Compute scripts that populate these are out of scope for this session (Stream C in the pilot plan). Engine emits NULL — **never sentinel defaults** like `atRisk: false` or `activeSprintsLast4: 0`.

The v2 frontend MUST handle these nulls gracefully (Stream E null-guard work in the pilot plan).

## Ranking

Rank is computed AFTER all volunteers' metrics are finalized and ADJUSTs are applied:

```
1. Filter to volunteers where has_nest_access = true (YJ + Future + admin overrides).
2. Sort by metrics.totalPoints DESC, then metrics.totalFundraising DESC, then full_name ASC.
3. Assign rank 1..N. Ties on all sort keys get sequential ranks (e.g. dense_rank not used).
```

Board, Life Member, and Life Director volunteers do not receive a rank (they're not in The Nest UI for MVP). Their `rank` field is NULL. Their credit STILL flows into org-wide totals.

## Team rollups

For each team T:

| Team field | Formula |
|---|---|
| `raised` | Σ `metrics.totalFundraising` of T's active+Nest-accessible volunteers |
| `totalPoints` | Σ `metrics.totalPoints` |
| `rateBowl` | Σ `metrics.rateBowl` |
| `wishesForTeachers` | Σ `metrics.wishesForTeachers` |
| `volunteerCount` | count of active+Nest-accessible volunteers |
| `goodStandingCount` | count where all 4 thresholds true |
| `rank` | sort teams by `totalPoints` DESC, tiebreak by `raised` DESC, then team name ASC |
| `goal` | Read from `goals` table (admin-set per team) |

Team rollups EXCLUDE Board, Life Member, and Life Director volunteers (they have no team assignment by definition; consistent with the no-rank rule).

## Org-wide totals

Org-level program goals ($1.5M Fast Start, $4.2M Annual, $5M Stretch — CLAUDE.md §1) sum **every row** in the `volunteers` table, regardless of `member_type` or `has_nest_access`:

```
org_total_fundraising = Σ metrics.totalFundraising across all rows in volunteers
```

This intentionally INCLUDES:
- Board, Life Member, and Life Director contributions (they materially fundraise for the program).
- The synthetic `org_uncredited` row (sale rows where every Unify rep was staff or unknown — see `sop_multi_rep_split.md` N=0 edge case).

Goal progress bars in the Nest UI reflect the full org total, not just YJ/Future totals.

### The `org_uncredited` synthetic row

A single pseudo-volunteer row exists in `volunteers` with `id = 'org_uncredited'`:

```
{
  id: 'org_uncredited',
  full_contact_id: null,
  sales_rep_id: null,
  name: '(Uncredited — staff-closed sales)',
  member_type: null,           // outside the enum; a sentinel for this row only
  active: true,
  has_nest_access: false,      // never shown in any UI
  team: null,
  metrics: { totalFundraising, rateBowl, wishesForTeachers, totalPoints },
  thresholds: { all null },
  goal: null,
  rank: null,
}
```

It's lazily created on first hit and updated idempotently. All filters that drive Nest UI surfaces (`has_nest_access = true`, team rollups, leaderboards) exclude it. Only the org-wide sum reaches it.

## Historical baseline display fields (added 2026-05-22)

`RosterRow.last_year_fundraising_dollars` and `RosterRow.last_year_fundraising_rank` are display-only fields surfaced on the volunteer's Nest profile ("YJ since 2021 · Last year: $25,000 · rank 14"). They are populated by `compute_historical_baseline.ts` from credit-export files whose `opportunities_date_range` predates the current season window.

**Critical separations:**
- The historical baseline NEVER flows into `metrics.totalFundraising`. Last-year dollars are display-only, not current-season metric input.
- The historical baseline NEVER affects tier assignment, Good Standing, or current-season rank.
- If a roster row arrives from `parse_master_roster.ts` with non-null `last_year_fundraising_dollars` (carried in the source xlsx as the legacy "25-26 Dollars" column), and the historical-baseline computation produces a different value, the historical-baseline value wins (it's computed from the canonical source-of-truth credit export). A `roster_baseline_overridden` ingest warning is emitted for diagnostic visibility.
- The historical rank is computed across the union of `full_contact_id` values seen in the historical credit-export file's opportunities block. It does NOT include current-season Unify rows.

Detection and computation rules live in `sop_historical_baseline_ingest.md`.

## What this SOP does NOT cover

- Tier ladder + tier assignment → `sop_tier_calculation.md`
- v2 signals / momentum / sprint metrics → Stream C, deferred
- Writing to Supabase → handled by `write_supabase.ts` (idempotent upsert)
- Ingest error semantics → `sop_ingest_errors.md`
- Historical baseline detection + rank computation → `sop_historical_baseline_ingest.md`
