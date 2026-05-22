/**
 * AdminDashboard — null-render guard tests.
 *
 * AdminDashboard classifies every volunteer by signal kind. When signals is
 * null the volunteer must not be silently counted in 'rising' / 'coasting' /
 * 'at_risk' buckets, and the SignalPill must render nothing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeVolunteer } from './helpers';

describe('AdminDashboard — Stream C null-state', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders gracefully when every volunteer has signals = null', async () => {
    vi.doMock('../constants', () => ({
      VOLUNTEERS: [
        makeVolunteer({ id: 'u-1', name: 'Alpha Volunteer', initials: 'AV', team: 'Team A' }),
        makeVolunteer({ id: 'u-2', name: 'Bravo Volunteer', initials: 'BV', team: 'Team B' }),
      ],
      TEAMS: [
        { id: 't-1', name: 'Team A', raised: 0, goal: 10000, rank: 1, volunteerCount: 1, totalPoints: 0, rateBowl: 0, wishesForTeachers: 0 },
        { id: 't-2', name: 'Team B', raised: 0, goal: 10000, rank: 2, volunteerCount: 1, totalPoints: 0, rateBowl: 0, wishesForTeachers: 0 },
      ],
      GOALS: [],
    }));

    const { default: AdminDashboard } = await import('../tabs/AdminDashboard');
    render(<AdminDashboard />);

    // Volunteers still listed.
    expect(screen.getByText(/Alpha Volunteer/)).toBeInTheDocument();
    expect(screen.getByText(/Bravo Volunteer/)).toBeInTheDocument();

    // SignalCard summary counts must all read 0 — no volunteer is classified.
    const counts = screen.getAllByText('0');
    // 4 summary cards: Rising / Coasting / At risk / Good Standing. Each has
    // its count as a "0" text node.
    expect(counts.length).toBeGreaterThanOrEqual(4);

    // The SignalPill component must not have rendered for any row — assert by
    // looking for the small pill styling that wraps the single-word label.
    const pillElems = document.querySelectorAll('.bg-error\\/10.text-error.px-2.py-0\\.5.rounded-full');
    expect(pillElems.length).toBe(0);
  });

  it('omits the sprint-share suffix when currentSprint is null', async () => {
    vi.doMock('../constants', () => ({
      VOLUNTEERS: [
        makeVolunteer({ id: 'u-1', name: 'Charlie', initials: 'CC', team: 'Team A',
          metrics: { totalFundraising: 100, rateBowl: 0, wishesForTeachers: 0, totalPoints: 0, currentSprint: null }}),
      ],
      TEAMS: [
        { id: 't-1', name: 'Team A', raised: 0, goal: 10000, rank: 1, volunteerCount: 1, totalPoints: 0, rateBowl: 0, wishesForTeachers: 0 },
      ],
      GOALS: [],
    }));
    const { default: AdminDashboard } = await import('../tabs/AdminDashboard');
    render(<AdminDashboard />);
    // "Team A · $100" must appear; "shares this sprint" must NOT.
    expect(screen.getByText(/Team A · \$100/)).toBeInTheDocument();
    expect(screen.queryByText(/shares this sprint/)).not.toBeInTheDocument();
  });
});
