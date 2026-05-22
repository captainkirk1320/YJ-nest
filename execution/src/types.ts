// Shared in-memory contracts for the ingest engine.
// Every script imports from here. SOP cross-references noted inline.

// ─── Roster ───────────────────────────────────────────────────────────────
// sop_master_roster_parse.md

export type MemberType =
  | 'Yellow Jacket'
  | 'Future'
  | 'Life Member'
  | 'Life Director'
  | 'Board';

export type RosterRow = {
  full_contact_id: string | null;
  sales_rep_id: number | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  team: string | null;
  is_sales_captain: boolean;
  member_type: MemberType;
  active: boolean;
  first_year_of_volunteering: number | null;
  fiesta_ticket_link: string | null;
  rate_ticket_link: string | null;
  last_year_fundraising_dollars: number | null;
  last_year_fundraising_rank: number | null;
  job: string | null;
};

export type Roster = {
  rows: RosterRow[];
  by_full_contact_id: Map<string, RosterRow>;
  by_sales_rep_id: Map<number, RosterRow>;
};

// ─── Staff allowlist ──────────────────────────────────────────────────────
// sop_staff_directory_parse.md

export type StaffEntry = {
  sales_rep_id: number;
  category: string;
  name: string;
};

export type StaffAllowlist = {
  entries: StaffEntry[];
  by_sales_rep_id: Map<number, StaffEntry>;
};

// ─── Unify CSV ────────────────────────────────────────────────────────────
// sop_unify_csv_ingest.md

export type UnifyRow = {
  source_file: string;
  source_row_number: number;
  source_row_hash: string;
  sales_rep_id: number;
  display_name_raw: string;
  item: string;
  total_sale_value: number;
  account_name: string;
  rep_count_on_row: number;
  // The full list of rep IDs on this CSV row, so the splitter can see all
  // co-reps when classifying volunteer/staff/unknown. Includes self.
  all_rep_ids_on_row: number[];
};

// ─── Volunteer Credit Export ──────────────────────────────────────────────
// sop_volunteer_credit_routing.md

export type CreditDollarsRecord = {
  source_file: string;
  source_block: 'opportunities';
  source_row_number: number;
  source_row_hash: string;
  source_file_fingerprint: string; // sha256 of file content
  source_file_timestamp: string; // from filename
  team_mascot_from_filename: string;
  full_contact_id: string;
  contact_full_name_raw: string;
  opportunity_name: string;
  amount_dollars: number;
  type: 'Cash' | 'Sponsorship' | 'In-Kind' | string;
};

export type CreditPointsRecord = {
  source_file: string;
  source_block: 'volunteer_points';
  source_row_number: number;
  source_row_hash: string;
  source_file_fingerprint: string;
  source_file_timestamp: string;
  team_mascot_from_filename: string;
  full_contact_id: string;
  contact_full_name_raw: string;
  volunteer_job_name: string;
  amount_points: number;
  campaign: string;
};

export type CreditRecord = CreditDollarsRecord | CreditPointsRecord;

// ─── Exceptions ───────────────────────────────────────────────────────────
// sop_exceptions_format.md

export type ExceptionMetric =
  | 'total_fundraising'
  | 'rate_bowl'
  | 'wishes_for_teachers'
  | 'total_points';

export type SplitException = {
  id: string;
  added_date: string;
  active: boolean;
  type: 'SPLIT';
  account: string;
  account_match: 'exact' | 'contains';
  item: string | null;
  reps: Array<{ sales_rep_id: number; percent: number }>;
  notes: string;
};

export type AdjustException = {
  id: string;
  added_date: string;
  active: boolean;
  type: 'ADJUST';
  account: string;
  account_match: 'exact' | 'contains';
  item: string | null;
  adjustments: Array<{
    sales_rep_id: number;
    amount: number;
    metric: ExceptionMetric;
  }>;
  notes: string;
};

export type ParsedException = SplitException | AdjustException;

// ─── Per-rep allocation (after split / SPLIT exception) ───────────────────
// sop_multi_rep_split.md

export type RepAllocation = {
  source_file: string;
  source_row_hash: string;
  sales_rep_id: number | null; // null when row is org_uncredited
  is_org_uncredited: boolean;
  item: string;
  account_name: string;
  amount_dollars: number;
  exception_id_applied: string | null;
};

// ─── Metric contribution (after item categorization) ──────────────────────
// sop_item_categorization.md

export type MetricContribution =
  | {
      source: 'unify';
      source_file: string;
      source_row_hash: string;
      volunteer_id: string; // synthetic PK from sop_identity_and_join_model.md
      contribution_dollars: {
        total_fundraising: number;
        rate_bowl: number;
        wishes_for_teachers: number;
      };
      contribution_points: number;
    }
  | {
      source: 'sf_dollars';
      source_file: string;
      source_row_hash: string;
      volunteer_id: string;
      contribution_dollars: {
        total_fundraising: number;
        rate_bowl: 0;
        wishes_for_teachers: 0;
      };
      contribution_points: number;
    }
  | {
      source: 'sf_points';
      source_file: string;
      source_row_hash: string;
      volunteer_id: string;
      contribution_dollars: {
        total_fundraising: 0;
        rate_bowl: 0;
        wishes_for_teachers: 0;
      };
      contribution_points: number;
    };

// ─── Volunteer output row (v1 §7.4 contract) ──────────────────────────────
// sop_metrics_and_good_standing.md
// Extension fields (v2) are emitted as null — see decisions.md 2026-05-20

export type TierId =
  | 'walk-on'
  | 'starter'
  | 'captain'
  | 'all-conference'
  | 'all-american'
  | 'heisman';

export type VolunteerOutput = {
  id: string; // synthetic PK
  full_contact_id: string | null;
  sales_rep_id: number | null;
  name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  team: string | null;
  team_id: string | null; // slugified team
  member_type: MemberType | null; // null only for org_uncredited
  volunteer_category: 'Active' | 'Future' | 'Life Member' | 'Life Director' | null;
  active: boolean;
  has_nest_access: boolean;
  is_sales_captain: boolean;
  raised: number; // = metrics.totalFundraising
  goal: number | null;
  metrics: {
    totalFundraising: number;
    rateBowl: number;
    wishesForTeachers: number;
    totalPoints: number;
  };
  thresholds: {
    totalFundraising: boolean | null;
    rateBowl: boolean | null;
    wishesForTeachers: boolean | null;
    totalPoints: boolean | null;
  };
  tierId: TierId | null;
  rank: number | null;
  // v2 extension fields — genuinely null this session
  role: null;
  signals: null;
  momentum: null;
  currentSprint: null;
  levelId: null;
  compositePoints: null;
  rankDelta7d: null;
  sprintRank: null;
  weekPoints: null;
  fundraisingPercentile: null;
  activityPercentile: null;
};

export type TeamOutput = {
  id: string;
  name: string;
  raised: number;
  totalPoints: number;
  rateBowl: number;
  wishesForTeachers: number;
  volunteerCount: number;
  goodStandingCount: number;
  rank: number;
  goal: number | null;
};

// ─── Ingest errors ────────────────────────────────────────────────────────
// sop_ingest_errors.md — complete enumeration

export type IngestErrorKind =
  // severity: error (row dropped)
  | 'unknown_full_contact_id'
  | 'missing_full_contact_id_on_credit_row'
  | 'unparseable_yellow_jacket_rep'
  | 'malformed_csv_row'
  | 'unparseable_sale_value'
  | 'non_positive_sale_value'
  | 'non_positive_amount_credited'
  | 'invalid_volunteer_points'
  | 'unknown_credit_type'
  | 'unallowlisted_opportunity_name'
  | 'unexpected_points_campaign'
  | 'malformed_exception_block'
  | 'ambiguous_split_exception_match'
  | 'ambiguous_member_type'
  | 'unparseable_staff_rep_id'
  // severity: warning (ingest continues)
  | 'unknown_sales_rep_id'
  | 'no_known_volunteer_on_row'
  | 'roster_row_no_identity'
  | 'duplicate_full_name'
  | 'duplicate_staff_rep_id'
  | 'missing_phone'
  | 'file_team_mismatch'
  | 'staff_directory_absent'
  | 'exceptions_file_absent';

export type IngestErrorSeverity = 'warning' | 'error';

export type IngestError = {
  kind: IngestErrorKind;
  severity: IngestErrorSeverity;
  source_file: string | null;
  source_row_number: number | null;
  source_row_hash: string | null;
  full_contact_id: string | null;
  sales_rep_id: number | null;
  detail: Record<string, unknown>;
};

// ─── Sink interface (write_supabase.ts owns implementations) ──────────────

export type IngestRunSummary = {
  started_at: string;
  finished_at: string;
  status: 'success' | 'partial' | 'failed';
  triggered_by: 'cli' | 'cron' | 'manual';
  source_files: {
    unify_csv: string | null;
    roster_xlsx: string | null;
    staff_directory_xlsx: string | null;
    credit_xlsxs: string[];
    exceptions_txt: string | null;
  };
  volunteers_upserted: number;
  errors_count: number;
  warnings_count: number;
  notes: string | null;
};

export type IngestSink = {
  writeVolunteers(rows: VolunteerOutput[]): Promise<void>;
  writeTeams(rows: TeamOutput[]): Promise<void>;
  writeIngestErrors(rows: IngestError[]): Promise<void>;
  writeExceptionsMirror(rows: ParsedException[], sourceFileHash: string): Promise<void>;
  writeIngestRun(summary: IngestRunSummary): Promise<void>;
};
