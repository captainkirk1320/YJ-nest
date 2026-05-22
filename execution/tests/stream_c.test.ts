// Stream C — deterministic-rules test for sop_role.md, sop_momentum.md,
// sop_current_sprint.md, sop_signals.md.
//
// Strategy: bypass file parsing and orchestration. Construct an in-memory
// roster + volunteers + credit records + pushes, call the four Stream C
// functions directly, and assert against hand-derived expectations.
// "Now" is injected so the rules are reproducible across machines and time.

import { describe, it, expect, beforeAll } from 'vitest';

import { deriveRole } from '../src/derive_role.js';
import { computeMomentum } from '../src/compute_momentum.js';
import { computeCurrentSprint } from '../src/compute_current_sprint.js';
import { computeSignals } from '../src/compute_signals.js';
import type {
  CreditRecord,
  MemberType,
  PushRecord,
  Roster,
  RosterRow,
  VolunteerOutput,
} from '../src/types.js';

const NOW = new Date('2026-05-22T12:00:00Z');

// ─── Roster fixtures ─────────────────────────────────────────────────────

function mkRosterRow(args: {
  full_contact_id: string;
  sales_rep_id: number;
  full_name: string;
  member_type: MemberType;
  active?: boolean;
  is_sales_captain?: boolean;
  team?: string | null;
}): RosterRow {
  return {
    full_contact_id: args.full_contact_id,
    sales_rep_id: args.sales_rep_id,
    first_name: args.full_name.split(' ')[0] ?? '',
    last_name: args.full_name.split(' ').slice(1).join(' '),
    full_name: args.full_name,
    email: null,
    phone: null,
    team: args.team ?? null,
    is_sales_captain: args.is_sales_captain ?? false,
    member_type: args.member_type,
    active: args.active ?? true,
    first_year_of_volunteering: null,
    fiesta_ticket_link: null,
    rate_ticket_link: null,
    last_year_fundraising_dollars: null,
    last_year_fundraising_rank: null,
    job: null,
  };
}

const ROSTER_ROWS: RosterRow[] = [
  mkRosterRow({ full_contact_id: 'C-RISE-1', sales_rep_id: 5001, full_name: 'Rita Rising',  member_type: 'Yellow Jacket', team: 'Gorlocks' }),
  mkRosterRow({ full_contact_id: 'C-RISE-2', sales_rep_id: 5002, full_name: 'Ron Rising',   member_type: 'Future',        team: 'Gorlocks' }),
  mkRosterRow({ full_contact_id: 'C-COAST',  sales_rep_id: 5003, full_name: 'Cora Coast',   member_type: 'Future',        team: 'Gorlocks' }),
  mkRosterRow({ full_contact_id: 'C-RISK',   sales_rep_id: 5004, full_name: 'Adam Atrisk',  member_type: 'Future',        team: 'Gorlocks' }),
  mkRosterRow({ full_contact_id: 'C-SILENT', sales_rep_id: 5005, full_name: 'Sam Silent',   member_type: 'Yellow Jacket', team: 'Gorlocks' }),
  mkRosterRow({ full_contact_id: 'C-LIFE',   sales_rep_id: 5006, full_name: 'Liz Lifer',    member_type: 'Life Member',   team: null }),
  mkRosterRow({ full_contact_id: 'C-CAP',    sales_rep_id: 5007, full_name: 'Connor Cap',   member_type: 'Yellow Jacket', team: 'Gorlocks', is_sales_captain: true }),
  mkRosterRow({ full_contact_id: 'C-ADMIN',  sales_rep_id: 5008, full_name: 'Avery Admin',  member_type: 'Yellow Jacket', team: 'Gorlocks' }),
];

const ROSTER: Roster = {
  rows: ROSTER_ROWS,
  by_full_contact_id: new Map(ROSTER_ROWS.map((r) => [r.full_contact_id!, r])),
  by_sales_rep_id: new Map(ROSTER_ROWS.map((r) => [r.sales_rep_id!, r])),
};

// ─── Volunteers — minimal v1 shape; Stream C mutates the v2 fields ──────

function mkVolunteer(args: {
  id: string;
  member_type: MemberType | null;
  has_nest_access: boolean;
  full_contact_id?: string | null;
  sales_rep_id?: number | null;
  is_sales_captain?: boolean;
  thresholds_all_met?: boolean;
}): VolunteerOutput {
  return {
    id: args.id,
    full_contact_id: args.full_contact_id === undefined ? args.id : args.full_contact_id,
    sales_rep_id: args.sales_rep_id ?? null,
    name: args.id,
    initials: '',
    email: null,
    phone: null,
    team: null,
    team_id: null,
    member_type: args.member_type,
    volunteer_category: null,
    active: true,
    has_nest_access: args.has_nest_access,
    is_sales_captain: args.is_sales_captain ?? false,
    raised: 0,
    goal: null,
    metrics: { totalFundraising: 0, rateBowl: 0, wishesForTeachers: 0, totalPoints: 0 },
    thresholds: args.thresholds_all_met
      ? { totalFundraising: true, rateBowl: true, wishesForTeachers: true, totalPoints: true }
      : { totalFundraising: false, rateBowl: false, wishesForTeachers: false, totalPoints: false },
    tierId: null,
    rank: null,
    role: null,
    signals: null,
    momentum: null,
    currentSprint: null,
    levelId: null,
    compositePoints: null,
    rankDelta7d: null,
    sprintRank: null,
    weekPoints: null,
    fundraisingPercentile: null,
    activityPercentile: null,
  };
}

// ─── Pushes ──────────────────────────────────────────────────────────────
// 4 ended pushes (most recent first when sorted by ends_at DESC) + 1 active.

const PUSHES: PushRecord[] = [
  { id: 'push-active',  label: 'Active Sprint',  event_type: null, starts_at: '2026-05-12T00:00:00Z', ends_at: '2026-05-26T23:59:59Z', target_amount: null, active: true  },
  { id: 'push-ended-1', label: 'Ended Sprint 1', event_type: null, starts_at: '2026-04-01T00:00:00Z', ends_at: '2026-04-30T23:59:59Z', target_amount: null, active: false },
  { id: 'push-ended-2', label: 'Ended Sprint 2', event_type: null, starts_at: '2026-03-01T00:00:00Z', ends_at: '2026-03-31T23:59:59Z', target_amount: null, active: false },
  { id: 'push-ended-3', label: 'Ended Sprint 3', event_type: null, starts_at: '2026-02-01T00:00:00Z', ends_at: '2026-02-28T23:59:59Z', target_amount: null, active: false },
  { id: 'push-ended-4', label: 'Ended Sprint 4', event_type: null, starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-01-31T23:59:59Z', target_amount: null, active: false },
];

// ─── Credit records ──────────────────────────────────────────────────────
// timestamps chosen so each volunteer lands in the expected signal bucket.

function mkOppCredit(args: {
  full_contact_id: string;
  amount_dollars: number;
  timestamp: string;
  filename?: string;
}): CreditRecord {
  return {
    source_file: args.filename ?? `Gorlocks-${args.timestamp.replace(/[-:T.Z]/g, '').slice(0, 14)}.xlsx`,
    source_block: 'opportunities',
    source_row_number: 1,
    source_row_hash: `h-${args.full_contact_id}-${args.timestamp}`,
    source_file_fingerprint: `fp-${args.full_contact_id}-${args.timestamp}`,
    source_file_timestamp: args.timestamp,
    team_mascot_from_filename: 'Gorlocks',
    full_contact_id: args.full_contact_id,
    contact_full_name_raw: args.full_contact_id,
    opportunity_name: 'Test Donation',
    amount_dollars: args.amount_dollars,
    type: 'Cash',
  };
}

const CREDITS: CreditRecord[] = [
  // Rita Rising — credits in all 4 ended pushes + active push.
  mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2026-01-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2026-02-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2026-03-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2026-04-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 500, timestamp: '2026-05-20T12:00:00Z' }), // recent + in active window

  // Ron Rising — 3 of 4 ended + active (participation = 0.75).
  mkOppCredit({ full_contact_id: 'C-RISE-2', amount_dollars: 50, timestamp: '2026-02-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-RISE-2', amount_dollars: 50, timestamp: '2026-03-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-RISE-2', amount_dollars: 50, timestamp: '2026-04-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-RISE-2', amount_dollars: 200, timestamp: '2026-05-20T12:00:00Z' }),

  // Cora Coast — last credit 2026-05-04 (18d ago). Participation: 2 of 4 = 0.5. No active credit.
  mkOppCredit({ full_contact_id: 'C-COAST', amount_dollars: 50, timestamp: '2026-03-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-COAST', amount_dollars: 50, timestamp: '2026-04-15T12:00:00Z' }),
  mkOppCredit({ full_contact_id: 'C-COAST', amount_dollars: 200, timestamp: '2026-05-04T12:00:00Z' }), // > 14d ago, between sprints — not active push

  // Adam Atrisk — last credit 2026-01-15 (>127d ago). Participation 0 of 4 (the credit is in ended-4 only; wait that's an ended push).
  // Adjust: lastAction must be ≥21d ago AND participation=0. So: a single credit BEFORE the 4 recent ended pushes.
  mkOppCredit({ full_contact_id: 'C-RISK', amount_dollars: 50, timestamp: '2025-12-15T12:00:00Z' }), // before all 4 ended

  // Sam Silent — no credits at all. lastAction=null, participation=0 (0/4). → atRisk.

  // Connor Cap — captain, recent activity (so signals would fire); used for role test.
  mkOppCredit({ full_contact_id: 'C-CAP', amount_dollars: 100, timestamp: '2026-05-20T12:00:00Z' }),

  // Avery Admin — admin override.
  mkOppCredit({ full_contact_id: 'C-ADMIN', amount_dollars: 100, timestamp: '2026-05-20T12:00:00Z' }),
];

// ─── Test setup ──────────────────────────────────────────────────────────

const volunteers: VolunteerOutput[] = [
  mkVolunteer({ id: 'C-RISE-1', member_type: 'Yellow Jacket', has_nest_access: true }),
  mkVolunteer({ id: 'C-RISE-2', member_type: 'Future',        has_nest_access: true }),
  mkVolunteer({ id: 'C-COAST',  member_type: 'Future',        has_nest_access: true }),
  mkVolunteer({ id: 'C-RISK',   member_type: 'Future',        has_nest_access: true }),
  mkVolunteer({ id: 'C-SILENT', member_type: 'Yellow Jacket', has_nest_access: true }),
  mkVolunteer({ id: 'C-LIFE',   member_type: 'Life Member',   has_nest_access: false }),
  mkVolunteer({ id: 'C-CAP',    member_type: 'Yellow Jacket', has_nest_access: true, is_sales_captain: true }),
  mkVolunteer({ id: 'C-ADMIN',  member_type: 'Yellow Jacket', has_nest_access: true, thresholds_all_met: true }),
];

beforeAll(() => {
  computeMomentum({
    volunteers,
    creditRecords: CREDITS,
    pushes: PUSHES,
    roster: ROSTER,
    now: NOW,
  });
  computeCurrentSprint({
    volunteers,
    creditRecords: CREDITS,
    pushes: PUSHES,
    roster: ROSTER,
    now: NOW,
  });
  computeSignals({ volunteers, now: NOW });
  deriveRole({
    volunteers,
    roster: ROSTER,
    adminVolunteerIds: new Set(['C-ADMIN']),
  });
});

function find(id: string): VolunteerOutput {
  const v = volunteers.find((x) => x.id === id);
  if (!v) throw new Error(`volunteer ${id} not found in fixture`);
  return v;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('compute_momentum', () => {
  it('counts active sprints in the last 4 ended pushes', () => {
    expect(find('C-RISE-1').momentum?.activeSprintsLast4).toBe(4);
    expect(find('C-RISE-2').momentum?.activeSprintsLast4).toBe(3);
    expect(find('C-COAST').momentum?.activeSprintsLast4).toBe(2);
    expect(find('C-RISK').momentum?.activeSprintsLast4).toBe(0); // credit predates the 4 recent ended pushes
    expect(find('C-SILENT').momentum?.activeSprintsLast4).toBe(0);
  });

  it('computes sprintParticipationRate as activeSprintsLast4 / 4', () => {
    expect(find('C-RISE-1').momentum?.sprintParticipationRate).toBe(1.0);
    expect(find('C-RISE-2').momentum?.sprintParticipationRate).toBe(0.75);
    expect(find('C-COAST').momentum?.sprintParticipationRate).toBe(0.5);
    expect(find('C-RISK').momentum?.sprintParticipationRate).toBe(0);
    expect(find('C-SILENT').momentum?.sprintParticipationRate).toBe(0);
  });

  it('captures lastActionAt as the max credit batch timestamp', () => {
    expect(find('C-RISE-1').momentum?.lastActionAt).toBe('2026-05-20T12:00:00Z');
    expect(find('C-COAST').momentum?.lastActionAt).toBe('2026-05-04T12:00:00Z');
    expect(find('C-SILENT').momentum?.lastActionAt).toBeNull();
  });

  it('sets nextMilestoneActions: 0 when all 4 thresholds met, 1 otherwise', () => {
    expect(find('C-ADMIN').momentum?.nextMilestoneActions).toBe(0); // thresholds_all_met
    expect(find('C-RISE-1').momentum?.nextMilestoneActions).toBe(1);
  });

  it('returns momentum = null for non-Nest-access volunteers', () => {
    expect(find('C-LIFE').momentum).toBeNull();
  });

  it('limits participation denominator to the 4 most recent ended pushes after sorting', () => {
    const local = [mkVolunteer({ id: 'C-RISE-1', member_type: 'Yellow Jacket', has_nest_access: true })];
    const pushes: PushRecord[] = [
      { id: 'oldest', label: 'Oldest', event_type: null, starts_at: '2025-12-01T00:00:00Z', ends_at: '2025-12-31T00:00:00Z', target_amount: null, active: false },
      { id: 'newest', label: 'Newest', event_type: null, starts_at: '2026-04-01T00:00:00Z', ends_at: '2026-04-30T00:00:00Z', target_amount: null, active: false },
      { id: 'older', label: 'Older', event_type: null, starts_at: '2026-01-01T00:00:00Z', ends_at: '2026-01-31T00:00:00Z', target_amount: null, active: false },
      { id: 'middle', label: 'Middle', event_type: null, starts_at: '2026-02-01T00:00:00Z', ends_at: '2026-02-28T00:00:00Z', target_amount: null, active: false },
      { id: 'recent', label: 'Recent', event_type: null, starts_at: '2026-03-01T00:00:00Z', ends_at: '2026-03-31T00:00:00Z', target_amount: null, active: false },
    ];

    computeMomentum({
      volunteers: local,
      creditRecords: [mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2025-12-15T12:00:00Z' })],
      pushes,
      roster: ROSTER,
      now: NOW,
    });

    expect(local[0]!.momentum?.activeSprintsLast4).toBe(0);
    expect(local[0]!.momentum?.sprintParticipationRate).toBe(0);
  });

  it('excludes credits exactly at ended push ends_at from activeSprintsLast4', () => {
    const local = [mkVolunteer({ id: 'C-RISE-1', member_type: 'Yellow Jacket', has_nest_access: true })];
    computeMomentum({
      volunteers: local,
      creditRecords: [mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2026-04-30T23:59:59Z' })],
      pushes: PUSHES,
      roster: ROSTER,
      now: NOW,
    });

    expect(local[0]!.momentum?.activeSprintsLast4).toBe(0);
  });

  it('uses the same synthetic id fallback as compute_metrics for credit grouping', () => {
    const row = mkRosterRow({
      full_contact_id: '',
      sales_rep_id: 9001,
      full_name: 'Fallback Fran',
      member_type: 'Yellow Jacket',
      team: 'Gorlocks',
    });
    const roster: Roster = {
      rows: [row],
      by_full_contact_id: new Map([['', row]]),
      by_sales_rep_id: new Map([[9001, row]]),
    };
    const local = [
      mkVolunteer({
        id: 'rep_9001',
        member_type: 'Yellow Jacket',
        has_nest_access: true,
        full_contact_id: '',
        sales_rep_id: 9001,
      }),
    ];

    computeMomentum({
      volunteers: local,
      creditRecords: [mkOppCredit({ full_contact_id: '', amount_dollars: 100, timestamp: '2026-04-15T12:00:00Z' })],
      pushes: PUSHES,
      roster,
      now: NOW,
    });

    expect(local[0]!.momentum?.lastActionAt).toBe('2026-04-15T12:00:00Z');
    expect(local[0]!.momentum?.activeSprintsLast4).toBe(1);
  });
});

describe('compute_current_sprint', () => {
  it('populates fundraisingThisSprint from credits in the active window', () => {
    expect(find('C-RISE-1').currentSprint?.fundraisingThisSprint).toBe(500);
    expect(find('C-RISE-2').currentSprint?.fundraisingThisSprint).toBe(200);
  });

  it('returns zero dollars for volunteers with no in-window credits', () => {
    expect(find('C-COAST').currentSprint?.fundraisingThisSprint).toBe(0);
    expect(find('C-SILENT').currentSprint?.fundraisingThisSprint).toBe(0);
  });

  it('stamps the active sprint id', () => {
    expect(find('C-RISE-1').currentSprint?.sprintId).toBe('push-active');
  });

  it('leaves sharesThisSprint as null (no telemetry source yet)', () => {
    expect(find('C-RISE-1').currentSprint?.sharesThisSprint).toBeNull();
  });

  it('returns currentSprint = null for non-Nest-access volunteers', () => {
    expect(find('C-LIFE').currentSprint).toBeNull();
  });

  it('excludes credits exactly at active push ends_at', () => {
    const local = [mkVolunteer({ id: 'C-RISE-1', member_type: 'Yellow Jacket', has_nest_access: true })];
    computeCurrentSprint({
      volunteers: local,
      creditRecords: [mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2026-05-26T23:59:59Z' })],
      pushes: PUSHES,
      roster: ROSTER,
      now: NOW,
    });

    expect(local[0]!.currentSprint?.fundraisingThisSprint).toBe(0);
  });

  it('does not select a zero-width active push window', () => {
    const local = [mkVolunteer({ id: 'C-RISE-1', member_type: 'Yellow Jacket', has_nest_access: true })];
    computeCurrentSprint({
      volunteers: local,
      creditRecords: [mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2026-05-22T12:00:00Z' })],
      pushes: [
        { id: 'zero-width', label: 'Zero Width', event_type: null, starts_at: '2026-05-22T12:00:00Z', ends_at: '2026-05-22T12:00:00Z', target_amount: null, active: true },
      ],
      roster: ROSTER,
      now: NOW,
    });

    expect(local[0]!.currentSprint).toBeNull();
  });

  it('picks the latest active push with id-desc tiebreak and logs a warning', () => {
    const local = [mkVolunteer({ id: 'C-RISE-1', member_type: 'Yellow Jacket', has_nest_access: true })];
    const logs: Array<{ level: string; msg: string; extra: unknown }> = [];
    computeCurrentSprint({
      volunteers: local,
      creditRecords: [mkOppCredit({ full_contact_id: 'C-RISE-1', amount_dollars: 100, timestamp: '2026-05-20T12:00:00Z' })],
      pushes: [
        { id: 'push-a', label: 'A', event_type: null, starts_at: '2026-05-01T00:00:00Z', ends_at: '2026-06-01T00:00:00Z', target_amount: null, active: true },
        { id: 'push-c', label: 'C', event_type: null, starts_at: '2026-05-10T00:00:00Z', ends_at: '2026-06-01T00:00:00Z', target_amount: null, active: true },
        { id: 'push-b', label: 'B', event_type: null, starts_at: '2026-05-10T00:00:00Z', ends_at: '2026-06-01T00:00:00Z', target_amount: null, active: true },
      ],
      roster: ROSTER,
      now: NOW,
      logger: (level, msg, extra) => logs.push({ level, msg, extra }),
    });

    expect(local[0]!.currentSprint?.sprintId).toBe('push-c');
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ level: 'warn', msg: 'current_sprint:multiple_active_pushes' });
  });

  it('uses the same synthetic id fallback as compute_metrics for sprint credit', () => {
    const row = mkRosterRow({
      full_contact_id: '',
      sales_rep_id: 9001,
      full_name: 'Fallback Fran',
      member_type: 'Yellow Jacket',
      team: 'Gorlocks',
    });
    const roster: Roster = {
      rows: [row],
      by_full_contact_id: new Map([['', row]]),
      by_sales_rep_id: new Map([[9001, row]]),
    };
    const local = [
      mkVolunteer({
        id: 'rep_9001',
        member_type: 'Yellow Jacket',
        has_nest_access: true,
        full_contact_id: '',
        sales_rep_id: 9001,
      }),
    ];

    computeCurrentSprint({
      volunteers: local,
      creditRecords: [mkOppCredit({ full_contact_id: '', amount_dollars: 125, timestamp: '2026-05-20T12:00:00Z' })],
      pushes: PUSHES,
      roster,
      now: NOW,
    });

    expect(local[0]!.currentSprint?.fundraisingThisSprint).toBe(125);
    expect(local[0]!.currentSprint?.pointsThisSprint).toBe(125);
  });
});

describe('compute_signals', () => {
  it('marks high-activity volunteers as rising', () => {
    const s = find('C-RISE-1').signals;
    expect(s).not.toBeNull();
    expect(s?.rising).toBe(true);
    expect(s?.coasting).toBe(false);
    expect(s?.atRisk).toBe(false);
    expect(s?.signalReason).toMatch(/sprints active/);
  });

  it('marks 14-21 day quiet volunteers as coasting', () => {
    const s = find('C-COAST').signals;
    expect(s?.coasting).toBe(true);
    expect(s?.rising).toBe(false);
    expect(s?.atRisk).toBe(false);
    expect(s?.signalReason).toMatch(/days since last tracked activity/);
  });

  it('marks long-silent low-participation volunteers as at risk', () => {
    const s = find('C-RISK').signals;
    expect(s?.atRisk).toBe(true);
    expect(s?.signalReason).toMatch(/No tracked activity in/);
  });

  it('marks zero-credit volunteers as at risk with the "no activity recorded" reason', () => {
    const s = find('C-SILENT').signals;
    expect(s?.atRisk).toBe(true);
    expect(s?.signalReason).toBe('No tracked activity recorded');
  });

  it('returns signals = null for Life Members', () => {
    expect(find('C-LIFE').signals).toBeNull();
  });

  it('keeps at-risk precedence for no-credit volunteers with Infinity daysSince', () => {
    const local = [mkVolunteer({ id: 'C-SILENT', member_type: 'Yellow Jacket', has_nest_access: true })];
    local[0]!.momentum = {
      activeSprintsLast4: 0,
      lastActionAt: null,
      nextMilestoneActions: 1,
      sprintParticipationRate: null,
    };
    local[0]!.currentSprint = {
      sprintId: 'push-active',
      fundraisingThisSprint: 500,
      pointsThisSprint: 500,
      sharesThisSprint: null,
    };

    computeSignals({ volunteers: local, now: NOW });

    expect(local[0]!.signals).toEqual({
      rising: false,
      coasting: false,
      atRisk: true,
      signalReason: 'No tracked activity recorded',
    });
  });

  it('does not produce NaN in the rising reason denominator', () => {
    const local = [mkVolunteer({ id: 'C-RISE-1', member_type: 'Yellow Jacket', has_nest_access: true })];
    local[0]!.momentum = {
      activeSprintsLast4: 3,
      lastActionAt: '2026-05-20T12:00:00Z',
      nextMilestoneActions: 1,
      sprintParticipationRate: 0.75,
    };
    local[0]!.currentSprint = {
      sprintId: 'push-active',
      fundraisingThisSprint: 100,
      pointsThisSprint: 100,
      sharesThisSprint: null,
    };

    computeSignals({ volunteers: local, now: NOW });

    expect(local[0]!.signals?.rising).toBe(true);
    expect(local[0]!.signals?.signalReason).toBe('3 of last 4 sprints active');
  });
});

describe('derive_role', () => {
  it('promotes the admin override set first', () => {
    expect(find('C-ADMIN').role).toBe('admin');
  });

  it('marks sales captains second', () => {
    expect(find('C-CAP').role).toBe('sales_captain');
  });

  it('defaults Nest-accessible volunteers to volunteer', () => {
    expect(find('C-RISE-1').role).toBe('volunteer');
  });

  it('leaves role = null for non-Nest-access volunteers', () => {
    expect(find('C-LIFE').role).toBeNull();
  });
});

describe('Stream C synthetic org_uncredited row', () => {
  it('leaves all four v2 extension fields null', () => {
    const local = [
      mkVolunteer({
        id: 'org_uncredited',
        member_type: null,
        has_nest_access: false,
        full_contact_id: null,
        sales_rep_id: null,
      }),
    ];

    computeMomentum({
      volunteers: local,
      creditRecords: CREDITS,
      pushes: PUSHES,
      roster: ROSTER,
      now: NOW,
    });
    computeCurrentSprint({
      volunteers: local,
      creditRecords: CREDITS,
      pushes: PUSHES,
      roster: ROSTER,
      now: NOW,
    });
    computeSignals({ volunteers: local, now: NOW });
    deriveRole({ volunteers: local, roster: ROSTER });

    expect(local[0]!.momentum).toBeNull();
    expect(local[0]!.currentSprint).toBeNull();
    expect(local[0]!.signals).toBeNull();
    expect(local[0]!.role).toBeNull();
  });
});
