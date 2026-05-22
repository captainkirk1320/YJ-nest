import type { Volunteer } from '../types';

/**
 * Factory that produces a minimal-but-typed Volunteer. Default = "Stream C
 * disabled, fields null." Override the bits each test needs.
 */
export function makeVolunteer(overrides: Partial<Volunteer> = {}): Volunteer {
  return {
    id: 'u-test',
    name: 'Test Volunteer',
    initials: 'TV',
    email: 'test@example.com',
    phone: '+15555550100',
    raised: 0,
    goal: 10000,
    rank: 1,
    team: 'Test Team',
    teamId: 't-test',
    tierId: null,
    role: null,
    volunteerCategory: 'Active',
    signals: null,
    momentum: null,
    thresholds: {
      totalFundraising: null,
      rateBowl: null,
      wishesForTeachers: null,
      totalPoints: null,
    },
    metrics: {
      totalFundraising: 0,
      rateBowl: 0,
      wishesForTeachers: 0,
      totalPoints: 0,
      currentSprint: null,
    },
    fundraisingPercentile: null,
    activityPercentile: null,
    levelId: null,
    compositePoints: null,
    rankDelta7d: null,
    sprintRank: null,
    weekPoints: null,
    ...overrides,
  };
}
