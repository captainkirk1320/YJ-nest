/**
 * Standings — null-state guard.
 *
 * Standings reads STANDINGS_BY_USER[user.id]; when the entry is absent the
 * screen must render a neutral placeholder rather than crashing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeVolunteer } from './helpers';

describe('Standings — undefined-user state', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders "Not yet measured" when STANDINGS_BY_USER lacks the user', async () => {
    const user = makeVolunteer({ id: 'u-unmeasured', name: 'Unmeasured U' });
    vi.doMock('../constants', () => ({
      VOLUNTEERS: [user],
      CURRENT_USER_ID: 'u-unmeasured',
      INCENTIVE_TIERS: [],
      MOCK_LEADERBOARD: [],
      STANDINGS_BY_USER: {},
      TEAMS: [],
      pctAtOrAboveTier: () => 0,
      ACTIVE_PUSH: null,
    }));
    const { default: Standings } = await import('../tabs/Standings');
    render(<Standings />);
    expect(screen.getByText(/Not yet measured/i)).toBeInTheDocument();
  });
});
