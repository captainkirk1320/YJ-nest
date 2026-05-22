# SOP — Salesforce Volunteer Credit Export Routing

**Owner:** `parse_volunteer_credit.ts`
**Spec source:** CLAUDE.md §4.3, §6.2.1, §7.3 — superseded in part by 2026-05-20 Decision 1 (see Rationale)
**Status:** Locked 2026-05-20

---

## Purpose

Parse the Salesforce-generated Volunteer Credit Export(s) and route each row to one or more metric dimensions per the rules in `sop_metrics_and_good_standing.md`.

## Rationale — why this SOP supersedes the literal §4.3 spec

CLAUDE.md §4.3 originally described a unified single-row shape with `Full Contact ID | Contact Full Name | Opportunity: Opportunity Name | Amount Credited | Type | Volunteer Job: Volunteer Job Name | Volunteer Job: Campaign`.

The actual file produced by the Salesforce report is **two side-by-side blocks in one sheet**, one file per team. Kirk's hard constraint (no extra Conor work) locks this shape as production. CLAUDE.md §4.3 will be updated in a follow-up edit to match.

Key reconciliations from §4.3:
- "Route each row by Type + Campaign" → becomes "route each row by **which block** it appears in, plus Type (left block) or Campaign (right block)."
- "Full Contact ID required" → still required. Kirk will add the column to the SF report before pilot ingest. Parser refuses to run against a file lacking the column.

## Input contract

| File | Source | Cadence |
|---|---|---|
| `{TeamMascot}-{timestamp}.xlsx` (one file per team) | Conor downloads from Salesforce → drops into shared directory | Manual / scheduled (frequency TBD) |

Filename mascot is a hint, not authoritative. Volunteer team comes from the roster.

## File structure (observed in `2026-27 Gorlocks-2026-05-18-14-34-26.xlsx`)

| Row range | Content |
|---|---|
| 1–18 | Report metadata + applied filter descriptors (team filter, date range, position filter). **Ignore.** |
| 19 | Blank separator. |
| 20 | Block labels (`Contacts with Custom Object` repeated for both blocks). |
| 21 | Sub-block labels (`Yellow Jacket Credit- Opportunities` left, `Volunteer Points` right). |
| **22** | **Header row.** |
| 23 → N | Data rows. |
| N+1 → end | One `Total` row per block, then `Confidential` + copyright footer. **Ignore.** |

### Header row 22 (current sample, pre-`Full Contact ID` addition)

| Col | Label |
|---|---|
| B | `Contact Full Name` (left block) |
| C | `Opportunity: Opportunity Name` |
| D | `Amount Credited` |
| E | `Type` |
| F | `Contact Full Name` (right block) |
| G | `Volunteer Job: Volunteer Job Name` |
| H | `Volunteer Points` |
| I | `Volunteer Job: Campaign` |

### Header row 22 (production target — after Kirk adds Full Contact ID)

The parser expects `Full Contact ID` columns inserted into both blocks. Final layout (column letters approximate):

| Block | Columns | Required |
|---|---|---|
| **Left — Opportunities (dollars)** | `Full Contact ID`, `Contact Full Name`, `Opportunity: Opportunity Name`, `Amount Credited`, `Type` | Yes |
| **Right — Volunteer Points (points)** | `Full Contact ID`, `Contact Full Name`, `Volunteer Job: Volunteer Job Name`, `Volunteer Points`, `Volunteer Job: Campaign` | Yes |

Parser identifies blocks by matching the header label strings, not by fixed column letters.

## Block routing (decision tree)

Per Codex review 2026-05-20, routing is **block-based**, not row-based.

### Left block — Opportunities (dollars)

Every row in the left block represents a Salesforce-recorded dollar credit. Routes to `totalFundraising` + `totalPoints` (the latter via the points multiplier per `sop_metrics_and_good_standing.md`).

**Cash routing is allowlist-driven** (Codex condition 4). Engine routes a left-block row to dollars ONLY if its `Opportunity: Opportunity Name` appears in the allowlist for the row's `Type`. Unknown opportunity names → `ingest_errors` of kind `unallowlisted_opportunity_name`, row skipped.

Allowlist storage: Supabase `volunteer_credit_allowlist` table (`type`, `opportunity_name_pattern`, `routing` enum {`dollars`, `ignore`}). Seeded from the sample + any names Conor/Kirk classify before pilot. Editable without a deploy.

| `Type` | Default behavior in absence of allowlist match |
|---|---|
| `Sponsorship` | Auto-allowlist (always route to dollars; safe per §6.1). |
| `In-Kind` | Auto-allowlist (always route to dollars). |
| `Cash` | **Requires explicit allowlist entry.** Unknown → `ingest_errors`. |
| (other) | `ingest_errors` of kind `unknown_credit_type`. |

Pilot seed entries (locked starter list):
```
type=Cash,opportunity_name_pattern=AI Help,routing=dollars
```
(Extend as you and Conor classify additional named opportunities.)

### Right block — Volunteer Points

Every row in the right block represents Salesforce-recorded volunteer points. Routes to `totalPoints` only (does NOT add to `totalFundraising`).

Campaign validation:

| `Volunteer Job: Campaign` | Behavior |
|---|---|
| Contains `"Committee Participation Points"` | Route to `totalPoints` (the expected case). |
| Anything else | `ingest_errors` of kind `unexpected_points_campaign`, row skipped. |

The points UI distinction between "attendance" and "general volunteer" hours (`sop_metrics_and_good_standing.md`) is a presentation slice — driven by `Volunteer Job: Volunteer Job Name` patterns at display time, not at ingest. Engine does not pre-split this stream.

## Normalized output records

The parser yields TWO record types:

```ts
type CreditDollarsRecord = {
  source_file: string;
  source_block: 'opportunities';
  source_row_number: number;
  source_row_hash: string;
  full_contact_id: string;
  contact_full_name_raw: string;      // for diagnostics only
  opportunity_name: string;
  amount_dollars: number;
  type: 'Cash' | 'Sponsorship' | 'In-Kind' | string;
};

type CreditPointsRecord = {
  source_file: string;
  source_block: 'volunteer_points';
  source_row_number: number;
  source_row_hash: string;
  full_contact_id: string;
  contact_full_name_raw: string;
  volunteer_job_name: string;
  amount_points: number;
  campaign: string;
};
```

## Multi-file ingest (one file per team)

Orchestrator (`sop_orchestrator.md`) globs `{TeamMascot}-*.xlsx` from the shared directory. Each file is parsed independently. Records from all files merge into a single stream keyed by `full_contact_id`.

**Dedup key** (Codex condition c):
```
(full_contact_id, source_block, normalized_opportunity_or_job_name, amount, source_file_fingerprint+timestamp)
```
Where `source_file_fingerprint+timestamp` is the export timestamp embedded in the filename. Two ingests of the same export = identical fingerprints = dedup wins. A newer export (different timestamp) supersedes prior batches per `sop_orchestrator.md`.

### Same-timestamp ties for a team (Codex F4, added 2026-05-22)

If two distinct files for the same team mascot carry the SAME latest timestamp but different fingerprints, the engine cannot deterministically pick a winner. `compute_metrics.filterToLatestCreditBatchPerTeam` **drops both batches** for that team and emits a single `ambiguous_credit_batch_timestamp` warning naming the offending files. The team's SF subtotals stay at zero for the run; the operator resolves by deleting one file or amending its filename timestamp. Full detail in `sop_orchestrator.md` § Same-timestamp ties.

## File-team vs roster-team mismatch (Codex condition b)

For every credit record, after resolving `full_contact_id` → roster row, compare the roster's `team` to the team mascot in the filename.

- Match → silent OK.
- Mismatch → `ingest_errors` of kind `file_team_mismatch`. Credit still flows to the resolved volunteer; mismatch is a data-quality flag.

## Validation + error handling

| Condition | Action |
|---|---|
| File missing the `Full Contact ID` column on either block | **Hard fail.** Engine refuses to run. |
| Header row 22 not found (file structure changed) | **Hard fail.** |
| Row has empty `Full Contact ID` | `ingest_errors` of kind `missing_full_contact_id_on_credit_row`, skip. |
| Row's `Full Contact ID` not in roster | `ingest_errors` of kind `unknown_full_contact_id`, skip. |
| Left-block `Amount Credited` not a number, or ≤ 0 | `ingest_errors` of kind `non_positive_amount_credited`, skip. |
| Right-block `Volunteer Points` not a non-negative integer | `ingest_errors` of kind `invalid_volunteer_points`, skip. |
| Left-block Cash row with unallowlisted opportunity name | `ingest_errors` of kind `unallowlisted_opportunity_name`, skip. |
| Right-block row with unexpected Campaign | `ingest_errors` of kind `unexpected_points_campaign`, skip. |

## What this SOP does NOT cover

- How a routed record becomes a metric → `sop_metrics_and_good_standing.md`
- Exception application (SPLITs/ADJUSTs apply to Unify rows, NOT to SF credit rows in V1) → `sop_exceptions_format.md`, `sop_multi_rep_split.md`
- Identity join mechanics → `sop_identity_and_join_model.md`
