-- 002_v2_extension_fields.sql — Stream C compute fields.
--
-- These columns are populated by Stream C compute scripts (separate session)
-- AFTER the v1 §7.4 contract lands. Engine emits genuine NULL for all of
-- them this session per Decision 2026-05-20 (no sentinel defaults — null
-- = "not yet measured," which is the truth before Stream C runs).
--
-- v2 frontend (volunteer-impact-dashboard-v2) must add null-guards on every
-- consumer of these fields before pilot launch (Stream E null-guard work).

alter table volunteers
  add column if not exists role                    text,                   -- 'volunteer' | 'sales_captain' | 'admin'
  add column if not exists signals                 jsonb,                  -- { atRisk, atRiskReason, hot, hotReason, sessionsLastWeek, fundraisingDeltaWeek, lastActionAt, daysSinceFundraisingDelta, activeSprintsLast4, signalReason }
  add column if not exists momentum                jsonb,                  -- { currentStreakDays, lastWeekDeltaPct, lastActionAt }
  add column if not exists current_sprint          jsonb,                  -- { sprintId, percentile, weekPoints }
  add column if not exists level_id                text,                   -- internal ladder slug (not the public tier)
  add column if not exists composite_points        numeric(12, 4),         -- composite scoring for internal standings
  add column if not exists rank_delta_7d           integer,                -- positive = climbed, negative = dropped
  add column if not exists sprint_rank             integer,
  add column if not exists week_points             numeric(12, 4),
  add column if not exists fundraising_percentile  numeric(5, 4),          -- 0.0 - 1.0
  add column if not exists activity_percentile     numeric(5, 4);
