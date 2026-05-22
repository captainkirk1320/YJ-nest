/**
 * Layout — avatar-ring null-state test.
 *
 * The sidebar avatar ring is a Good Standing progress indicator. When every
 * threshold is null (Board / Life Member / Life Director, or Stream C off)
 * the % readout must render "—" rather than a confident 0%.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeVolunteer } from './helpers';

describe('Layout — Stream C null-state', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders "—" instead of 0% when every threshold is null', async () => {
    vi.doMock('../components/AIChatAssistant', () => ({
      default: () => null,
    }));
    const { default: Layout } = await import('../components/Layout');
    const user = makeVolunteer({
      name: 'Board Member',
      team: 'Foundation',
      thresholds: {
        totalFundraising: null,
        rateBowl: null,
        wishesForTeachers: null,
        totalPoints: null,
      },
    });
    render(
      <Layout
        activeTab="Home"
        currentUser={user}
        onTabChange={() => {}}
        onAvatarClick={() => {}}
        onLogout={() => {}}
      >
        <div>child</div>
      </Layout>,
    );
    // The percent readout falls back to em-dash. 0% would confidently say
    // "you've met 0 of 4" when the rule doesn't apply to this volunteer.
    expect(screen.queryByText(/^0%$/)).not.toBeInTheDocument();
    // Em-dash should be present (this volunteer's % cell).
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders 50% when 2 of 4 thresholds are met', async () => {
    vi.doMock('../components/AIChatAssistant', () => ({
      default: () => null,
    }));
    const { default: Layout } = await import('../components/Layout');
    const user = makeVolunteer({
      thresholds: {
        totalFundraising: true,
        rateBowl: true,
        wishesForTeachers: false,
        totalPoints: false,
      },
    });
    render(
      <Layout
        activeTab="Home"
        currentUser={user}
        onTabChange={() => {}}
        onAvatarClick={() => {}}
        onLogout={() => {}}
      >
        <div>child</div>
      </Layout>,
    );
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });
});
