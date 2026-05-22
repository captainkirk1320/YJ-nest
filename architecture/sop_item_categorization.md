# SOP — Item → Metric Categorization

**Owner:** `compute_metrics.ts` (item-pattern phase)
**Spec source:** CLAUDE.md §6.3
**Status:** Locked 2026-05-20

---

## Purpose

Given a Unify CSV row's `Item` string, decide which of the 4 metric dimensions it contributes to.

This SOP applies **only to Unify CSV rows**. Salesforce credit rows are routed by block and `Type`/`Campaign` per `sop_volunteer_credit_routing.md` — they do NOT pass through this categorization.

## The 4 metric dimensions

| Dimension | Unit | Threshold |
|---|---|---|
| `totalFundraising` | dollars | $10,000 |
| `rateBowl` | dollars | $2,000 |
| `wishesForTeachers` | dollars | $1,000 |
| `totalPoints` | points | 17,500 pts |

## Categorization is additive

A single Unify row's `Total Sale Value` can flow to multiple metrics. Each pattern that matches contributes the full row value to that metric. **Patterns do not subtract from each other.**

Example: `"Rate Bowl - Minnesota vs New Mexico"` at $500 → adds $500 to `totalFundraising`, $500 to `rateBowl`, AND 500 to `totalPoints` (via the multiplier).

## Match rules

- Case-INSENSITIVE substring match on `Item`.
- First-pattern-wins applies ONLY to disambiguating Rate Bowl parking vs Fiesta Bowl parking (see Note 1 below). Otherwise additive.
- Pattern strings are stored in a Supabase `item_patterns` table for data-not-code editability. Schema: `(pattern, contributes_to_total_fundraising, contributes_to_rate_bowl, contributes_to_wishes_for_teachers, points_multiplier)`.
- Engine falls back to a hardcoded default table when DB is unavailable (probe phase).

## Categorization table (pilot seed)

Order matters for the Rate-Bowl-parking vs Fiesta-Bowl-parking disambiguation; otherwise patterns are tried independently.

| # | Pattern (case-insensitive) | totalFundraising | rateBowl | wishesForTeachers | totalPoints (multiplier) |
|---|---|---|---|---|---|
| 1 | `PARKING - Rate Bowl` | ✅ | ✅ | — | 1.0 |
| 2 | `Rate Bowl` | ✅ | ✅ | — | 1.0 |
| 3 | `Wishes for Teachers` | ✅ | — | ✅ | 1.0 |
| 4 | `Par 3 Challenge` | ✅ | — | — | 1.0 |
| 5 | `Football Kickoff` | ✅ | — | — | 1.0 |
| 6 | `KOE` | ✅ | — | — | 1.0 |
| 7 | `Fiesta Bowl` | ✅ | — | — | 1.0 |
| 8 | (no match — fallthrough) | ✅ | — | — | 1.0 |

### Notes

1. **Rate Bowl vs Fiesta Bowl parking precedence.** The string `"PARKING - Rate Bowl"` matches pattern #1 (Rate Bowl) AND would match a hypothetical `"PARKING - Fiesta Bowl"` would match pattern #7 (Fiesta Bowl). Since both Rate Bowl patterns include the word "Rate Bowl", and "Fiesta Bowl" does not include "Rate Bowl", there's no actual collision. Pattern order #1 → #7 is defensive: if a future pattern is `"PARKING"` alone, the Rate Bowl-specific match must win first.

2. **Rate Bowl matchup variants.** `"Rate Bowl - Minnesota vs New Mexico"` matches pattern #2 (substring). The pattern matcher doesn't care about the matchup specifics. New opponent strings introduce no new categorization work.

3. **All other items fall through to pattern #8** — totalFundraising + totalPoints only. Includes the sample's most common rows like `"Vrbo Fiesta Bowl - CFP Semifinal: Miami vs Ole Miss"` (which DOES match `Fiesta Bowl` → same outcome).

4. **`Club '71` / `Pregame parties` / `Donations` / tickets** — all caught by the fallthrough or by Fiesta Bowl substring. No special-case needed.

## Points multiplier

Defaults to `1.0` for every pattern. Stored as a per-pattern column in `item_patterns` for per-event tuning post-pilot. Engine computes:

```
points_contribution = total_sale_value × points_multiplier
```

For pilot, every Unify row's points contribution equals its dollar contribution to `totalFundraising`. This is intentional and visible in the UI as "1 pt per $1 raised."

## Output: metric contribution record

For each Unify-derived (rep, row) pairing (after multi-rep split), the categorizer produces:

```ts
type MetricContribution = {
  source: 'unify';
  source_file: string;
  source_row_hash: string;
  full_contact_id: string;        // resolved via roster from sales_rep_id
  contribution_dollars: {
    total_fundraising: number;
    rate_bowl: number;
    wishes_for_teachers: number;
  };
  contribution_points: number;    // dollars × points_multiplier
};
```

Salesforce-sourced contributions follow `sop_volunteer_credit_routing.md` and emit:
- Left block → `total_fundraising` dollars + `points` (via multiplier).
- Right block → `points` only.

## What this SOP does NOT cover

- Multi-rep credit splitting (happens BEFORE this step) → `sop_multi_rep_split.md`
- Exception application (happens BEFORE this step) → `sop_exceptions_format.md`
- Thresholds + Good Standing computation → `sop_metrics_and_good_standing.md`
- Tier ladder → `sop_tier_calculation.md`
