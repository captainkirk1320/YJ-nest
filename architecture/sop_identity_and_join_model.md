# SOP — Identity & Join Model

**Owner:** Engine ingest layer
**Spec source:** CLAUDE.md §4.0, §4.2, §4.3, §8 invariants
**Status:** Locked 2026-05-20 (Phase L Decision 1)

---

## Purpose

Define the canonical way the engine identifies a volunteer across every source file. Every other SOP depends on this one. If join logic is wrong here, every downstream metric is wrong.

## Invariant

**The engine joins on IDs, never on names.** Names are display-only, derived from the Master Roster after the join has succeeded.

## The two IDs

| ID | System of record | Format | Where it appears |
|---|---|---|---|
| `sales_rep_id` | Unify / SeatGeek | integer | Embedded in `(repId) Display Name` tokens inside the Unify CSV `Yellow Jacket Rep` column. Also present on the Master Roster. |
| `full_contact_id` | Salesforce | 15- or 18-char alphanumeric | Column on the Master Roster. Column on the Volunteer Credit Export (both blocks). |

## The Master Roster is the bridge — and intentionally over-includes

Every person who can appear in any downstream file MUST appear in the Master Roster. The roster carries both IDs (where available), plus name, team, member_type, contact info, and tracking links.

**The roster is broader than the Nest user base.** It includes board members, life members, and life directors whose Unify sales (and any Salesforce credit) contribute to the program's overall fundraising goals ($1.5M Fast Start, $4.2M Annual, $5M Stretch) even though they don't log into the Nest for MVP.

### Per-row ID requirement (relaxed 2026-05-20)

A roster row must have **at least one** of `(full_contact_id, sales_rep_id)` non-null. Reasoning:

- Yellow Jackets and Futures typically have both IDs (Yellow Jacket has SF Contact + Unify access).
- Some Life Members + Life Directors lack `full_contact_id` (no current SF Contact record but still have a Unify Rep ID from historical access).
- Some Board members lack `sales_rep_id` (not in Unify) but have `full_contact_id`.
- A handful of staged-for-future-access rows may have neither yet.

Behavior by ID availability:

| Row state | Behavior |
|---|---|
| Both IDs present | Joined to both Unify and Salesforce sources. Standard case. |
| Only `full_contact_id` | Joined to Salesforce credit rows. Unify rows referencing only their (nonexistent) rep ID don't apply — they won't see Unify credit. |
| Only `sales_rep_id` | Joined to Unify CSV rows. SF credit rows can't reach them (SF data always has Full Contact ID). |
| Neither | **Row dropped from the in-memory roster.** Logged as `ingest_errors` of kind `roster_row_no_identity` (warning). Spreadsheet row stays for human reference and future ID assignment. |

```
   Unify CSV row             SF Volunteer Credit Export row
   sales_rep_id              full_contact_id
        │                            │
        ▼                            ▼
   ┌──────────────────────────────────────────┐
   │     Master Volunteer Roster              │
   │     sales_rep_id  ↔  full_contact_id     │
   │     + name + team + member_type + …      │
   └──────────────────────────────────────────┘
                    │
                    ▼
            canonical Volunteer record
```

## Resolution rules

### Unify CSV row → volunteer
1. Tokenize `Yellow Jacket Rep` (see `sop_unify_csv_ingest.md`) to extract each `sales_rep_id`.
2. For each `sales_rep_id`, look up the roster row.
3. If the roster has it → use that row's `full_contact_id` as the canonical identity.
4. If the roster does NOT have it → emit one `ingest_errors` row of kind `unknown_sales_rep_id` and SKIP this rep's share of the credit. (The other reps on a multi-rep row still get their share — see `sop_multi_rep_split.md`.)

### Volunteer Credit Export row → volunteer
1. Read `Full Contact ID` directly from the row.
2. Look up the roster row by `full_contact_id`.
3. If found → use that row.
4. If missing → emit `ingest_errors` of kind `unknown_full_contact_id`, skip the row.
5. **Do not fall back to a name match.** `Contact Full Name` is display-only.

### Production-file precondition

Production Volunteer Credit Export files MUST carry `Full Contact ID` in both blocks (left dollars block + right points block). The current sample at `Process Documentation/2026-27 Gorlocks-2026-05-18-14-34-26.xlsx` is missing this column; Kirk will update the source SF report before the golden ingest test runs end-to-end. Parser refuses to run against a file lacking the column (raises a fatal error — not a per-row `ingest_errors`).

## Roster preflight checks

Before any other ingest runs, the engine validates the Master Roster:

| Check | Failure mode | Behavior |
|---|---|---|
| Each row has at least one of `(full_contact_id, sales_rep_id)` | Both missing | `ingest_errors` of kind `roster_row_no_identity` (warning). Row dropped from in-memory roster; spreadsheet untouched. Ingest continues. |
| `full_contact_id` (when present) is unique across the file | Duplicate IDs | **Hard fail.** Operator resolves before re-run. |
| `sales_rep_id` (when present) is unique across the file | Duplicate IDs | **Hard fail.** |
| `full_name` is unique across the file | Duplicate names | **Warning** logged as `duplicate_full_name`, ingest CONTINUES. Reason: name is not a join key, so a duplicate is a data-quality flag, not a correctness blocker. |
| `phone` present + non-empty on every row where `member_type ∈ {Yellow Jacket, Future}` AND `active = true` | Missing phones | `ingest_errors` of kind `missing_phone`, ingest continues. Twilio OTP login will fail for that user. |
| Each row's `member_type` resolves cleanly from legacy fields | Ambiguous | `ingest_errors` of kind `ambiguous_member_type` (error), row dropped. |

## File-team vs roster-team

The Volunteer Credit Export is filtered server-side by team and saved as `{TeamMascot}-{timestamp}.xlsx`. Filename mascot is a HINT only. The volunteer's authoritative team comes from the Master Roster.

If filename mascot ≠ roster team for a row's resolved volunteer → emit `ingest_errors` of kind `file_team_mismatch` (does not block ingest; flagged for operator review).

## Derived fields (not stored on roster, computed at runtime)

- `has_nest_access` = `true` iff `member_type ∈ {Yellow Jacket, Future}` AND `active = true`, OR an active row exists in `nest_access_overrides` for this volunteer. **Board, Life Member, and Life Director are `false` for MVP** — their credit still flows through the engine for org totals.
- `has_good_standing_thresholds` = `true` iff `member_type ∈ {Yellow Jacket, Future}`. Only YJ/Future are evaluated against the 4 thresholds; for everyone else the thresholds are NULL (not "false") because the rule simply doesn't apply.
- `personal_goal_amount` = `$10,000` for every YJ/Future volunteer; NULL for everyone else (no personal goal applies).

## Foundation staff reps (NOT in roster, separate allowlist)

Foundation employees (ticket reps, sales staff, etc.) can appear as Unify reps when they help close a sale. They are **not** in the Master Roster and don't receive credit. Source of truth: `Sales Staff Directory.xlsx` at the project root, parsed per `sop_staff_directory_parse.md`, mirrored into a Supabase `staff_rep_ids` table.

Engine behavior when a `sales_rep_id` from a Unify row resolves to a staff entry:

- The rep is **silently** removed from the multi-rep split divisor. No warning.
- The other volunteer reps on that row receive the full sale value among themselves (see `sop_multi_rep_split.md`).
- If ALL reps on a row are staff or otherwise unknown → row routes to a synthetic `org_uncredited` bucket so the dollars still count toward org-wide totals (see `sop_multi_rep_split.md` for the bucket details).

An unknown `sales_rep_id` that's in NEITHER the roster NOR the staff allowlist:

- Behaves like staff for split math (removed from divisor) so revenue isn't silently lost.
- BUT emits an `unknown_sales_rep_id` warning so an operator can triage: real staff member needing to be added to the allowlist? Real volunteer missing from the roster? Typo?

## Canonical volunteer ID (Supabase primary key)

Because not every roster row has a `full_contact_id`, the engine derives a deterministic synthetic primary key per row:

```
volunteers.id =
  full_contact_id      if non-null
  else "rep_" + sales_rep_id  if non-null
  else (row dropped — see preflight)
```

The string `id` is stable: the same roster row produces the same `id` across ingest cycles, so idempotent upserts are unaffected. Both `full_contact_id` and `sales_rep_id` are also stored as their own nullable unique columns on the `volunteers` table for direct lookup.

## What this SOP does NOT cover

- Roster column shape and parsing → `sop_master_roster_parse.md`
- Unify token regex → `sop_unify_csv_ingest.md`
- Credit-export block routing → `sop_volunteer_credit_routing.md`
- Multi-rep split math → `sop_multi_rep_split.md`
- What goes into `ingest_errors` → `sop_ingest_errors.md`
