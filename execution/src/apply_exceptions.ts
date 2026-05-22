// Multi-rep split + SPLIT exception application + staff filter.
// SOPs:
//   - architecture/sop_multi_rep_split.md
//   - architecture/sop_exceptions_format.md (matching rules)
//   - architecture/sop_identity_and_join_model.md (staff filter)

import { IngestErrorCollector } from './ingest_errors.js';
import type {
  ParsedException,
  RepAllocation,
  Roster,
  SplitException,
  StaffAllowlist,
  UnifyRow,
} from './types.js';

export const ORG_UNCREDITED_ID = 'org_uncredited';

export type ApplyExceptionsOptions = {
  unifyRows: UnifyRow[];
  roster: Roster;
  staff: StaffAllowlist;
  exceptions: ParsedException[];
  errors: IngestErrorCollector;
};

type RepClassification = 'volunteer' | 'staff' | 'unknown';

function classifyRep(
  rep_id: number,
  roster: Roster,
  staff: StaffAllowlist,
): RepClassification {
  if (roster.by_sales_rep_id.has(rep_id)) return 'volunteer';
  if (staff.by_sales_rep_id.has(rep_id)) return 'staff';
  return 'unknown';
}

function exceptionMatches(
  exc: SplitException,
  row: UnifyRow,
): boolean {
  if (!exc.active) return false;
  const account = row.account_name ?? '';
  if (exc.account_match === 'exact') {
    if (account.toLowerCase() !== exc.account.toLowerCase()) return false;
  } else {
    if (!account.toLowerCase().includes(exc.account.toLowerCase())) return false;
  }
  if (exc.item) {
    if (!row.item.toLowerCase().includes(exc.item.toLowerCase())) return false;
  }
  return true;
}

/**
 * Group records back into source rows so we can decide split per-row, then
 * emit per-(row × recipient) allocations.
 */
export function applyExceptionsAndSplit(opts: ApplyExceptionsOptions): RepAllocation[] {
  const { unifyRows, roster, staff, exceptions, errors } = opts;
  const splitExceptions = exceptions.filter(
    (e): e is SplitException => e.type === 'SPLIT' && e.active,
  );

  // Group by source_row_hash. Per-row context is identical across records, so
  // we just pick the first record's row metadata.
  const byRowHash = new Map<string, UnifyRow[]>();
  for (const r of unifyRows) {
    const arr = byRowHash.get(r.source_row_hash);
    if (arr) arr.push(r);
    else byRowHash.set(r.source_row_hash, [r]);
  }

  const out: RepAllocation[] = [];
  // Dedup unknown_sales_rep_id warnings — warn once per (file, rep_id) so
  // operators see each unknown rep flagged without dozens of duplicates.
  const seenUnknownRepKeys = new Set<string>();

  for (const records of byRowHash.values()) {
    const firstRecord = records[0];
    if (!firstRecord) continue;
    const row = firstRecord; // any record carries shared row context

    // Evaluate SPLIT exceptions for this row.
    const matching = splitExceptions.filter((e) => exceptionMatches(e, row));

    if (matching.length > 1) {
      errors.add({
        kind: 'ambiguous_split_exception_match',
        source_file: row.source_file,
        source_row_number: row.source_row_number,
        source_row_hash: row.source_row_hash,
        detail: {
          matched_exception_ids: matching.map((m) => m.id),
          account_name: row.account_name,
          item: row.item,
        },
      });
      // Fall through to default even-split (conservative).
    }

    const applyExc = matching.length === 1 ? matching[0]! : null;

    if (applyExc) {
      // Custom split per SPLIT exception. Every rep in the exception is a
      // recipient regardless of whether they were on the original Unify row.
      for (const r of applyExc.reps) {
        const amount = row.total_sale_value * (r.percent / 100);
        out.push({
          source_file: row.source_file,
          source_row_hash: row.source_row_hash,
          sales_rep_id: r.sales_rep_id,
          is_org_uncredited: false,
          item: row.item,
          account_name: row.account_name,
          amount_dollars: amount,
          exception_id_applied: applyExc.id,
        });
      }
      continue;
    }

    // Default even-split, with staff/unknown filtered from the divisor.
    const allRepIds = row.all_rep_ids_on_row;
    const volunteerReps: number[] = [];
    for (const rep_id of allRepIds) {
      const cls = classifyRep(rep_id, roster, staff);
      if (cls === 'volunteer') volunteerReps.push(rep_id);
      else if (cls === 'unknown') {
        // Emit warning once per (source_file, rep_id) — collapses dozens of
        // appearances of the same unknown rep into a single triage signal.
        const dedupKey = `${row.source_file}:${rep_id}`;
        if (!seenUnknownRepKeys.has(dedupKey)) {
          seenUnknownRepKeys.add(dedupKey);
          errors.add({
            kind: 'unknown_sales_rep_id',
            source_file: row.source_file,
            source_row_number: row.source_row_number,
            source_row_hash: row.source_row_hash,
            sales_rep_id: rep_id,
            detail: { all_rep_ids_on_row: allRepIds, account_name: row.account_name },
          });
        }
      }
      // Staff are silently filtered. No warning.
    }

    if (volunteerReps.length === 0) {
      // N=0 — every rep was staff or unknown. Route to org_uncredited bucket.
      errors.add({
        kind: 'no_known_volunteer_on_row',
        source_file: row.source_file,
        source_row_number: row.source_row_number,
        source_row_hash: row.source_row_hash,
        detail: {
          all_rep_ids_on_row: allRepIds,
          account_name: row.account_name,
          item: row.item,
          amount: row.total_sale_value,
        },
      });
      out.push({
        source_file: row.source_file,
        source_row_hash: row.source_row_hash,
        sales_rep_id: null,
        is_org_uncredited: true,
        item: row.item,
        account_name: row.account_name,
        amount_dollars: row.total_sale_value,
        exception_id_applied: null,
      });
      continue;
    }

    const perVolunteer = row.total_sale_value / volunteerReps.length;
    for (const rep_id of volunteerReps) {
      out.push({
        source_file: row.source_file,
        source_row_hash: row.source_row_hash,
        sales_rep_id: rep_id,
        is_org_uncredited: false,
        item: row.item,
        account_name: row.account_name,
        amount_dollars: perVolunteer,
        exception_id_applied: null,
      });
    }
  }

  return out;
}
