-- 003_rls_policies.sql — Row-Level Security policies.
--
-- Roles:
--   - service_role  : the engine ingest pipeline + admin operations (full access)
--   - authenticated : volunteer logged into the Nest (read-only on display surfaces)
--   - anon          : not used by the Nest (Twilio OTP auth → authenticated)
--
-- Principle: Nest UI reads only the data needed to render. Operator-only
-- tables (ingest_errors, ingest_runs, exceptions, allowlists, staff) are
-- service-role-only.

alter table volunteers          enable row level security;
alter table teams               enable row level security;
alter table goals               enable row level security;
alter table pushes              enable row level security;
alter table incentive_tiers     enable row level security;
alter table item_patterns       enable row level security;
alter table volunteer_credit_allowlist enable row level security;
alter table staff_rep_ids       enable row level security;
alter table exceptions          enable row level security;
alter table ingest_runs         enable row level security;
alter table ingest_errors       enable row level security;
alter table contributions       enable row level security;
alter table nest_access_overrides enable row level security;

-- ── Read policies for the Nest ──────────────────────────────────────
-- Volunteers visible in the Nest:
--   - has_nest_access = true rows (YJ + Future + overrides)
--   - the org_uncredited synthetic row is NEVER returned to authenticated users
create policy volunteers_read on volunteers
  for select to authenticated
  using (has_nest_access = true and id <> 'org_uncredited');

create policy teams_read on teams
  for select to authenticated
  using (true);

create policy goals_read on goals
  for select to authenticated
  using (true);

create policy pushes_read on pushes
  for select to authenticated
  using (active = true);

create policy incentive_tiers_read on incentive_tiers
  for select to authenticated
  using (true);

create policy exceptions_read on exceptions
  for select to authenticated
  using (active = true);                                                  -- audit transparency for active rules only

-- ── Operator-only tables (service_role only; nothing for authenticated) ─
-- (No policies means no access for authenticated/anon.)
-- service_role bypasses RLS by default in Supabase, so the engine still works.
