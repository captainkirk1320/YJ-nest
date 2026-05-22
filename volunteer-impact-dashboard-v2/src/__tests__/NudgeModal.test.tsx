/**
 * NudgeModal — null-render guard test.
 *
 * The modal renders the captain-side "why" panel only when signalReason is a
 * non-null, non-empty string. With Stream C disabled the entire signals
 * object is null and the panel must be hidden.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeVolunteer } from './helpers';

describe('NudgeModal — Stream C null-state', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders gracefully when recipient.signals is null', async () => {
    vi.doMock('../constants', () => ({
      NUDGE_TEMPLATES: [
        { id: 't-1', signalType: 'rising', label: 'Test template', bodyTemplate: 'Hi {firstName}!', active: true, sortOrder: 1 },
      ],
      ACTIVE_PUSH: null,
    }));
    const { default: NudgeModal } = await import('../components/NudgeModal');
    const recipient = makeVolunteer({ name: 'Quinn Quiet', signals: null });
    render(<NudgeModal recipient={recipient} signalType="rising" onClose={() => {}} />);

    // Modal renders the recipient's name.
    expect(screen.getByText(/Nudge Quinn/)).toBeInTheDocument();
    // "Why" panel must NOT render — it would imply a measurement when none ran.
    expect(screen.queryByText(/^Why$/)).not.toBeInTheDocument();
  });

  it('shows the "Why" panel when signalReason is populated', async () => {
    vi.doMock('../constants', () => ({
      NUDGE_TEMPLATES: [
        { id: 't-1', signalType: 'at_risk', label: 'Test', bodyTemplate: 'Hi {firstName}', active: true, sortOrder: 1 },
      ],
      ACTIVE_PUSH: null,
    }));
    const { default: NudgeModal } = await import('../components/NudgeModal');
    const recipient = makeVolunteer({
      name: 'Riley Risk',
      signals: { rising: false, coasting: false, atRisk: true, signalReason: '14 days quiet' },
    });
    render(<NudgeModal recipient={recipient} signalType="at_risk" onClose={() => {}} />);
    expect(screen.getByText('Why')).toBeInTheDocument();
    expect(screen.getByText(/14 days quiet/)).toBeInTheDocument();
  });
});
