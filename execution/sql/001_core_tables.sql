-- 001_core_tables.sql — YJ-Nest core schema.
-- Generated 2026-05-21. Pilot scope (Phase L).
--
-- Naming convention:
--   - "exceptions"     = the curated reconciliation rules file mirror.
--   - "ingest_errors"  = the operator-facing error log.
-- These are deliberately distinct concepts (see CLAUDE.md §6.5).

-- ─────────────────────────────────────────────────────────────────────
--   Lookup / config tables
-- ─────────────────────────────────────────────────────────────────────

create table if not exists incentive_tiers (
  id                    text primary key,
  name                  text not null,
  threshold             integer not null,
  threshold_future      integer,
  min_fundraising       numeric(12, 2),
  min_fundraising_future numeric(12, 2),
  pct_of_program        numeric(5, 4),
  color                 text,
  reward                jsonb not null default '{}'::jsonb,
  sort_order            integer not null,
  created_at            timestamptz not null default now()
);

create table if not exists item_patterns (
  id                              uuid primary key default gen_random_uuid(),
  pattern                         text not null,
  contributes_to_total_fundraising boolean not null default true,
  contributes_to_rate_bowl        boolean not null default false,
  contributes_to_wishes_for_teachers boolean not null default false,
  points_multiplier               numeric(6, 3) not null default 1.0,
  sort_order                      integer not null,
  created_at                      timestamptz not null default now()
);
create index if not exists item_patterns_sort_idx on item_patterns(sort_order);

create table if not exists volunteer_credit_allowlist (
  id                          uuid primary key default gen_random_uuid(),
  type                        text not null,                              -- e.g. 'Cash' (kept for back-compat; legacy seeds keyed by type)
  opportunity_name_pattern    text not null,                              -- exact match (case-insensitive)
  -- DEPRECATED 2026-05-22: replaced by routing_metrics. Kept for backward
  -- compatibility — engine prefers routing_metrics when non-empty.
  routing                     text not null default 'dollars' check (routing in ('dollars', 'ignore')),
  -- Multi-dimensional routing (locked 2026-05-22). Each entry names a metric
  -- dimension that receives the full amount_dollars. Empty array means fall
  -- back to legacy `routing` semantics.
  routing_metrics             jsonb not null default '[]'::jsonb,
  created_at                  timestamptz not null default now(),
  unique (type, opportunity_name_pattern),
  check (jsonb_typeof(routing_metrics) = 'array')
  -- Element-level enum validation is enforced in app code (parser's
  -- sanitizeRoutingMetrics + types.MetricName). PostgreSQL CHECK constraints
  -- cannot contain subqueries, so per-element validation lives outside the
  -- column definition. A future migration could swap in an IMMUTABLE helper
  -- function if DB-side enforcement becomes a hard requirement.
);
-- For existing deployments that pre-date 2026-05-22, ensure the column exists
-- without forcing a destructive recreate.
alter table volunteer_credit_allowlist
  add column if not exists routing_metrics jsonb not null default '[]'::jsonb;

-- Multi-dimensional routing pattern rules (added 2026-05-22). Pattern is a
-- case-insensitive substring match against Opportunity: Opportunity Name.
-- Exact entries in volunteer_credit_allowlist take precedence; among patterns,
-- lowest sort_order wins.
create table if not exists volunteer_credit_routing_patterns (
  id                          uuid primary key default gen_random_uuid(),
  pattern                     text not null,                              -- substring (case-insensitive)
  routing_metrics             jsonb not null,
  sort_order                  integer not null,
  created_at                  timestamptz not null default now(),
  unique (pattern),
  check (jsonb_typeof(routing_metrics) = 'array' and jsonb_array_length(routing_metrics) > 0)
  -- Per-element enum validation is enforced in app code (see note above).
);
create index if not exists vcrp_sort_idx on volunteer_credit_routing_patterns(sort_order);

create table if not exists staff_rep_ids (
  sales_rep_id        integer primary key,
  category            text not null,
  name                text not null,
  source_file_hash    text not null,
  ingested_at         timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
--   Teams + goals + pushes
-- ─────────────────────────────────────────────────────────────────────

create table if not exists teams (
  id                  text primary key,                                   -- slug e.g. 'gorlocks'
  name                text not null unique,                               -- mascot name e.g. 'Gorlocks'
  raised              numeric(12, 2) not null default 0,
  total_points        integer not null default 0,
  rate_bowl           numeric(12, 2) not null default 0,
  wishes_for_teachers numeric(12, 2) not null default 0,
  volunteer_count     integer not null default 0,
  good_standing_count integer not null default 0,
  rank                integer,
  goal                numeric(12, 2),
  updated_at          timestamptz not null default now()
);

create table if not exists goals (
  id                  uuid primary key default gen_random_uuid(),
  scope               text not null check (scope in ('org', 'team', 'personal')),
  scope_id            text,                                               -- team_id or volunteer_id; null for org
  label               text not null,                                      -- e.g. 'Fast Start', 'Annual Goal'
  amount              numeric(12, 2) not null,
  deadline            date,
  created_at          timestamptz not null default now()
);

create table if not exists pushes (
  id                  uuid primary key default gen_random_uuid(),
  label               text not null,
  event_type          text,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  target_amount       numeric(12, 2),
  active              boolean not null default true,
  created_at          timestamptz not null default now()
);

create table if not exists nest_access_overrides (
  volunteer_id        text primary key,                                   -- references volunteers.id
  reason              text not null,
  granted_by          text,
  granted_at          timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
--   Volunteers (the central output of compute_metrics)
-- ─────────────────────────────────────────────────────────────────────

create table if not exists volunteers (
  id                  text primary key,                                   -- synthetic PK: full_contact_id or "rep_<id>" or 'org_uncredited'
  full_contact_id     text unique,                                        -- nullable; unique when present
  sales_rep_id        integer unique,                                     -- nullable; unique when present
  name                text not null,
  initials            text not null default '',
  email               text,
  phone               text,
  team                text,                                               -- denormalized mascot for read perf
  team_id             text references teams(id) on delete set null,
  member_type         text check (member_type in (
                        'Yellow Jacket', 'Future', 'Life Member', 'Life Director', 'Board'
                      )),                                                 -- nullable for org_uncredited
  volunteer_category  text,                                               -- 'Active' | 'Future' | 'Life Member' | 'Life Director'
  active              boolean not null default true,
  has_nest_access     boolean not null default false,
  is_sales_captain    boolean not null default false,
  raised              numeric(12, 2) not null default 0,
  goal                numeric(12, 2),
  -- Prior-season display fields populated by compute_historical_baseline.ts
  -- when a historical credit-export file is detected. Distinct from current-season metrics.
  last_year_fundraising_dollars numeric(12, 2),
  last_year_fundraising_rank    integer,
  metrics             jsonb not null default '{}'::jsonb,                 -- { totalFundraising, rateBowl, wishesForTeachers, totalPoints }
  thresholds          jsonb not null default '{}'::jsonb,                 -- { totalFundraising: bool|null, ... }
  tier_id             text references incentive_tiers(id),
  rank                integer,
  updated_at          timestamptz not null default now()
);
-- Migration safety for pre-2026-05-22 deployments.
alter table volunteers add column if not exists last_year_fundraising_dollars numeric(12, 2);
alter table volunteers add column if not exists last_year_fundraising_rank integer;

create index if not exists volunteers_team_idx on volunteers(team_id);
create index if not exists volunteers_has_access_idx on volunteers(has_nest_access);

-- ─────────────────────────────────────────────────────────────────────
--   Contributions ledger (per-row attribution for audit)
-- ─────────────────────────────────────────────────────────────────────

create table if not exists contributions (
  id                          uuid primary key default gen_random_uuid(),
  ingest_run_id               uuid not null,
  volunteer_id                text not null references volunteers(id) on delete cascade,
  source                      text not null check (source in ('unify', 'sf_dollars', 'sf_points', 'adjust')),
  source_file                 text,
  source_row_hash             text,
  source_file_fingerprint     text,                                       -- only set for SF credit rows
  source_file_timestamp       text,
  item_or_job_or_opportunity  text,
  account_name                text,
  amount_dollars              numeric(12, 4),
  amount_points               numeric(12, 4),
  exception_id_applied        text,
  superseded                  boolean not null default false,             -- toggled when a newer batch arrives
  created_at                  timestamptz not null default now()
);

create index if not exists contributions_volunteer_idx on contributions(volunteer_id);
create index if not exists contributions_run_idx on contributions(ingest_run_id);
create index if not exists contributions_source_idx on contributions(source);
-- Idempotency dedup index — same row from same file should upsert.
create unique index if not exists contributions_dedup_idx on contributions(
  source, source_file, source_row_hash, source_file_fingerprint
) where source_row_hash is not null;

-- ─────────────────────────────────────────────────────────────────────
--   Exceptions mirror + ingest run log + ingest errors
-- ─────────────────────────────────────────────────────────────────────

create table if not exists exceptions (
  id                  text primary key,                                   -- e.g. 'OV-007'
  added_date          date not null,
  active              boolean not null,
  type                text not null check (type in ('SPLIT', 'ADJUST')),
  account             text not null,
  account_match       text not null default 'contains' check (account_match in ('exact', 'contains')),
  item                text,
  body                jsonb not null,                                     -- reps[] for SPLIT or adjustments[] for ADJUST
  notes               text,
  source_file_hash    text not null,
  ingested_at         timestamptz not null default now()
);

create table if not exists ingest_runs (
  id                  uuid primary key default gen_random_uuid(),
  started_at          timestamptz not null default now(),
  finished_at         timestamptz,
  status              text not null check (status in ('running', 'success', 'partial', 'failed')),
  triggered_by        text not null check (triggered_by in ('cli', 'cron', 'manual')),
  source_files        jsonb not null,
  volunteers_upserted integer not null default 0,
  errors_count        integer not null default 0,
  warnings_count      integer not null default 0,
  notes               text
);

create table if not exists ingest_errors (
  id                  uuid primary key default gen_random_uuid(),
  ingest_run_id       uuid not null references ingest_runs(id) on delete cascade,
  emitted_at          timestamptz not null default now(),
  kind                text not null,
  severity            text not null check (severity in ('warning', 'error')),
  source_file         text,
  source_row_number   integer,
  source_row_hash     text,
  full_contact_id     text,
  sales_rep_id        integer,
  detail              jsonb not null default '{}'::jsonb,
  resolved            boolean not null default false,
  resolved_at         timestamptz,
  resolved_by         text,
  notes               text
);

create index if not exists ingest_errors_run_idx on ingest_errors(ingest_run_id);
create index if not exists ingest_errors_kind_idx on ingest_errors(kind);
create index if not exists ingest_errors_unresolved_idx on ingest_errors(resolved) where resolved = false;
