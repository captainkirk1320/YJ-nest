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

export type MetricName =
  | 'total_fundraising'
  | 'rate_bowl'
  | 'wishes_for_teachers'
  | 'total_points';

export const ALL_METRIC_NAMES: ReadonlyArray<MetricName> = [
  'total_fundraising',
  'rate_bowl',
  'wishes_for_teachers',
  'total_points',
];

export type CreditFileMetadata = {
  source_file: string;
  source_file_fingerprint: string;
  source_file_timestamp: string;
  version_label: string | null;
  teams_in_filter: string[];                          // union of row-11 + row-16
  opportunities_date_range: { start: string; end: string } | null; // ISO yyyy-mm-dd
  points_date_range: { start: string; end: string } | null;
};

export type CreditDollarsRecord = {
  source_file: string;
  source_block: 'opportunities';
  source_row_number: number;
  source_row_hash: string;
  source_file_fingerprint: string; // sha256 of file content
  source_file_timestamp: string; // from filename
  /**
   * Filename team mascot — left in place for back-compat with pre-2026-05-22
   * single-team-per-file fixtures. For multi-team files the value is `''`.
   * Team scope is now read from `file_metadata.teams_in_filter`.
   */
  team_mascot_from_filename: string;
  file_metadata: CreditFileMetadata;
  full_contact_id: string;
  contact_full_name_raw: string;
  opportunity_name: string;
  amount_dollars: number;
  type: 'Cash' | 'Sponsorship' | 'In-Kind' | string;
  /**
   * The resolved multi-dimensional routing per
   * sop_volunteer_credit_routing.md § Routing precedence. compute_metrics
   * iterates this array and adds the full amount to each named metric.
   */
  routing_metrics: MetricName[];
};

export type CreditPointsRecord = {
  source_file: string;
  source_block: 'volunteer_points';
  source_row_number: number;
  source_row_hash: string;
  source_file_fingerprint: string;
  source_file_timestamp: string;
  team_mascot_from_filename: string;
  file_metadata: CreditFileMetadata;
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

// ─── v2 extension types (Stream C — sop_role.md, sop_momentum.md,
//     sop_current_sprint.md, sop_signals.md). When Stream C is disabled
//     the orchestrator leaves all four fields as `null` (the v1-only
//     contract), per Decision 2026-05-20 "no sentinel defaults."

export type VolunteerRole = 'volunteer' | 'sales_captain' | 'admin';

export type VolunteerSignals = {
  rising: boolean;
  coasting: boolean;
  atRisk: boolean;
  signalReason: string | null;
};

export type VolunteerMomentum = {
  activeSprintsLast4: number;
  lastActionAt: string | null;
  nextMilestoneActions: number | null;
  sprintParticipationRate: number | null;
};

export type VolunteerCurrentSprint = {
  sprintId: string;
  fundraisingThisSprint: number;
  pointsThisSprint: number;
  sharesThisSprint: number | null;
};

// Push table row (sop_current_sprint.md, sop_momentum.md). Pilot loads these
// inline via the orchestrator option; Stream D will source them from Supabase.
export type PushRecord = {
  id: string;
  label: string;
  event_type: string | null;
  starts_at: string; // ISO timestamp
  ends_at: string;   // ISO timestamp
  target_amount: number | null;
  active: boolean;
};

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
  /**
   * Prior-season display fields populated by compute_historical_baseline.ts
   * from a historical credit-export file (opportunities_date_range.end <
   * SEASON_YEAR-01-01). Distinct from current-season metrics — surfaces as
   * "Last year: $X · rank Y" in the Nest UI. Null when no historical data
   * exists for this volunteer.
   */
  last_year_fundraising_dollars: number | null;
  last_year_fundraising_rank: number | null;
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
  // v2 extension fields. compute_metrics emits all of these as `null`.
  // Stream C scripts (derive_role, compute_momentum, compute_current_sprint,
  // compute_signals) populate role / signals / momentum / currentSprint
  // when enabled. The remaining five require historical snapshots and stay
  // null until those streams ship.
  role: VolunteerRole | null;
  signals: VolunteerSignals | null;
  momentum: VolunteerMomentum | null;
  currentSprint: VolunteerCurrentSprint | null;
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
  | 'ambiguous_credit_batch_timestamp'
  // severity: warning (ingest continues)
  | 'unknown_sales_rep_id'
  | 'no_known_volunteer_on_row'
  | 'roster_row_no_identity'
  | 'duplicate_full_name'
  | 'duplicate_staff_rep_id'
  | 'missing_phone'
  | 'file_team_mismatch'
  | 'credit_filter_unreadable'
  | 'credit_filter_team_disagreement'
  | 'roster_baseline_overridden'
  | 'multiple_historical_seasons_detected'
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
