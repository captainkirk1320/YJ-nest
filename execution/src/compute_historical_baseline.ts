// Historical baseline ingest.
// SOP: architecture/sop_historical_baseline_ingest.md
//
// Aggregates left-block (opportunities) dollars from credit-export files whose
// `opportunities_date_range.end` predates the current season window, and
// populates RosterRow.last_year_fundraising_dollars + last_year_fundraising_rank.
// Does NOT touch metrics.totalFundraising, tier, Good Standing, or rank.

import { IngestErrorCollector } from './ingest_errors.js';
import type {
  CreditDollarsRecord,
  CreditRecord,
  Roster,
  RosterRow,
} from './types.js';

export type HistoricalBaselineInput = {
  creditRecords: CreditRecord[]; // pre-filtered to records from historical files
  roster: Roster;
  errors: IngestErrorCollector;
};

export type HistoricalBaselineResult = {
  // FCID → { dollars, rank } that was applied to the roster.
  appliedByFcid: Map<string, { dollars: number; rank: number }>;
};

/**
 * Classify whether a credit-export file is historical based on its
 * `opportunities_date_range.end`. Returns `true` when the file is strictly
 * earlier than `SEASON_YEAR-01-01`, `false` otherwise (including null/unparseable
 * date ranges — those fall back to current-season).
 *
 * `seasonYear` defaults to the current calendar year. Override via env var or
 * direct argument at the orchestrator boundary.
 */
export function isHistoricalFile(opts: {
  opportunitiesDateRangeEnd: string | null;
  seasonYear: number;
}): boolean {
  if (!opts.opportunitiesDateRangeEnd) return false;
  // ISO yyyy-mm-dd. Strict-less-than comparison on yyyy-mm-dd strings is safe.
  return opts.opportunitiesDateRangeEnd < `${opts.seasonYear}-01-01`;
}

/**
 * Within a single prior-season window, apply the same latest-timestamp
 * supersede + tie-detection mechanic as compute_metrics. Codex DIM-2.
 * Returns the records from the latest batch only; drops both on tie and
 * emits `ambiguous_credit_batch_timestamp`.
 */
function filterToLatestBatchInWindow(
  records: CreditRecord[],
  errors: IngestErrorCollector,
  windowYear: string,
): CreditRecord[] {
  if (records.length === 0) return records;
  let latestTs = '';
  for (const r of records) {
    if (r.source_file_timestamp > latestTs) latestTs = r.source_file_timestamp;
  }
  const fingerprintsAtLatest = new Set<string>();
  for (const r of records) {
    if (r.source_file_timestamp === latestTs) fingerprintsAtLatest.add(r.source_file_fingerprint);
  }
  if (fingerprintsAtLatest.size > 1) {
    const offendingFiles = Array.from(
      new Set(records.filter((r) => r.source_file_timestamp === latestTs).map((r) => r.source_file)),
    );
    errors.add({
      kind: 'ambiguous_credit_batch_timestamp',
      detail: {
        historical_window_year: windowYear,
        timestamp: latestTs,
        source_files: offendingFiles,
        reason:
          'Two distinct historical credit-export files share the latest timestamp ' +
          `for prior-season window ${windowYear}. Resolve by deleting one or amending ` +
          'its filename timestamp before re-running.',
      },
    });
    return [];
  }
  return records.filter((r) => r.source_file_timestamp === latestTs);
}

/**
 * Detect multiple distinct prior-season windows in the input set. Within each
 * window, applies supersession (latest source_file_timestamp wins; ties drop
 * both with a warning). Across windows, keeps only the most recent prior-season
 * window and emits `multiple_historical_seasons_detected` for the rest.
 */
function selectMostRecentPriorSeason(
  creditRecords: CreditRecord[],
  errors: IngestErrorCollector,
): CreditRecord[] {
  if (creditRecords.length === 0) return creditRecords;

  // Group by opportunities_date_range.end year.
  const byWindow = new Map<string, CreditRecord[]>();
  for (const r of creditRecords) {
    const end = r.file_metadata.opportunities_date_range?.end ?? null;
    const year = end ? end.slice(0, 4) : '';
    let arr = byWindow.get(year);
    if (!arr) {
      arr = [];
      byWindow.set(year, arr);
    }
    arr.push(r);
  }

  if (byWindow.size > 1) {
    const years = Array.from(byWindow.keys()).sort((a, b) => b.localeCompare(a));
    const winnerYear = years[0]!;
    const dropped = years.slice(1);
    errors.add({
      kind: 'multiple_historical_seasons_detected',
      detail: {
        kept_window_year: winnerYear,
        dropped_window_years: dropped,
        reason:
          'More than one historical-baseline window detected in a single run. ' +
          'Only the most recent prior season populates last_year_*; earlier ' +
          'windows are dropped. last_two_years_* is a post-MVP enhancement.',
      },
    });
    const winnerRecords = byWindow.get(winnerYear) ?? [];
    return filterToLatestBatchInWindow(winnerRecords, errors, winnerYear);
  }

  const [onlyYear] = Array.from(byWindow.keys());
  return filterToLatestBatchInWindow(creditRecords, errors, onlyYear ?? '');
}

/**
 * Aggregate per FCID across left-block dollar contributions, rank, and merge
 * into the roster's last_year_* fields.
 */
export function computeHistoricalBaseline(
  input: HistoricalBaselineInput,
): HistoricalBaselineResult {
  const { roster, errors } = input;
  const selected = selectMostRecentPriorSeason(input.creditRecords, errors);

  // Sum dollars per FCID from LEFT BLOCK ONLY. Right-block points are
  // discarded (not a baseline-dollars input).
  const dollarsByFcid = new Map<string, number>();
  for (const rec of selected) {
    if (rec.source_block !== 'opportunities') continue;
    const dr = rec as CreditDollarsRecord;
    const prior = dollarsByFcid.get(dr.full_contact_id) ?? 0;
    dollarsByFcid.set(dr.full_contact_id, prior + dr.amount_dollars);
  }

  if (dollarsByFcid.size === 0) {
    return { appliedByFcid: new Map() };
  }

  // Rank entries: dollars DESC, tiebreak by FCID ASC.
  const ranked = Array.from(dollarsByFcid.entries())
    .map(([fcid, dollars]) => ({ fcid, dollars }))
    .sort((a, b) => {
      if (b.dollars !== a.dollars) return b.dollars - a.dollars;
      return a.fcid.localeCompare(b.fcid);
    });

  const applied = new Map<string, { dollars: number; rank: number }>();
  ranked.forEach((entry, i) => {
    const rank = i + 1;
    applied.set(entry.fcid, { dollars: entry.dollars, rank });

    const row: RosterRow | undefined = roster.by_full_contact_id.get(entry.fcid);
    if (!row) return; // Already flagged as unknown_full_contact_id by parser; skip silently.

    if (
      row.last_year_fundraising_dollars != null &&
      Math.abs(row.last_year_fundraising_dollars - entry.dollars) > 0.005
    ) {
      errors.add({
        kind: 'roster_baseline_overridden',
        full_contact_id: entry.fcid,
        detail: {
          roster_value: row.last_year_fundraising_dollars,
          computed_value: entry.dollars,
          reason:
            'Roster row carried a non-null last_year_fundraising_dollars that disagrees ' +
            'with the historical-baseline computation. Computed value wins.',
        },
      });
    }

    row.last_year_fundraising_dollars = round2(entry.dollars);
    row.last_year_fundraising_rank = rank;
  });

  return { appliedByFcid: applied };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
