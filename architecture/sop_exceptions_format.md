# SOP — exceptions.txt Format & Parsing

**Owner:** `parse_exceptions.ts` and `apply_exceptions.ts`
**Spec source:** CLAUDE.md §4.4, §6.4, §6.5, §8 invariants
**Status:** Locked 2026-05-20

---

## Purpose

Define the source-of-truth format for human-curated reconciliation overrides, how the engine parses + validates them, and the runtime mirror in Supabase.

## Source of truth

`exceptions.txt` in the shared SharePoint folder. Edited directly by foundation staff (Conor + Dan). Plain text, version-controlled by SharePoint. **No admin UI.** **No Salesforce custom object.** Naming is locked and deliberate: `exceptions` = the curated rules; `ingest_errors` = the error log; the two are distinct concepts.

## Block format

Each exception is one block separated from neighbors by a line of exactly `---`. A block has key-value lines, optionally with a multi-line list under `Reps:` or `Adjustments:`.

### Required keys (all blocks)

| Key | Type | Notes |
|---|---|---|
| `ID` | string | Unique within the file. Convention: `OV-001`, `OV-002`, … |
| `Added` | ISO date `YYYY-MM-DD` | Audit trail. |
| `Active` | `yes` / `no` | `no` → block is parsed but NOT applied (kept for history). |
| `Type` | `SPLIT` or `ADJUST` | Operation. |
| `Account` | string | Free-form description used for matching (see §"Matching"). May be exact or fuzzy depending on `Match` (see Optional keys). |
| `Notes` | string | Free-form. Required for audit; engine doesn't read it. |

### Optional keys

| Key | Type | Notes |
|---|---|---|
| `Item` | string | If present, scopes the exception to Unify rows where `Item` substring-matches this value. If absent, matches all items for the account. |
| `Match` | `exact` / `contains` | How `Account` is matched against the Unify `Account Name` field. Default: `contains` (case-insensitive substring). |

### `Type: SPLIT` body

```
Reps:
  - 2095100 Patrick Meyer: 50%
  - 2095101 Steven Davis: 50%
```
- Each rep referenced by `sales_rep_id` (numeric). Display name follows the ID for human readability — **engine ignores the name.**
- Percentages MUST sum to 100 (±0.01 tolerance).
- Reps that do NOT appear in the Unify row's `Yellow Jacket Rep` token list are still valid recipients — `SPLIT` can redirect credit to anyone. (Confirm with Conor; sample tweaks suggest this is intended for father/son redirects.)

### `Type: ADJUST` body

```
Adjustments:
  - 2095102 Eric Barkyoumb: -800 rate_bowl
  - 2095103 Kerry Cummiskey: +800 rate_bowl
```
- One line per adjustment.
- Format: `{sales_rep_id} {display_name}: {±amount} {metric}`
- `metric` ∈ `total_fundraising`, `rate_bowl`, `wishes_for_teachers`, `total_points` (snake_case mandatory).
- Signed integer or decimal dollar amount (points are integer-only for `total_points`).
- Adjustments are NOT row-scoped — they apply to the volunteer's totals as a post-pass. `Account` + `Item` keys are metadata for audit; engine does not use them to scope ADJUSTs to specific Unify rows.

## Parsing algorithm

1. Read `exceptions.txt`. Split on `\n---\n` (and tolerate `\r\n`). Discard empty blocks.
2. For each block:
   a. Parse key-value lines. Keys are case-insensitive, values are trimmed.
   b. Parse `Reps:` / `Adjustments:` indented list if present.
   c. Validate (see below).
   d. If valid → emit a parsed exception record.
   e. If invalid → emit one `ingest_errors` row of kind `malformed_exception_block` (with the block ID and reason). The rest of the file is processed normally.

## Validation (per-block, fail-closed)

| Check | Failure mode |
|---|---|
| `ID`, `Added`, `Active`, `Type`, `Account`, `Notes` all present | Missing key → `ingest_errors`, block skipped. |
| `Type` ∈ {`SPLIT`, `ADJUST`} | Unknown → `ingest_errors`, block skipped. |
| `Active` ∈ {`yes`, `no`} | Other → `ingest_errors`. |
| `ID` is unique in the file | Duplicate ID → `ingest_errors`, ALL blocks with this ID skipped (not just the second one). |
| SPLIT: `Reps:` body present, ≥ 1 entry | Empty → `ingest_errors`. |
| SPLIT: every rep's `sales_rep_id` is in the roster | Unknown ID → `ingest_errors`, block skipped. |
| SPLIT: percentages sum to 100 (±0.01) | Off-sum → `ingest_errors`, block skipped. |
| ADJUST: `Adjustments:` body present, ≥ 1 entry | Empty → `ingest_errors`. |
| ADJUST: every rep's `sales_rep_id` is in the roster | Unknown ID → `ingest_errors`. |
| ADJUST: metric ∈ {`total_fundraising`, `rate_bowl`, `wishes_for_teachers`, `total_points`} | Unknown metric → `ingest_errors`, block skipped. |
| ADJUST: signed numeric amount | Unparseable → `ingest_errors`. |

A block that fails any validation is **NOT** mirrored to the Supabase `exceptions` table. The file remains the source of truth; the cache only carries valid blocks.

## Parsed exception record (in-memory shape)

```ts
type ParsedException =
  | {
      id: string;
      added_date: string;
      active: boolean;
      type: 'SPLIT';
      account: string;
      account_match: 'exact' | 'contains';
      item: string | null;
      reps: Array<{ sales_rep_id: number; percent: number }>;
      notes: string;
    }
  | {
      id: string;
      added_date: string;
      active: boolean;
      type: 'ADJUST';
      account: string;
      account_match: 'exact' | 'contains';
      item: string | null;
      adjustments: Array<{
        sales_rep_id: number;
        amount: number;
        metric: 'total_fundraising' | 'rate_bowl' | 'wishes_for_teachers' | 'total_points';
      }>;
      notes: string;
    };
```

## Supabase mirror

Every successful ingest cycle upserts the parsed-and-valid blocks into the Supabase `exceptions` table. Schema:

```sql
exceptions (
  id text primary key,
  added_date date not null,
  active boolean not null,
  type text not null check (type in ('SPLIT','ADJUST')),
  account text not null,
  account_match text not null default 'contains',
  item text,
  body jsonb not null,           -- the reps[] or adjustments[] array
  notes text,
  source_file_hash text not null,
  ingested_at timestamptz default now()
);
```

The Nest UI reads this table to display the active rule set (audit / transparency). The text file remains the only place an operator EDITS.

## Application — see `sop_multi_rep_split.md`

This SOP defines the parse + storage. The actual application of SPLIT / ADJUST against Unify rows lives in `sop_multi_rep_split.md` (SPLIT) and the post-pass in `sop_metrics_and_good_standing.md` (ADJUST).

## What this SOP does NOT cover

- Default even-split when no exception matches → `sop_multi_rep_split.md`
- How ADJUSTs combine with computed metrics → `sop_metrics_and_good_standing.md`
- Whether SF credit-export rows can be exception-overridden → **NO** in V1. Exceptions apply to Unify CSV rows + post-pass adjustments only. SF credit rows are taken as-is.
