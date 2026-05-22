# SOP — Unify CSV Ingest

**Owner:** `parse_unify_csv.ts`
**Spec source:** CLAUDE.md §4.1, §7.1
**Status:** Locked 2026-05-20

---

## Purpose

Parse the Unify / SeatGeek transactional export into a normalized stream of `(sales_rep_id, item, account_name, total_sale_value)` tuples, ready to flow into multi-rep split (`sop_multi_rep_split.md`) and item categorization (`sop_item_categorization.md`).

## Input contract

| File | Source | Cadence |
|---|---|---|
| `Report Data - YYYY-MM-DDTHHMMSS.csv` | Unify / SeatGeek scheduled export → SharePoint | Scheduled (frequency TBD with Conor) |

Header row 1, then data rows. Quoted CSV with embedded commas. **Must be parsed with a proper RFC-4180-aware CSV parser (`csv-parse` with `relax_column_count: false`); do NOT split on commas.**

## Column shape

| Column | Type | Notes |
|---|---|---|
| `Yellow Jacket Rep` | string | One or more `(repId) Display Name` tokens, comma-joined. Display Name may itself contain spaces and titles like `"Life Member Chris Gracey"`. |
| `Item` | string | Free-form product name; drives categorization. |
| `Total Sale Value` | decimal as string | Up to 4 decimal places, e.g. `"2190.0000"`. Parse to `number` after trimming. Reject `NaN` to `ingest_errors`. |
| `Account Name` | string | Buyer. May be `Last, First` (commas are inside the quoted field) or a company name like `"Osborn Maledon P.A.,"` (note trailing comma observed in sample). |

## Tokenizing `Yellow Jacket Rep`

The column is the trickiest part of the file. Examples observed in `Process Documentation/Report Data - 2026-05-18T140432.139.csv`:

```
"(2041777) Life Member Chris Gracey,(2095092) Josh Guinn"
"(2041782) Andrew Western"
"(100270) Sean Ward"
```

### Tokenizer algorithm

1. After CSV parsing yields a single string for the field, split it on the literal `,(` boundary that separates reps (because each rep token begins with `(`). Re-prepend `(` to the second-onward tokens.
   - More robust alternative (use this): match the regex `/\((\d+)\)\s*([^,(]+?)(?=(?:,\(|$))/g` against the field. Capture group 1 = rep ID, group 2 = display name (trimmed).
2. For each match, normalize:
   - `sales_rep_id` = parse capture group 1 as integer.
   - `display_name` = trim trailing whitespace + commas from capture group 2.
3. If zero matches → emit `ingest_errors` of kind `unparseable_yellow_jacket_rep` with the raw field; SKIP this CSV row.
4. If matches found → produce one (rep, full-row-context) record per matched rep. Credit splitting is done in `sop_multi_rep_split.md`.

### Edge cases this regex must handle

- **Title prefixes inside the display name** — `"Life Member Chris Gracey"`, `"Future Daniel Akmon"`, `"Board Brian Bednar"`, etc. **Accept the whole prefix as opaque part of `display_name`; never parse it, never cross-check it against the roster's `member_type`.** The rep ID is the only join key. Reasoning (confirmed by Kirk 2026-05-20): the prefix is whatever Unify renders; the source of truth for category is the roster.
- **Honorifics with periods** — accept any non-comma, non-paren characters.
- **Trailing whitespace** — trim.
- **Numbers in the name** (e.g. `"John Doe III"`) — fine; the rep ID is in parens, the name regex is greedy up to next `,(` or end.
- **Single rep with no comma** — must still match.
- **Empty field** — emit `ingest_errors`, skip row.
- **Rep ID is not numeric** — never observed; if seen, emit `ingest_errors`, skip row.

### Display name is OPAQUE

The captured `display_name` is stored for diagnostics only. The engine never reads it for routing, joining, or validation. Two reasons:
1. Prefixes (`Life Member`, `Future`, etc.) are inconsistent across Unify exports and can change without notice.
2. The roster's `member_type` is the canonical category for every volunteer; trusting Unify's prefix could mask roster-out-of-date situations.

## Account name parsing

Do NOT attempt to split `Last, First`. The buyer's name is metadata for the missing-match log and for exception matching (`sop_exceptions_format.md`). Engine stores it as a single opaque string.

## Normalized output row

The parser yields a stream of records. One record per (CSV row × rep) pairing.

```ts
{
  source_file: string,             // basename of the CSV
  source_row_number: number,       // 1-indexed including header
  source_row_hash: string,         // sha256 of the raw row text — used for idempotency
  sales_rep_id: number,
  display_name_raw: string,        // for human review only, never a join key
  item: string,
  total_sale_value: number,        // dollars
  account_name: string,
  rep_count_on_row: number,        // total reps on the row, for default even-split (see sop_multi_rep_split.md)
}
```

The parser does NOT compute the split here. It emits one record per rep on the row, with `rep_count_on_row` so the splitter knows the divisor. The splitter is responsible for default even-split or exception-driven override.

## Validation + error handling

| Condition | Action |
|---|---|
| File missing or 0 rows | Hard fail; engine refuses to start an ingest cycle without source data. |
| Header row missing one of the 4 required columns | Hard fail. |
| Row has malformed CSV (unclosed quote, etc.) | `ingest_errors` of kind `malformed_csv_row`, SKIP row, continue. |
| `Total Sale Value` not parseable to a number | `ingest_errors` of kind `unparseable_sale_value`, SKIP row. |
| `Total Sale Value` ≤ 0 (refunds / corrections) | `ingest_errors` of kind `non_positive_sale_value`, SKIP row. Pilot scope does not handle refunds — flag for manual review. |
| `Yellow Jacket Rep` empty or unparseable | `ingest_errors` of kind `unparseable_yellow_jacket_rep`, SKIP row. |
| Identical row (same source_row_hash) seen in a prior ingest cycle | Idempotent skip — do not re-emit. (Dedup happens in the writer; the parser still emits, the writer is the de-duper.) |

## What this SOP does NOT cover

- Mapping `sales_rep_id` → roster row → `full_contact_id` → `sop_identity_and_join_model.md`
- Splitting credit across multiple reps → `sop_multi_rep_split.md`
- Categorizing the `item` into metric dimensions → `sop_item_categorization.md`
- Applying exception blocks → `sop_exceptions_format.md`
