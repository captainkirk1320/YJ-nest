// Populate volunteers.signals per architecture/sop_signals.md.
//
// Stream C — runs AFTER compute_momentum + compute_current_sprint.
// Mutates volunteers in place. Reads momentum + currentSprint off the row.
//
// Rule precedence (first match wins; mutual exclusion is structural):
//   1. atRisk    — daysSinceLastAction >= 21 AND participation in {null, 0}
//   2. coasting  — daysSinceLastAction >= 14
//   3. rising    — daysSinceLastAction <= 7
//                   AND currentSprint.fundraisingThisSprint > 0
//                   AND participation >= 0.75
//   4. none      — all three false, signalReason = null
//
// Gate: only YJ + Future with has_nest_access. Everyone else → signals = null.

import type { VolunteerOutput } from './types.js';

const MS_PER_DAY = 86_400_000;

export type ComputeSignalsOptions = {
  volunteers: VolunteerOutput[];
  now: Date;
};

export function computeSignals(opts: ComputeSignalsOptions): void {
  const nowMs = opts.now.getTime();

  for (const v of opts.volunteers) {
    if (!v.has_nest_access) {
      v.signals = null;
      continue;
    }
    if (v.member_type !== 'Yellow Jacket' && v.member_type !== 'Future') {
      v.signals = null;
      continue;
    }

    const momentum = v.momentum; // populated by compute_momentum
    const lastActionAt = momentum?.lastActionAt ?? null;
    const participation = momentum?.sprintParticipationRate ?? null;
    const sprintDollars = v.currentSprint?.fundraisingThisSprint ?? null;

    const daysSince =
      lastActionAt === null
        ? Number.POSITIVE_INFINITY
        : Math.floor((nowMs - Date.parse(lastActionAt)) / MS_PER_DAY);

    // Priority 1 — atRisk.
    if (
      daysSince >= 21 &&
      (participation === null || participation === 0)
    ) {
      v.signals = {
        rising: false,
        coasting: false,
        atRisk: true,
        signalReason:
          lastActionAt === null
            ? 'No tracked activity recorded'
            : `No tracked activity in ${daysSince} days`,
      };
      continue;
    }

    // Priority 2 — coasting.
    if (daysSince >= 14) {
      v.signals = {
        rising: false,
        coasting: true,
        atRisk: false,
        signalReason: `${daysSince} days since last tracked activity`,
      };
      continue;
    }

    // Priority 3 — rising.
    if (
      daysSince <= 7 &&
      sprintDollars !== null &&
      sprintDollars > 0 &&
      participation !== null &&
      participation >= 0.75
    ) {
      const active = momentum?.activeSprintsLast4 ?? 0;
      const denom = participation > 0 ? Math.round(active / participation) : 4;
      v.signals = {
        rising: true,
        coasting: false,
        atRisk: false,
        signalReason: `${active} of last ${denom} sprints active`,
      };
      continue;
    }

    // Priority 4 — none.
    v.signals = {
      rising: false,
      coasting: false,
      atRisk: false,
      signalReason: null,
    };
  }
}
