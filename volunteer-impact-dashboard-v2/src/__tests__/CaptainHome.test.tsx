/**
 * CaptainHome — null-render guard tests.
 *
 * The captain triage UI consumes Stream C signals + currentSprint metrics.
 * When Stream C hasn't run those fields are genuine null. This suite proves
 * the screen still renders neutrally (no crash, no bucket counts, no
 * confidently-false labels).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeVolunteer } from './helpers';

describe('CaptainHome — Stream C null-state', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders gracefully when every team member has signals = null and currentSprint = null', async () => {
    vi.doMock('../constants', () => ({
      VOLUNTEERS: [
        makeVolunteer({ id: 'u-cap', name: 'Cap', initials: 'CC', teamId: 't-1', role: 'sales_captain' }),
        makeVolunteer({ id: 'u-a', name: 'Alpha Member', initials: 'AM', teamId: 't-1' }),
        makeVolunteer({ id: 'u-b', name: 'Bravo Member', initials: 'BM', teamId: 't-1' }),
      ],
      TEAMS: [
        { id: 't-1', name: 'Test Team', raised: 0, goal: 10000, rank: 1, volunteerCount: 3, totalPoints: 0, rateBowl: 0, wishesForTeachers: 0 },
      ],
      CURRENT_USER_ID: 'u-cap',
      ACTIVE_PUSH: null,
    }));

    const { default: CaptainHome } = await import('../tabs/CaptainHome');
    render(<CaptainHome />);

    // Header still appears.
    expect(screen.getByText(/Test Team — Triage/i)).toBeInTheDocument();
    // Stream C disabled: must render neutral "shares not yet measured" — NOT
    // a confidently-zero "0 shares this sprint" sentinel (Codex F1).
    expect(screen.queryByText(/0 shares this sprint/)).not.toBeInTheDocument();
    expect(screen.getByText(/shares not yet measured/i)).toBeInTheDocument();
    // Triage buckets must show their "empty" text because nobody is classified.
    expect(screen.getByText(/Nobody on your team is currently at risk/i)).toBeInTheDocument();
    expect(screen.getByText(/No coasting members right now/i)).toBeInTheDocument();
    expect(screen.getByText(/No rising members this sprint/i)).toBeInTheDocument();
  });

  it('still buckets members whose Stream C signals are populated', async () => {
    vi.doMock('../constants', () => ({
      VOLUNTEERS: [
        makeVolunteer({ id: 'u-cap', name: 'Cap', initials: 'CC', teamId: 't-1', role: 'sales_captain' }),
        makeVolunteer({
          id: 'u-r', name: 'Riley Rising', initials: 'RR', teamId: 't-1',
          signals: { rising: true, coasting: false, atRisk: false, signalReason: 'On a roll' },
        }),
      ],
      TEAMS: [
        { id: 't-1', name: 'Test Team', raised: 0, goal: 10000, rank: 1, volunteerCount: 2, totalPoints: 0, rateBowl: 0, wishesForTeachers: 0 },
      ],
      CURRENT_USER_ID: 'u-cap',
      ACTIVE_PUSH: null,
    }));
    const { default: CaptainHome } = await import('../tabs/CaptainHome');
    render(<CaptainHome />);
    expect(screen.getByText(/Riley Rising/i)).toBeInTheDocument();
    // "On a roll" appears both in the Rising bucket subtitle and on the row
    // card; getAllByText asserts at least one and tolerates both surfaces.
    expect(screen.getAllByText(/On a roll/i).length).toBeGreaterThan(0);
  });
});
