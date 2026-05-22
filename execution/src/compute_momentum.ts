// Populate volunteers.momentum per architecture/sop_momentum.md.
//
// Stream C — runs after compute_metrics. Mutates volunteers in place.
//
// Per-volunteer outputs:
//   activeSprintsLast4         — count over the ≤4 most recently ended pushes.
//   lastActionAt               — max credit batch timestamp attributed to V.
//   nextMilestoneActions       — 0 if all 4 thresholds true, else 1; null for
//                                 Board / Life Member / Life Director.
//   sprintParticipationRate    — activeSprintsLast4 / min(4, endedCount), or
//                                 null when endedCount === 0.
//
// Volunteers without Nest access get momentum = null.

import type {
  CreditRecord,
  PushRecord,
  Roster,
  RosterRow,
  VolunteerOutput,
} from './types.js';

export type ComputeMomentumOptions = {
  volunteers: VolunteerOutput[];
  creditRecords: CreditRecord[];
  pushes: PushRecord[];
  roster: Roster;
  now: Date;
};

function syntheticVolunteerId(row: RosterRow): string | null {
  if (row.full_contact_id) return row.full_contact_id;
  if (row.sales_rep_id != null) return `rep_${row.sales_rep_id}`;
  return null;
}

export function computeMomentum(opts: ComputeMomentumOptions): void {
  const { volunteers, creditRecords, pushes, roster, now } = opts;
  const nowMs = now.getTime();

  // Most recently ended pushes, max 4.
  const recentEnded = pushes
    .filter((p) => Date.parse(p.ends_at) <= nowMs)
    .sort((a, b) => Date.parse(b.ends_at) - Date.parse(a.ends_at))
    .slice(0, 4);
  const denom = recentEnded.length;

  // Group credits by volunteer id (synthetic PK).
  const creditsByVolunteerId = new Map<string, CreditRecord[]>();
  for (const c of creditRecords) {
    const row = roster.by_full_contact_id.get(c.full_contact_id);
    if (!row) continue;
    const id = syntheticVolunteerId(row);
    if (!id) continue;
    let bucket = creditsByVolunteerId.get(id);
    if (!bucket) {
      bucket = [];
      creditsByVolunteerId.set(id, bucket);
    }
    bucket.push(c);
  }

  for (const v of volunteers) {
    if (!v.has_nest_access) {
      v.momentum = null;
      continue;
    }

    const credits = creditsByVolunteerId.get(v.id) ?? [];

    // lastActionAt — max source_file_timestamp.
    let lastActionAt: string | null = null;
    for (const c of credits) {
      if (lastActionAt === null || c.source_file_timestamp > lastActionAt) {
        lastActionAt = c.source_file_timestamp;
      }
    }

    // activeSprintsLast4.
    let activeSprintsLast4 = 0;
    for (const push of recentEnded) {
      const ps = Date.parse(push.starts_at);
      const pe = Date.parse(push.ends_at);
      const wasActive = credits.some((c) => {
        const ts = Date.parse(c.source_file_timestamp);
        return ts >= ps && ts < pe;
      });
      if (wasActive) activeSprintsLast4 += 1;
    }

    const sprintParticipationRate = denom > 0 ? activeSprintsLast4 / denom : null;

    // nextMilestoneActions — count thresholds-based runway, null for non-YJ/Future.
    let nextMilestoneActions: number | null;
    if (
      v.member_type === 'Board' ||
      v.member_type === 'Life Member' ||
      v.member_type === 'Life Director' ||
      v.member_type === null
    ) {
      nextMilestoneActions = null;
    } else {
      const t = v.thresholds;
      const allMet =
        t.totalFundraising === true &&
        t.rateBowl === true &&
        t.wishesForTeachers === true &&
        t.totalPoints === true;
      nextMilestoneActions = allMet ? 0 : 1;
    }

    v.momentum = {
      activeSprintsLast4,
      lastActionAt,
      nextMilestoneActions,
      sprintParticipationRate,
    };
  }
}
