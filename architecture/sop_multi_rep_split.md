# SOP — Multi-Rep Credit Split

**Owner:** `apply_exceptions.ts` (SPLIT phase), feeds `compute_metrics.ts`
**Spec source:** CLAUDE.md §6.4, §6.4.1
**Status:** Locked 2026-05-20

---

## Purpose

Given a Unify CSV row that lists N reps, decide how the row's `Total Sale Value` is divided among them, applying any matching `SPLIT` exception or falling back to even-split.

This SOP applies **only to Unify CSV rows**. Salesforce credit rows are already per-volunteer and never split.

## Default rule (UPDATED 2026-05-21 — staff allowlist resolution)

For a Unify row, after `sop_unify_csv_ingest.md` tokenizing produces a list of `sales_rep_id`s, the engine classifies each rep:

| Classification | Source | Receives credit? | Counted in divisor? |
|---|---|---|---|
| Known volunteer | In Master Roster | Yes | Yes |
| Known staff | In `staff_rep_ids` allowlist (`Sales Staff Directory.xlsx`) | No | **No** (silently filtered) |
| Unknown | Neither | No | **No** (filtered) + `unknown_sales_rep_id` warning emitted |

Then:

```
N = count of known volunteer reps on the row
per_volunteer_amount = total_sale_value / N    (if N > 0)
```

Each known volunteer receives `per_volunteer_amount` dollars. Decimal precision is preserved through to final aggregation; rounding happens only at the metric display layer.

**Life Members + Life Directors + Board are treated as known volunteers for split math.** They get their share. (Per CLAUDE.md §6.4.1, their credit is attributed normally; their dollars roll into org-wide totals even though they don't appear in Nest UI.)

### Worked example — staff filtered out

Unify row: `(2041777) Chris Gracey,(200288) Tony Econ`, `Total Sale Value = 2000.00`.

- Token list: `[2041777, 200288]`.
- Classification: `2041777` is in roster (volunteer); `200288` is in `staff_rep_ids` (staff).
- After filtering: known volunteers = `[2041777]`, N = 1.
- Chris Gracey receives the full $2,000.
- No warning emitted (staff allowlist hit is silent).

### Worked example — unknown rep ID

Unify row: `(2041777) Chris Gracey,(9999999) ???`, `Total Sale Value = 2000.00`.

- `9999999` is in neither roster nor allowlist.
- After filtering: known volunteers = `[2041777]`, N = 1. Chris gets $2,000.
- `ingest_errors` warning of kind `unknown_sales_rep_id` emitted with the row hash + the unknown ID. Operator triages: is it real staff to add to the allowlist, or a real volunteer to add to the roster, or a typo?

### Edge case — N = 0 (no known volunteer on the row)

If every rep on a Unify row is staff and/or unknown after filtering, the row has no volunteer to credit. The dollars still happened, so they must count toward org-wide totals.

Behavior:
- Sale value is attributed to a synthetic pseudo-volunteer with `id = 'org_uncredited'` (created lazily on first hit; `has_nest_access = false`, no team, no leaderboard appearance).
- `ingest_errors` row of kind `no_known_volunteer_on_row` (warning) emitted with the rep list, for operator review.
- Org-wide `org_total_fundraising` includes the `org_uncredited` row's metrics (see `sop_metrics_and_good_standing.md` § Org-wide totals).

This preserves the design invariant that **all real revenue counts toward the program goals ($1.5M / $4.2M / $5M)**, while keeping individual leaderboards clean.

## Exception override

For each Unify row, the engine evaluates all `active = true`, `Type = SPLIT` exceptions and checks for a match.

### Match criteria (per exception)

A SPLIT exception MATCHES a Unify row if **all** of the following are true:

1. **Account match.** The Unify row's `Account Name` matches the exception's `Account` field:
   - `Match: exact` → case-insensitive equality.
   - `Match: contains` (default) → case-insensitive substring (`Account` value appears in the Unify `Account Name`).
2. **Item match (if `Item:` key present on exception).** The Unify row's `Item` contains the exception's `Item` substring (case-insensitive).
3. **(Optional) Rep involvement.** Per §6.4, a SPLIT can also be triggered "or any rep involved" — but in V1, **we require account match.** Reasoning: rep-only matching would change the meaning of the rep IDs listed in `Reps:` (which currently denote *recipients*, not *triggers*), and the Manual Tweaks corpus is all account-scoped. Document as an open question if Conor disagrees during seed review.

### Multiple matches

If two or more SPLIT exceptions match the same Unify row → emit `ingest_errors` of kind `ambiguous_split_exception_match` (with the row hash + matching exception IDs). **Use the default even-split as the conservative fallback** and skip both exceptions. Operator must resolve by making one of them more specific (add `Item:` scope) or by deactivating one.

### Single match — apply

The Unify row's `total_sale_value` is split per the `Reps:` percentages:

```
for each rep in exception.reps:
  rep_amount = total_sale_value × (rep.percent / 100)
```

`rep.sales_rep_id` does NOT need to appear in the Unify row's original `Yellow Jacket Rep` tokens. SPLITs can redirect credit to a rep who wasn't originally credited (father/son scenarios per the Manual Tweaks corpus).

All reps named in the exception must be resolvable via the roster (`sop_identity_and_join_model.md`); validation happens at parse time per `sop_exceptions_format.md`.

### No match — default

Use even-split per §"Default rule" above.

## Interaction with `sop_item_categorization.md`

The split happens BEFORE categorization. Sequence per row:

```
1. Tokenize Yellow Jacket Rep → N reps                  (sop_unify_csv_ingest.md)
2. Look up SPLIT exceptions matching this row           (this SOP)
3. Compute per-rep dollar amount                        (this SOP)
4. For each (rep, per-rep-amount), categorize the Item  (sop_item_categorization.md)
5. Resolve rep's sales_rep_id → full_contact_id         (sop_identity_and_join_model.md)
6. Add categorized amounts to volunteer's running totals
```

## Worked examples (from CLAUDE.md §6.5 seed)

### Example 1 — default even-split (no exception)

Unify row: `Yellow Jacket Rep = "(2041782) Andrew Western"`, `Item = "PARKING - Rate Bowl"`, `Total Sale Value = 75.00`.

- N = 1. Per-rep = $75.00 → Andrew.
- Categorization: matches `PARKING - Rate Bowl` → `totalFundraising` +$75, `rateBowl` +$75, `totalPoints` +75.

### Example 2 — multi-rep default split

Unify row: `Yellow Jacket Rep = "(2041777) Life Member Chris Gracey,(2095092) Josh Guinn"`, `Item = "Vrbo Fiesta Bowl - CFP Semifinal: Miami vs Ole Miss"`, `Total Sale Value = 2190.00`.

- N = 2. Per-rep = $1095.00.
- Chris Gracey gets $1095 to `totalFundraising` + `totalPoints` (via Fiesta Bowl categorization). Chris is `Life Member` so his row never surfaces in The Nest, but his contribution counts in org totals.
- Josh Guinn gets the same $1095.

### Example 3 — SPLIT exception (OV-001)

```
ID: OV-001
Active: yes
Type: SPLIT
Account: Patrick Meyer's dad's account
Reps:
  - 2095100 Patrick Meyer: 50%
  - 2095101 Steven Davis: 50%
```

For any Unify row whose `Account Name` contains "Patrick Meyer's dad's account", the engine ignores the row's `Yellow Jacket Rep` tokens and credits Patrick + Steven 50/50 of `Total Sale Value`. Categorization then runs per-rep as usual.

## Edge cases

| Situation | Behavior |
|---|---|
| Unify row has 1 rep, SPLIT exception matches → would redirect to others | Apply the exception. The original sole rep gets no credit unless they're in the `Reps:` list. |
| SPLIT exception lists a rep who isn't in the roster | Parse-time validation rejects the block per `sop_exceptions_format.md`. |
| Unify row's `Yellow Jacket Rep` tokens include an unknown `sales_rep_id`, AND no matching SPLIT exception | Unknown rep is filtered from the divisor; remaining known volunteers split the full sale value among themselves. `unknown_sales_rep_id` warning emitted for operator triage. |
| Unify row contains ONLY staff/unknown reps (N=0 known volunteers) | Sale routed to `org_uncredited` synthetic bucket. Counts toward org totals, not individual leaderboards. `no_known_volunteer_on_row` warning emitted. |
| SPLIT exception matches but lists a staff `sales_rep_id` as a recipient | Parse-time validation rejects the block (per `sop_exceptions_format.md` validation — recipients must be in the roster, not the staff allowlist). |
| Per-rep amount is fractional cents (e.g. $10 / 3) | Preserve full precision in memory. Display rounding is a UI concern. |

## What this SOP does NOT cover

- ADJUST exception application (separate post-pass) → `sop_metrics_and_good_standing.md`
- Parse + validation of exception blocks → `sop_exceptions_format.md`
- Item-pattern categorization → `sop_item_categorization.md`
- Identity resolution → `sop_identity_and_join_model.md`
