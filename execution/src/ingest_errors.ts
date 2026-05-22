// Shared collector. Every parser/applier appends here instead of throwing
// for non-fatal data-quality problems. The orchestrator hands the whole
// list to the sink at end-of-run.
//
// sop_ingest_errors.md is the authoritative kind list.

import type { IngestError, IngestErrorKind, IngestErrorSeverity } from './types.js';

const ERROR_KINDS = new Set<IngestErrorKind>([
  'unknown_full_contact_id',
  'missing_full_contact_id_on_credit_row',
  'unparseable_yellow_jacket_rep',
  'malformed_csv_row',
  'unparseable_sale_value',
  'non_positive_sale_value',
  'non_positive_amount_credited',
  'invalid_volunteer_points',
  'unknown_credit_type',
  'unallowlisted_opportunity_name',
  'unexpected_points_campaign',
  'malformed_exception_block',
  'ambiguous_split_exception_match',
  'ambiguous_member_type',
  'unparseable_staff_rep_id',
  'ambiguous_credit_batch_timestamp',
]);

const WARNING_KINDS = new Set<IngestErrorKind>([
  'unknown_sales_rep_id',
  'no_known_volunteer_on_row',
  'roster_row_no_identity',
  'duplicate_full_name',
  'duplicate_staff_rep_id',
  'missing_phone',
  'file_team_mismatch',
  'staff_directory_absent',
  'exceptions_file_absent',
]);

function severityFor(kind: IngestErrorKind): IngestErrorSeverity {
  if (ERROR_KINDS.has(kind)) return 'error';
  if (WARNING_KINDS.has(kind)) return 'warning';
  throw new Error(`severityFor: unmapped kind '${kind}' — update sop_ingest_errors.md and ingest_errors.ts together`);
}

export class IngestErrorCollector {
  private rows: IngestError[] = [];

  add(input: {
    kind: IngestErrorKind;
    source_file?: string | null;
    source_row_number?: number | null;
    source_row_hash?: string | null;
    full_contact_id?: string | null;
    sales_rep_id?: number | null;
    detail?: Record<string, unknown>;
  }): void {
    this.rows.push({
      kind: input.kind,
      severity: severityFor(input.kind),
      source_file: input.source_file ?? null,
      source_row_number: input.source_row_number ?? null,
      source_row_hash: input.source_row_hash ?? null,
      full_contact_id: input.full_contact_id ?? null,
      sales_rep_id: input.sales_rep_id ?? null,
      detail: input.detail ?? {},
    });
  }

  all(): IngestError[] {
    return this.rows.slice();
  }

  errorCount(): number {
    return this.rows.filter((r) => r.severity === 'error').length;
  }

  warningCount(): number {
    return this.rows.filter((r) => r.severity === 'warning').length;
  }

  hasAnyErrors(): boolean {
    return this.errorCount() > 0;
  }
}
