# SOP — Role Derivation

**Owner:** `derive_role.ts`
**Spec source:** v2 frontend `VolunteerRole = 'volunteer' | 'sales_captain' | 'admin'`; CLAUDE.md §4.2 (`is_sales_captain`); the 2026-05-21 captain rename decision.
**Status:** Locked 2026-05-22 (Stream C)

---

## Purpose

Set `volunteers.role` to exactly one of `'volunteer' | 'sales_captain' | 'admin'` per row, deterministically, from data already in the engine (`roster.is_sales_captain`) plus a separately-curated admin override list.

## Rules

Evaluated top-to-bottom; first match wins.

| # | Condition | Output `role` |
|---|---|---|
| 1 | Volunteer is in the admin override set (see "Admin source" below) | `'admin'` |
| 2 | `roster.is_sales_captain === true` | `'sales_captain'` |
| 3 | else (and `has_nest_access === true`) | `'volunteer'` |
| 4 | else (no Nest access — Life Member, Director, Board without override; `org_uncredited`) | `null` |

`role` is null exactly when the volunteer has no Nest UI presence. That keeps NULL meaning "out of scope for role-based UI" rather than "not measured."

## Admin source

Pilot decision (2026-05-22): admins are a tiny, hand-curated list. The engine accepts them as an injected `Set<string>` of `volunteer_id` synthetic PKs.

- Production source: `nest_access_overrides.role_override` column (text, nullable). When set to `'admin'`, that volunteer is promoted.
- Pilot source: empty default; orchestrator caller passes the set explicitly. No admins are seeded until pilot launch.

SQL extension required when overrides land (separate migration, Stream D):
```sql
alter table nest_access_overrides
  add column if not exists role_override text;
```

Until that column exists, the orchestrator passes an empty set and no row gets `'admin'`. This is the honest state — there are zero admins until one is explicitly granted.

## What this SOP does NOT cover

- The visual treatment of role badges in the v2 UI (Stream E).
- The captain ↔ sales_captain rename in the v2 frontend type (Stream E).
- Demoting an admin back to volunteer (Stream D admin tooling).
- Auditing role changes over time (post-MVP).
