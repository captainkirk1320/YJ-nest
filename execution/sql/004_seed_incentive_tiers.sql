-- 004_seed_incentive_tiers.sql — Seed data for tier ladder, item patterns,
-- cash allowlist, org-level goals.
--
-- Sources of truth:
--   - Tiers: Incentives_for_Yellow_Jackets_-_2025.pdf + v2 constants.ts INCENTIVE_TIERS
--   - Items: architecture/sop_item_categorization.md
--   - Cash allowlist: 2026-05-20 decisions.md ("Cash routing via allowlist, not default")
--   - Org goals: CLAUDE.md §1 (Fast Start / Annual / Stretch)

-- ── Tier ladder ─────────────────────────────────────────────────────
insert into incentive_tiers (id, name, threshold, threshold_future, min_fundraising, min_fundraising_future, pct_of_program, color, sort_order, reward) values
  ('walk-on',        'Walk-On',         17500,  15000, 10000, 7500, 0.28,  '#8B7355', 1,
    '{"tickets":["2 Vrbo Fiesta Bowl tickets w/ 2 Club ''71 tickets","2 Rate Bowl tickets"],"swag":["Fiesta Bowl exclusive game helmet stickers"],"experiences":[],"donations":[]}'::jsonb),
  ('starter',        'Starter',         30000,  null,  null,  null, 0.18,  '#6B9080', 2,
    '{"tickets":["2 Vrbo Fiesta Bowl tickets w/ 2 Club ''71 tickets","2 Rate Bowl tickets"],"swag":["Fiesta Bowl exclusive game helmet stickers"],"experiences":[],"donations":[],"chooseOne":["2 additional Vrbo Fiesta Bowl tickets w/ 2 Club ''71 + 2 additional Rate Bowl tickets","Commemorative Vrbo Fiesta Bowl game ball","Rate Bowl \"On Field Experience\" for you and up to 3 guests"]}'::jsonb),
  ('captain',        'Captain',         50000,  null,  null,  null, 0.10,  '#FEC52E', 3,
    '{"tickets":["2 Vrbo Fiesta Bowl tickets w/ 2 Club ''71 tickets","2 Rate Bowl suite tickets"],"swag":["Fiesta Bowl exclusive game helmet stickers"],"experiences":[],"donations":[],"chooseOne":["2 add''l Vrbo Fiesta Bowl tickets w/ 2 Club ''71 + commemorative game ball","4 add''l Vrbo Fiesta Bowl tickets w/ 4 Club ''71 + 4 add''l Rate Bowl tickets","2 add''l Vrbo Fiesta Bowl tickets w/ 2 Club ''71 + Rate Bowl \"On Field Experience\" for you and up to 3 guests","Festivus Trip for one (Hotel, Airfare, Tailgate, Game Ticket)"]}'::jsonb),
  ('all-conference', 'All-Conference',  75000,  null,  null,  null, 0.05,  '#4A6FA5', 4,
    '{"tickets":["2 Vrbo Fiesta Bowl premium tickets w/ 2 Club ''71 tickets","4 Rate Bowl suite tickets"],"swag":["Fiesta Bowl exclusive game helmet stickers","Commemorative Vrbo Fiesta Bowl game ball"],"experiences":["Rate Bowl \"On Field Experience\" for up to 4 guests"],"donations":[],"chooseOne":["4 Vrbo Fiesta Bowl tickets w/ 4 Club ''71 + 4 Rate Bowl tickets in 200-level seats","Festivus Trip for one (Hotel, Airfare, Tailgate, Game Ticket)"]}'::jsonb),
  ('all-american',   'All-American',    100000, null,  null,  null, 0.025, '#C5283D', 5,
    '{"tickets":["4 Vrbo Fiesta Bowl premium tickets w/ 4 Club ''71 tickets","4 Rate Bowl tickets in 200-level seats"],"swag":["Fiesta Bowl exclusive game helmet stickers","Commemorative Vrbo Fiesta Bowl game ball"],"experiences":["Vrbo Fiesta Bowl & Rate Bowl \"On Field Experience\" for up to 6 guests"],"donations":[],"chooseOne":["4 Vrbo Fiesta Bowl premium tickets w/ 4 Club ''71 + 4 Rate Bowl tickets in 200-level seats","Festivus Trip for 2 (Hotel, Airfare, Tailgate, Game Ticket)"]}'::jsonb),
  ('heisman',        'Heisman',         200000, null,  null,  null, 0.005, '#5A189A', 6,
    '{"tickets":["6 Vrbo Fiesta Bowl premium tickets w/ 6 Club ''71 tickets","6 Rate Bowl tickets in 200-level seats"],"swag":["Fiesta Bowl exclusive game helmet stickers","Commemorative Vrbo Fiesta Bowl game ball"],"experiences":["Vrbo Fiesta Bowl & Rate Bowl \"On Field Experience\" for up to 6 guests","VIP experience: Uber Black XL to and from the Vrbo Fiesta Bowl game"],"donations":[],"chooseOne":["4 Vrbo Fiesta Bowl premium tickets w/ 4 Club ''71 + 4 Rate Bowl tickets in 200-level seats","Festivus Trip for 2 (Hotel, Airfare, Tailgate, Game Ticket)"]}'::jsonb)
on conflict (id) do nothing;

-- ── Item categorization patterns ────────────────────────────────────
-- Order is significant — first-match-wins for the Rate Bowl vs Fiesta Bowl
-- parking precedence (see sop_item_categorization.md Note 1).
insert into item_patterns (pattern, contributes_to_total_fundraising, contributes_to_rate_bowl, contributes_to_wishes_for_teachers, points_multiplier, sort_order) values
  ('PARKING - Rate Bowl',  true, true,  false, 1.0, 1),
  ('Rate Bowl',            true, true,  false, 1.0, 2),
  ('Wishes for Teachers',  true, false, true,  1.0, 3),
  ('Par 3 Challenge',      true, false, false, 1.0, 4),
  ('Football Kickoff',     true, false, false, 1.0, 5),
  ('KOE',                  true, false, false, 1.0, 6),
  ('Fiesta Bowl',          true, false, false, 1.0, 7);

-- ── Cash routing allowlist (Codex condition 4) ──────────────────────
insert into volunteer_credit_allowlist (type, opportunity_name_pattern, routing) values
  ('Cash', 'AI Help', 'dollars')
on conflict (type, opportunity_name_pattern) do nothing;

-- ── Foundation staff allowlist (current pilot seed) ─────────────────
insert into staff_rep_ids (sales_rep_id, category, name, source_file_hash) values
  (200288,  'Sales', 'Tony Econ',       'seed_2026-05-21'),
  (2095453, 'Sales', 'Austin Zawicki',  'seed_2026-05-21')
on conflict (sales_rep_id) do nothing;

-- ── Org-level goals ─────────────────────────────────────────────────
insert into goals (scope, scope_id, label, amount, deadline) values
  ('org', null, 'Fast Start',  1500000, '2026-08-21'),
  ('org', null, 'Annual Goal', 4200000, '2026-12-05'),
  ('org', null, 'Stretch',     5000000, '2026-12-05')
on conflict do nothing;
