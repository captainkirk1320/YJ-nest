# SOP — Tier Calculation

**Owner:** `compute_metrics.ts` (tier-assignment phase)
**Spec source:** `Incentives_for_Yellow_Jackets_-_2025.pdf` (project root); `volunteer-impact-dashboard-v2/src/constants.ts` `INCENTIVE_TIERS`; v2 `IncentiveTier` interface in `volunteer-impact-dashboard-v2/src/types.ts`
**Status:** Locked 2026-05-21. Supersedes the earlier draft that used CLAUDE.md §6.6's legacy Bronze/Silver/Gold/Platinum/Diamond dollar ladder — CLAUDE.md §6.6 needs a follow-up edit to match.

---

## Purpose

Given a volunteer's `metrics.totalPoints` (and `metrics.totalFundraising` for the Walk-On gate), assign the appropriate incentive tier.

## What tiers ARE and AREN'T

**Tiers are a reward/incentive ladder.** A volunteer climbs as they accumulate more points (with one $ gate at the bottom). Each tier unlocks a structured bundle of tickets, swag, experiences, and "choose one" upgrades drawn from the 2025 Yellow Jacket Incentives PDF.

**Tiers are NOT the same as Good Standing.** Per `sop_metrics_and_good_standing.md`:

| Concept | Measures | Threshold(s) | Audience |
|---|---|---|---|
| **Good Standing** | Continued YJ membership for next season | 4 dimensions: $10K fundraising + $2K Rate Bowl + $1K Wishes + 17,500 pts | Yellow Jackets + Futures only |
| **Tier** | Cumulative reward earned this season | 1 dimension (points) + optional $ gate at Walk-On | Anyone with points; surfaced in Nest for YJ + Future |

A volunteer at Walk-On (Tier 1) IS in Good Standing if and only if they also clear the Rate Bowl + Wishes thresholds. A volunteer at Captain (Tier 3, 50K pts) may or may not be in Good Standing — those are independent rollups off the same metrics.

## Disambiguation — "Captain" tier vs "Sales Captain" role

The 3rd tier is named **Captain** (>= 50,000 points). The roster has an unrelated role field `is_sales_captain` (true for the ~10–12 volunteers who lead a team). These are two different things — and the naming convention is now explicit to prevent confusion (Kirk 2026-05-21):

| Field | Meaning | Source |
|---|---|---|
| `is_sales_captain` | **Sales captain** — leads a team's volunteers | Roster boolean (`Master Volunteer Roster.xlsx`) — eventually an SF custom field named `Sales Captain` |
| `tierId = 'captain'` | This volunteer has reached the **Captain tier** (50,000+ points) | Derived from `metrics.totalPoints` by this SOP |

The tier name stays "Captain" because it's product-facing copy in the 2025 Yellow Jacket Incentives PDF and unchangeable. The role got renamed to "Sales Captain" everywhere in engine + schema + UI to remove ambiguity. A sales captain isn't automatically at Captain tier (depends on points), and someone at Captain tier isn't necessarily a sales captain.

## The tier ladder (locked from 2025 PDF + v2 constants)

Stored as data in Supabase `incentive_tiers` table. Pilot seed:

| # | `id` | `name` | `threshold` (pts, Active) | `thresholdFuture` (pts, Future only) | `minFundraising` ($, Active) | `minFundraisingFuture` ($, Future) | `pctOfProgram` | `color` |
|---|---|---|---|---|---|---|---|---|
| 1 | `walk-on`        | Walk-On        | 17,500  | 15,000 | 10,000 | 7,500 | 0.28  | `#8B7355` |
| 2 | `starter`        | Starter        | 30,000  | —      | —      | —     | 0.18  | `#6B9080` |
| 3 | `captain`        | Captain        | 50,000  | —      | —      | —     | 0.10  | `#FEC52E` |
| 4 | `all-conference` | All-Conference | 75,000  | —      | —      | —     | 0.05  | `#4A6FA5` |
| 5 | `all-american`   | All-American   | 100,000 | —      | —      | —     | 0.025 | `#C5283D` |
| 6 | `heisman`        | Heisman        | 200,000 | —      | —      | —     | 0.005 | `#5A189A` |

Rewards (`tickets`, `swag`, `experiences`, `donations`, `chooseOne`) are stored as a `reward jsonb` column. Pilot seed values mirror the PDF + v2 `INCENTIVE_TIERS` array verbatim — see [volunteer-impact-dashboard-v2/src/constants.ts:14-108](volunteer-impact-dashboard-v2/src/constants.ts#L14-L108) for the source.

## Assignment algorithm

```
function tierFor(volunteer) {
  const points  = volunteer.metrics.totalPoints;
  const dollars = volunteer.metrics.totalFundraising;
  const isFuture = volunteer.member_type === 'Future';

  // Walk to highest tier whose thresholds are cleared.
  let result = null;
  for (const t of INCENTIVE_TIERS) {  // ordered low → high
    const pointsThreshold = (isFuture && t.thresholdFuture)
      ? t.thresholdFuture
      : t.threshold;
    const dollarsThreshold = (isFuture && t.minFundraisingFuture != null)
      ? t.minFundraisingFuture
      : (t.minFundraising ?? 0);

    if (points >= pointsThreshold && dollars >= dollarsThreshold) {
      result = t.id;
    }
  }
  return result;  // null if below Walk-On
}
```

### Walk-On's split thresholds (only tier with a $ gate)

- **Active YJ:** 17,500 pts AND $10,000 raised.
- **Future:** 15,000 pts AND $7,500 raised.
- Either dimension short → no tier (`tierId = null`).

Tiers 2–6 are pure points — no $ gate.

### Boundary semantics

- `>=`, not `>`. Exactly 50,000 points = Captain (assuming no Future modifier applies, which it doesn't here).
- Below Walk-On thresholds → `tierId = null`. UI shows "Working toward Walk-On."

### Who gets evaluated

Tiers are computed for **every volunteer** whose `metrics.totalPoints > 0`, including Board / Life Member / Life Director (so the engine can surface tier in admin views). But the Nest UI only displays tier for `has_nest_access = true` volunteers (YJ + Future).

The `org_uncredited` synthetic row does NOT get a tier (`tierId = null` always).

## Editable without deploy

The `incentive_tiers` table is the runtime source of truth. Admins can adjust thresholds, names, colors, reward bundles via direct SQL (or a future admin UI). Engine re-reads on every ingest cycle.

## Out of scope (post-pilot follow-ups)

- **Selection Sunday Individual Incentive** (ping pong ball raffle per the PDF). Separate incentive system tied to total raised + YoY delta. Not a tier. Add in Stream C or later; needs its own SOP if pursued.
- **Future-role $ gate for tiers 2–6.** PDF + v2 constants only show Walk-On with a split Future threshold; the higher tiers don't differentiate. If product later adds Future overrides for higher tiers, the SOP + seed table just need to extend `thresholdFuture` / `minFundraisingFuture` fields per row.

## What this SOP does NOT cover

- Good Standing (4-dimensional binary) → `sop_metrics_and_good_standing.md`
- v2 `levelId` / `compositePoints` (separate concept — internal ranking ladder, deferred to Stream C) → null this session per Decision 2
- The reward-bundle UI rendering — that's a frontend concern; engine just emits `tierId` and the frontend renders from the `incentive_tiers` row
