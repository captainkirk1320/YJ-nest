// Populate volunteers.currentSprint per architecture/sop_current_sprint.md.
//
// Stream C — runs after compute_metrics. Mutates volunteers in place.
//
// Active push: P.active === true AND P.starts_at <= now < P.ends_at.
// Multiple matches → pick latest starts_at (tiebreak by id desc, log warn).
// No match → every volunteer's currentSprint = null.
//
// In-window dollars/points come from SF credit records only — Unify rows have
// no per-row date and cannot be assigned to a push window (see SOP §"Why
// Unify rows are not aggregated here").
//
// sharesThisSprint stays null until share telemetry exists.

import type {
  CreditRecord,
  PushRecord,
  Roster,
  VolunteerOutput,
} from './types.js';

const POINTS_MULTIPLIER = 1.0;

export type ComputeCurrentSprintOptions = {
  volunteers: VolunteerOutput[];
  creditRecords: CreditRecord[];
  pushes: PushRecord[];
  roster: Roster;
  now: Date;
  logger?: (level: 'info' | 'warn' | 'error', msg: string, extra?: unknown) => void;
};

function pickActivePush(pushes: PushRecord[], nowMs: number): PushRecord | null {
  const candidates = pushes.filter((p) => {
    if (!p.active) return false;
    const s = Date.parse(p.starts_at);
    const e = Date.parse(p.ends_at);
    return s <= nowMs && nowMs < e;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const sd = Date.parse(b.starts_at) - Date.parse(a.starts_at);
    if (sd !== 0) return sd;
    return b.id.localeCompare(a.id);
  });
  return candidates[0]!;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeCurrentSprint(opts: ComputeCurrentSprintOptions): void {
  const { volunteers, creditRecords, pushes, roster, now, logger } = opts;
  const nowMs = now.getTime();

  const activePush = pickActivePush(pushes, nowMs);
  if (!activePush) {
    for (const v of volunteers) v.currentSprint = null;
    return;
  }

  const overlappingActive = pushes.filter((p) => {
    if (!p.active) return false;
    const s = Date.parse(p.starts_at);
    const e = Date.parse(p.ends_at);
    return s <= nowMs && nowMs < e;
  });
  if (overlappingActive.length > 1 && logger) {
    logger('warn', 'current_sprint:multiple_active_pushes', {
      picked: activePush.id,
      candidates: overlappingActive.map((p) => p.id),
    });
  }

  const windowStart = Date.parse(activePush.starts_at);
  const windowEnd = Date.parse(activePush.ends_at);

  type Acc = { fundraisingThisSprint: number; pointsThisSprint: number };
  const accById = new Map<string, Acc>();
  const ensure = (id: string): Acc => {
    let a = accById.get(id);
    if (!a) {
      a = { fundraisingThisSprint: 0, pointsThisSprint: 0 };
      accById.set(id, a);
    }
    return a;
  };

  for (const c of creditRecords) {
    const ts = Date.parse(c.source_file_timestamp);
    if (ts < windowStart || ts >= windowEnd) continue;

    const row = roster.by_full_contact_id.get(c.full_contact_id);
    if (!row) continue;
    const id = row.full_contact_id ?? (row.sales_rep_id != null ? `rep_${row.sales_rep_id}` : null);
    if (!id) continue;

    const acc = ensure(id);
    if (c.source_block === 'opportunities') {
      acc.fundraisingThisSprint += c.amount_dollars;
      acc.pointsThisSprint += c.amount_dollars * POINTS_MULTIPLIER;
    } else {
      acc.pointsThisSprint += c.amount_points;
    }
  }

  for (const v of volunteers) {
    if (!v.has_nest_access) {
      v.currentSprint = null;
      continue;
    }
    const a = accById.get(v.id) ?? { fundraisingThisSprint: 0, pointsThisSprint: 0 };
    v.currentSprint = {
      sprintId: activePush.id,
      fundraisingThisSprint: round2(a.fundraisingThisSprint),
      pointsThisSprint: Math.round(a.pointsThisSprint),
      sharesThisSprint: null,
    };
  }
}
