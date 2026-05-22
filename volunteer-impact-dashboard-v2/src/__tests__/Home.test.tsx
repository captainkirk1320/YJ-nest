/**
 * Home (WhereYouStand) — null-render guard tests.
 *
 * The "Where You Stand" panel reads user.momentum.lastActionAt and
 * user.momentum.activeSprintsLast4. When Stream C compute_momentum has not
 * run, both are null. The panel must show a neutral "—" rather than
 * "today" or "0 of 4."
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeVolunteer } from './helpers';

describe('Home — Stream C null-state', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders gracefully when momentum is null', async () => {
    const user = makeVolunteer({
      id: 'u-1',
      name: 'Kirk Test',
      team: 'Red Foxes',
      teamId: 't-1',
      momentum: null,
    });
    vi.doMock('../constants', () => ({
      VOLUNTEERS: [user],
      CURRENT_USER_ID: 'u-1',
      PERSONAL_LINKS: [],
      ACTIVE_PUSH: null,
      UPCOMING_MOMENTS: [],
      INCENTIVE_TIERS: [],
      COMMITTEES: [],
      TEAMS: [
        { id: 't-1', name: 'Red Foxes', raised: 0, goal: 10000, rank: 1, volunteerCount: 1, totalPoints: 0, rateBowl: 0, wishesForTeachers: 0 },
      ],
      PROGRAM_SIZE: 112,
      STANDINGS_BY_USER: {},
    }));
    const { default: Home } = await import('../tabs/Home');
    render(<Home onViewDonors={() => {}} onTakeAction={() => {}} />);

    // Both "sprints active" and "last action" cells render an em-dash when
    // momentum is null; getAllByText covers both.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Not yet measured/i)).toBeInTheDocument();
  });

  it('renders concrete momentum data when present', async () => {
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const user = makeVolunteer({
      id: 'u-1',
      name: 'Kirk Test',
      team: 'Red Foxes',
      teamId: 't-1',
      momentum: {
        activeSprintsLast4: 3,
        lastActionAt: lastWeek,
        nextMilestoneActions: 1,
        sprintParticipationRate: 0.75,
      },
    });
    vi.doMock('../constants', () => ({
      VOLUNTEERS: [user],
      CURRENT_USER_ID: 'u-1',
      PERSONAL_LINKS: [],
      ACTIVE_PUSH: null,
      UPCOMING_MOMENTS: [],
      INCENTIVE_TIERS: [],
      COMMITTEES: [],
      TEAMS: [
        { id: 't-1', name: 'Red Foxes', raised: 0, goal: 10000, rank: 1, volunteerCount: 1, totalPoints: 0, rateBowl: 0, wishesForTeachers: 0 },
      ],
      PROGRAM_SIZE: 112,
      STANDINGS_BY_USER: {},
    }));
    const { default: Home } = await import('../tabs/Home');
    render(<Home onViewDonors={() => {}} onTakeAction={() => {}} />);
    // Should show "7 days ago" momentum.
    expect(screen.getByText(/days ago/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
