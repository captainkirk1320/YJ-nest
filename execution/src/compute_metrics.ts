// Metric aggregation + Good Standing + tier + rank + team rollups.
// SOPs:
//   - architecture/sop_item_categorization.md
//   - architecture/sop_metrics_and_good_standing.md
//   - architecture/sop_tier_calculation.md

import { IngestErrorCollector } from './ingest_errors.js';
import { ORG_UNCREDITED_ID } from './apply_exceptions.js';
import type {
  AdjustException,
  CreditRecord,
  ParsedException,
  RepAllocation,
  Roster,
  RosterRow,
  TeamOutput,
  TierId,
  VolunteerOutput,
} from './types.js';

// ─── Item categorization table ────────────────────────────────────────────
// Mirrors the seed in sop_item_categorization.md.
// Will be loaded from Supabase item_patterns table in production.

type ItemPattern = {
  pattern: string;
  contributes_to_total_fundraising: boolean;
  contributes_to_rate_bowl: boolean;
  contributes_to_wishes_for_teachers: boolean;
  points_multiplier: number;
};

export const DEFAULT_ITEM_PATTERNS: ItemPattern[] = [
  { pattern: 'PARKING - Rate Bowl',  contributes_to_total_fundraising: true, contributes_to_rate_bowl: true,  contributes_to_wishes_for_teachers: false, points_multiplier: 1.0 },
  { pattern: 'Rate Bowl',            contributes_to_total_fundraising: true, contributes_to_rate_bowl: true,  contributes_to_wishes_for_teachers: false, points_multiplier: 1.0 },
  { pattern: 'Wishes for Teachers',  contributes_to_total_fundraising: true, contributes_to_rate_bowl: false, contributes_to_wishes_for_teachers: true,  points_multiplier: 1.0 },
  { pattern: 'Par 3 Challenge',      contributes_to_total_fundraising: true, contributes_to_rate_bowl: false, contributes_to_wishes_for_teachers: false, points_multiplier: 1.0 },
  { pattern: 'Football Kickoff',     contributes_to_total_fundraising: true, contributes_to_rate_bowl: false, contributes_to_wishes_for_teachers: false, points_multiplier: 1.0 },
  { pattern: 'KOE',                  contributes_to_total_fundraising: true, contributes_to_rate_bowl: false, contributes_to_wishes_for_teachers: false, points_multiplier: 1.0 },
  { pattern: 'Fiesta Bowl',          contributes_to_total_fundraising: true, contributes_to_rate_bowl: false, contributes_to_wishes_for_teachers: false, points_multiplier: 1.0 },
];

const FALLTHROUGH_PATTERN: ItemPattern = {
  pattern: '*',
  contributes_to_total_fundraising: true,
  contributes_to_rate_bowl: false,
  contributes_to_wishes_for_teachers: false,
  points_multiplier: 1.0,
};

function categorizeItem(item: string, patterns: ItemPattern[]): ItemPattern {
  const lower = item.toLowerCase();
  for (const p of patterns) {
    if (lower.includes(p.pattern.toLowerCase())) return p;
  }
  return FALLTHROUGH_PATTERN;
}

// ─── Tier ladder ──────────────────────────────────────────────────────────
// Mirrors volunteer-impact-dashboard-v2/src/constants.ts INCENTIVE_TIERS.

type TierRow = {
  id: TierId;
  threshold: number;
  thresholdFuture: number | null;
  minFundraising: number | null;
  minFundraisingFuture: number | null;
};

export const INCENTIVE_TIERS: TierRow[] = [
  { id: 'walk-on',        threshold: 17500,  thresholdFuture: 15000, minFundraising: 10000, minFundraisingFuture: 7500 },
  { id: 'starter',        threshold: 30000,  thresholdFuture: null,  minFundraising: null,  minFundraisingFuture: null },
  { id: 'captain',        threshold: 50000,  thresholdFuture: null,  minFundraising: null,  minFundraisingFuture: null },
  { id: 'all-conference', threshold: 75000,  thresholdFuture: null,  minFundraising: null,  minFundraisingFuture: null },
  { id: 'all-american',   threshold: 100000, thresholdFuture: null,  minFundraising: null,  minFundraisingFuture: null },
  { id: 'heisman',        threshold: 200000, thresholdFuture: null,  minFundraising: null,  minFundraisingFuture: null },
];

function tierFor(points: number, dollars: number, memberType: string): TierId | null {
  const isFuture = memberType === 'Future';
  let result: TierId | null = null;
  for (const t of INCENTIVE_TIERS) {
    const pointsThreshold = isFuture && t.thresholdFuture != null ? t.thresholdFuture : t.threshold;
    const dollarsThreshold =
      isFuture && t.minFundraisingFuture != null
        ? t.minFundraisingFuture
        : (t.minFundraising ?? 0);
    if (points >= pointsThreshold && dollars >= dollarsThreshold) {
      result = t.id;
    }
  }
  return result;
}

// ─── Per-volunteer metric accumulator ─────────────────────────────────────

type Acc = {
  totalFundraising: number;
  rateBowl: number;
  wishesForTeachers: number;
  totalPoints: number;
};

function newAcc(): Acc {
  return { totalFundraising: 0, rateBowl: 0, wishesForTeachers: 0, totalPoints: 0 };
}

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const f = parts[0]?.[0] ?? '';
  const l = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (f + l).toUpperCase();
}

function teamSlug(team: string): string {
  return team
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function volunteerCategoryFor(mt: RosterRow['member_type']): VolunteerOutput['volunteer_category'] {
  if (mt === 'Yellow Jacket' || mt === 'Board') return 'Active';
  if (mt === 'Future') return 'Future';
  if (mt === 'Life Member') return 'Life Member';
  if (mt === 'Life Director') return 'Life Director';
  return null;
}

function syntheticId(row: RosterRow): string {
  if (row.full_contact_id) return row.full_contact_id;
  if (row.sales_rep_id != null) return `rep_${row.sales_rep_id}`;
  throw new Error(`Roster row for "${row.full_name}" has neither full_contact_id nor sales_rep_id — should have been dropped at preflight.`);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─── Main entry point ─────────────────────────────────────────────────────

export type ComputeMetricsOptions = {
  unifyAllocations: RepAllocation[];
  creditRecords: CreditRecord[];
  exceptions: ParsedException[];
  roster: Roster;
  errors: IngestErrorCollector;
  itemPatterns?: ItemPattern[];
};

export type ComputeMetricsResult = {
  volunteers: VolunteerOutput[];
  teams: TeamOutput[];
};

/**
 * Filter credit records to the latest source_file_timestamp batch.
 *
 * 2026-05-22 multi-team-per-file update: supersession is GLOBAL across all
 * current-season credit records. The latest `source_file_timestamp` wins;
 * older batches are silently dropped. This holds whether the run contains
 * one production multi-team file, several legacy single-team fixtures, or a
 * mix (Codex DIM-6 — mixed runs must not double-count overlapping volunteers).
 *
 * Same-timestamp ties (Codex F4): if two distinct source files share the
 * latest `source_file_timestamp` with different fingerprints, BOTH batches
 * are dropped and an `ambiguous_credit_batch_timestamp` warning is emitted.
 * The tie-detection logic is retained as a defensive guard under single-file
 * delivery — ties are unlikely but not impossible.
 *
 * Historical-baseline credits MUST be filtered out BEFORE this function runs —
 * they live on a separate track with their own per-prior-season supersession.
 * See sop_historical_baseline_ingest.md.
 */
export function filterToLatestCreditBatch(
  creditRecords: CreditRecord[],
  errors: IngestErrorCollector,
): CreditRecord[] {
  if (creditRecords.length === 0) return creditRecords;

  let latestTs = '';
  for (const r of creditRecords) {
    if (r.source_file_timestamp > latestTs) latestTs = r.source_file_timestamp;
  }

  const fingerprintsAtLatest = new Set<string>();
  for (const r of creditRecords) {
    if (r.source_file_timestamp === latestTs) fingerprintsAtLatest.add(r.source_file_fingerprint);
  }
  if (fingerprintsAtLatest.size > 1) {
    const offendingFiles = Array.from(
      new Set(
        creditRecords
          .filter((r) => r.source_file_timestamp === latestTs)
          .map((r) => r.source_file),
      ),
    );
    errors.add({
      kind: 'ambiguous_credit_batch_timestamp',
      detail: {
        timestamp: latestTs,
        source_files: offendingFiles,
        reason:
          'Two distinct credit-export files share the latest timestamp. ' +
          'Resolve by deleting one or amending its filename timestamp before re-running.',
      },
    });
    return []; // drop both batches; no current-season SF credit this run
  }

  return creditRecords.filter((r) => r.source_file_timestamp === latestTs);
}

// Legacy alias retained for code that imported the prior name.
export const filterToLatestCreditBatchPerTeam = filterToLatestCreditBatch;

export function computeMetrics(opts: ComputeMetricsOptions): ComputeMetricsResult {
  const { unifyAllocations, exceptions, roster, errors } = opts;
  const creditRecords = filterToLatestCreditBatch(opts.creditRecords, errors);
  const itemPatterns = opts.itemPatterns ?? DEFAULT_ITEM_PATTERNS;

  // Build accumulator keyed by volunteer synthetic id.
  const accByVolunteerId = new Map<string, Acc>();
  const ensureAcc = (id: string): Acc => {
    let a = accByVolunteerId.get(id);
    if (!a) {
      a = newAcc();
      accByVolunteerId.set(id, a);
    }
    return a;
  };

  // Phase 1a — Unify allocations.
  for (const alloc of unifyAllocations) {
    let volunteer_id: string;
    if (alloc.is_org_uncredited) {
      volunteer_id = ORG_UNCREDITED_ID;
    } else if (alloc.sales_rep_id != null) {
      const row = roster.by_sales_rep_id.get(alloc.sales_rep_id);
      if (!row) {
        // Should not happen if apply_exceptions did its job — SPLIT exceptions
        // were validated against the roster at parse time, and unknown reps
        // for default split are filtered out. But defensive: log and skip.
        errors.add({
          kind: 'unknown_sales_rep_id',
          source_file: alloc.source_file,
          source_row_hash: alloc.source_row_hash,
          sales_rep_id: alloc.sales_rep_id,
          detail: { reason: 'allocation references rep not in roster (post-split)' },
        });
        continue;
      }
      volunteer_id = syntheticId(row);
    } else {
      continue;
    }

    const pattern = categorizeItem(alloc.item, itemPatterns);
    const acc = ensureAcc(volunteer_id);
    const dollars = alloc.amount_dollars;
    if (pattern.contributes_to_total_fundraising) acc.totalFundraising += dollars;
    if (pattern.contributes_to_rate_bowl) acc.rateBowl += dollars;
    if (pattern.contributes_to_wishes_for_teachers) acc.wishesForTeachers += dollars;
    acc.totalPoints += dollars * pattern.points_multiplier;
  }

  // Phase 1b — SF credit records.
  // Left block (opportunities): iterate routing_metrics; each named dim gets
  // the full amount (additive, not split) per
  // sop_volunteer_credit_routing.md § Routing precedence.
  // Right block (volunteer points): totalPoints only.
  // Defensive: track which (volunteer, source_row_hash) we've already routed,
  // so a row is never double-credited within a single run even if duplicate
  // records leak through dedup upstream.
  const seenLeftRows = new Set<string>();
  for (const credit of creditRecords) {
    const row = roster.by_full_contact_id.get(credit.full_contact_id);
    if (!row) continue;
    const id = syntheticId(row);
    const acc = ensureAcc(id);
    if (credit.source_block === 'opportunities') {
      // Include source_row_number so two legitimate identical rows on the same
      // sheet are NOT collapsed (Codex DIM-1). source_row_hash hashes the
      // semantic content; the row number distinguishes the physical sheet rows.
      const key = `${id}::${credit.source_row_number}::${credit.source_row_hash}::${credit.source_file_fingerprint}`;
      if (seenLeftRows.has(key)) continue;
      seenLeftRows.add(key);
      const routes = Array.isArray(credit.routing_metrics) ? credit.routing_metrics : [];
      // Each routed metric receives the full amount once. Iterate a Set so
      // an accidentally-duplicated entry in routing_metrics (e.g. data drift
      // in seed SQL) doesn't double-count within the same row.
      const seenMetric = new Set<string>();
      for (const m of routes) {
        if (seenMetric.has(m)) continue;
        seenMetric.add(m);
        switch (m) {
          case 'total_fundraising': acc.totalFundraising  += credit.amount_dollars; break;
          case 'rate_bowl':         acc.rateBowl           += credit.amount_dollars; break;
          case 'wishes_for_teachers': acc.wishesForTeachers += credit.amount_dollars; break;
          case 'total_points':      acc.totalPoints        += credit.amount_dollars * 1.0; break;
        }
      }
    } else {
      acc.totalPoints += credit.amount_points;
    }
  }

  // Phase 2 — ADJUST exceptions.
  const adjustExceptions = exceptions.filter(
    (e): e is AdjustException => e.type === 'ADJUST' && e.active,
  );
  for (const exc of adjustExceptions) {
    for (const adj of exc.adjustments) {
      const row = roster.by_sales_rep_id.get(adj.sales_rep_id);
      if (!row) continue; // Validated at exception-parse time.
      const id = syntheticId(row);
      const acc = ensureAcc(id);
      switch (adj.metric) {
        case 'total_fundraising': acc.totalFundraising += adj.amount; break;
        case 'rate_bowl':         acc.rateBowl         += adj.amount; break;
        case 'wishes_for_teachers': acc.wishesForTeachers += adj.amount; break;
        case 'total_points':      acc.totalPoints      += adj.amount; break;
      }
    }
  }

  // ─── Build VolunteerOutput rows ─────────────────────────────────────
  const volunteers: VolunteerOutput[] = [];

  for (const row of roster.rows) {
    const id = syntheticId(row);
    const acc = accByVolunteerId.get(id) ?? newAcc();
    const isYjOrFuture = row.member_type === 'Yellow Jacket' || row.member_type === 'Future';
    const hasNestAccess = isYjOrFuture && row.active;

    const thresholds = isYjOrFuture
      ? {
          totalFundraising: acc.totalFundraising >= 10_000,
          rateBowl: acc.rateBowl >= 2_000,
          wishesForTeachers: acc.wishesForTeachers >= 1_000,
          totalPoints: acc.totalPoints >= 17_500,
        }
      : {
          totalFundraising: null,
          rateBowl: null,
          wishesForTeachers: null,
          totalPoints: null,
        };

    const tier =
      acc.totalPoints > 0
        ? tierFor(acc.totalPoints, acc.totalFundraising, row.member_type)
        : null;

    volunteers.push({
      id,
      full_contact_id: row.full_contact_id,
      sales_rep_id: row.sales_rep_id,
      name: row.full_name,
      initials: initials(row.full_name),
      email: row.email,
      phone: row.phone,
      team: row.team,
      team_id: row.team ? teamSlug(row.team) : null,
      member_type: row.member_type,
      volunteer_category: volunteerCategoryFor(row.member_type),
      active: row.active,
      has_nest_access: hasNestAccess,
      is_sales_captain: row.is_sales_captain,
      raised: round2(acc.totalFundraising),
      goal: isYjOrFuture ? 10_000 : null,
      last_year_fundraising_dollars: row.last_year_fundraising_dollars,
      last_year_fundraising_rank: row.last_year_fundraising_rank,
      metrics: {
        totalFundraising: round2(acc.totalFundraising),
        rateBowl: round2(acc.rateBowl),
        wishesForTeachers: round2(acc.wishesForTeachers),
        totalPoints: Math.round(acc.totalPoints),
      },
      thresholds,
      tierId: tier,
      rank: null, // assigned below
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
    });
  }

  // ─── org_uncredited synthetic row ──────────────────────────────────
  const ouAcc = accByVolunteerId.get(ORG_UNCREDITED_ID);
  if (ouAcc) {
    volunteers.push({
      id: ORG_UNCREDITED_ID,
      full_contact_id: null,
      sales_rep_id: null,
      name: '(Uncredited — staff-closed sales)',
      initials: '—',
      email: null,
      phone: null,
      team: null,
      team_id: null,
      member_type: null,
      volunteer_category: null,
      active: true,
      has_nest_access: false,
      is_sales_captain: false,
      raised: round2(ouAcc.totalFundraising),
      goal: null,
      last_year_fundraising_dollars: null,
      last_year_fundraising_rank: null,
      metrics: {
        totalFundraising: round2(ouAcc.totalFundraising),
        rateBowl: round2(ouAcc.rateBowl),
        wishesForTeachers: round2(ouAcc.wishesForTeachers),
        totalPoints: Math.round(ouAcc.totalPoints),
      },
      thresholds: {
        totalFundraising: null,
        rateBowl: null,
        wishesForTeachers: null,
        totalPoints: null,
      },
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
    });
  }

  // ─── Rank ──────────────────────────────────────────────────────────
  // Only Nest-accessible volunteers get a rank.
  const rankable = volunteers.filter((v) => v.has_nest_access);
  rankable.sort((a, b) => {
    if (b.metrics.totalPoints !== a.metrics.totalPoints) return b.metrics.totalPoints - a.metrics.totalPoints;
    if (b.metrics.totalFundraising !== a.metrics.totalFundraising) return b.metrics.totalFundraising - a.metrics.totalFundraising;
    return a.name.localeCompare(b.name);
  });
  rankable.forEach((v, i) => {
    v.rank = i + 1;
  });

  // ─── Team rollups ──────────────────────────────────────────────────
  const teamAcc = new Map<string, {
    name: string;
    raised: number;
    totalPoints: number;
    rateBowl: number;
    wishesForTeachers: number;
    volunteerCount: number;
    goodStandingCount: number;
  }>();

  for (const v of volunteers) {
    if (!v.has_nest_access || !v.team || !v.team_id) continue;
    let t = teamAcc.get(v.team_id);
    if (!t) {
      t = {
        name: v.team,
        raised: 0,
        totalPoints: 0,
        rateBowl: 0,
        wishesForTeachers: 0,
        volunteerCount: 0,
        goodStandingCount: 0,
      };
      teamAcc.set(v.team_id, t);
    }
    t.raised += v.metrics.totalFundraising;
    t.totalPoints += v.metrics.totalPoints;
    t.rateBowl += v.metrics.rateBowl;
    t.wishesForTeachers += v.metrics.wishesForTeachers;
    t.volunteerCount += 1;
    const allTrue =
      v.thresholds.totalFundraising === true &&
      v.thresholds.rateBowl === true &&
      v.thresholds.wishesForTeachers === true &&
      v.thresholds.totalPoints === true;
    if (allTrue) t.goodStandingCount += 1;
  }

  const teamsArr: Array<Omit<TeamOutput, 'rank'>> = [];
  for (const [id, t] of teamAcc.entries()) {
    teamsArr.push({
      id,
      name: t.name,
      raised: round2(t.raised),
      totalPoints: Math.round(t.totalPoints),
      rateBowl: round2(t.rateBowl),
      wishesForTeachers: round2(t.wishesForTeachers),
      volunteerCount: t.volunteerCount,
      goodStandingCount: t.goodStandingCount,
      goal: null,
    });
  }
  teamsArr.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.raised !== a.raised) return b.raised - a.raised;
    return a.name.localeCompare(b.name);
  });
  const teams: TeamOutput[] = teamsArr.map((t, i) => ({ ...t, rank: i + 1 }));

  return { volunteers, teams };
}
