# Progress — YJ-Nest

## 2026-05-22 — Multi-team credit export + multi-dim routing + historical baseline (Conor v2.0 file)

Landed end-to-end support for the production credit-export shape Conor delivered today (`2025-26 Active YJ - 2.0-2026-05-22-11-40-54.xlsx`). One file now covers multiple teams; opportunity-name routing is multi-dimensional (`routing_metrics` array); historical files (date range before SEASON_YEAR) populate `last_year_fundraising_*` on the roster without touching current-season metrics.

**Follow-ups to revisit with Conor (Q7 deferred):**
- Date-range vs `SEASON_YEAR` validation. Engine currently trusts whatever's in the file. After first production run, define expected windows per cadence (e.g., should we warn if a "current" file spans into next season's calendar year?). Straddling windows are classified solely by `opportunities_date_range.end` — no warning fires today (Codex DIM-2 P2).
- Confirm whether explicit "ignore"-seed entries should also produce an audit-log entry (today they short-circuit silently per Codex DIM-3 fix; SOP locked but UI/operator visibility could change).

## (historical entries below)


## 2026-05-18 — Protocol 0 Initialization
- Created `/memory/`, `/architecture/`, `/execution/`, `/.tmp/`
- Drafted CLAUDE.md skeleton (Constitution + Data Schema placeholders)
- Initialized memory files: task_plan.md, findings.md, progress.md, decisions.md
- Status: **HALTED at Phase B — Discovery**. Awaiting user answer to Q1 (North Star).

## 2026-05-18 — Q1 Answered
- North Star captured in CLAUDE.md §1.
- Key tension to design around: high-frequency outbound × low-skill operators. UX must collapse "draft → post → share" into the fewest possible clicks.
- Advancing to Q2 (Integrations & credentials).

## 2026-05-18 — Q2 Partial Answer
- Stack-so-far logged in CLAUDE.md §2.
- **Important architectural implication:** Unify/SeatGeek + Salesforce arrive as CSV — that means a CSV ingestion pipeline into Supabase is required, not a live integration. This shapes Phase L probes (CSV parser + schema validator instead of API handshake) and Phase A SOPs (deterministic CSV→DB ETL).
- **Twilio + Supabase pairing:** Supabase Auth supports Twilio as SMS-OTP provider natively → likely no custom auth code, just config.
- **Gaps flagged:** frontend host, social share channels, donation/payment source, email broadcast. Asking follow-ups before Q3.

## 2026-05-18 — Q2 Closed
- Frontend: Vercel/Next.js (likely).
- Share channels: SMS, Email, IG (feed+stories), FB (feed+stories), LinkedIn — all **click-to-share** (huge win: no OAuth, no review queues).
- No donations on platform — empowerment/knowledge-base only.
- Refresh: scheduled Unify CSV.
- Outstanding: (a) Google AI Studio UI/UX draft access, (b) CSV ingest mechanism (manual upload UI vs. auto-pull vs. Storage drop). Both will be resolved in Q3 + Phase L.
- Advancing to Q3 (Source of Truth) — focused on CSV mechanics.

## 2026-05-19 — Q3 + Q4 + Q5 Largely Closed (Process Documentation + MVP absorbed)
- User dropped `Process Documentation/` (automation_spec.md, sample Unify CSV, Manual Tweaks docx, 4 Salesforce Excel exports, meeting recordings + transcript) and the Google AI Studio MVP (`volunteer-impact-dashboard/`).
- **Major scope reframe:** This is ONE product with 3 layers (Ingest → Aggregate/Rules → The Nest UI), not two separate workstreams. Backend pipeline is the prerequisite; The Nest is the experience.
- **Goal hierarchy clarified:** $1.5M Fast Start (Aug 21) → $4.2M Annual (Dec 5) → $5M Stretch.
- **"Good Standing" rule discovered & locked:** 4 thresholds (Fundraising $10k / Rate Bowl $2k / Wishes $1k / Total Points 17,500 pts).
- MVP stack: React 19 + Vite + Tailwind 4 + Motion + Lucide + Express + Gemini 1.5 Flash.
- MVP types.ts is the **target output shape** of the engine.
- 8 tabs surveyed (Home, Team, Events, Schedule, Toolkit, Help, WeeklyDigest, ActivityReport).
- Excel headers extracted for all 4 Salesforce exports (Rep IDs, YJ Directory, Gorlocks, Sales Rosters).

## 2026-05-19 — User corrections (rev 2 of CLAUDE.md)
- **Points unit = points, not dollars.** Threshold display had to flip ($17,500 → 17,500 pts).
- **Volunteer Points = Volunteer Points + Attendance Points (single stream).** No separate attendance column. MVP's `Attendance` type is a UI slice of the same Gorlocks data.
- **Sponsorships + in-kind live in Salesforce, NOT Unify.** Engine must ingest a 3rd Salesforce source for `totalFundraising`. Sample/columns still needed.
- Tiers + point multipliers explicitly stored as data, not code → table-driven, admin-editable.
- Pushes are admin-defined campaign windows.
- AI assistant = Gemini Flash (keep MVP choice).
- Multi-rep credit split = even split by default.
- Manual Tweaks → plain-text `exceptions.txt` in SharePoint (operator-editable by Conor + Dan, seeded from docx). Decision evolved in later turn (see 2026-05-19 — Exceptions: plain-text file in SharePoint).

## 2026-05-19 — Status
- **Phase B effectively closed** except for one open data-source question (CLAUDE.md §6.2.1): the Salesforce sponsorships/in-kind file location + column shape.
- Once that's answered, Data Schema is final → Phase L (Link) can begin: build CSV-parse probe scripts + verify Supabase/Twilio/Vercel credentials.

## 2026-05-19 — Phase B COMPLETE (rev 3)
- Sponsorship/in-kind source resolved: Conor McCarvel-generated Salesforce mass-download, Gorlocks-style format.
- **Spec requirement:** request Conor add `Full Contact ID` to BOTH Gorlocks export and sponsorship/in-kind export. Eliminates fuzzy-name joins.
- CLAUDE.md status flipped to 🟢 — Data Schema locked pending sample-file verification.
- **Ready to advance to Phase L.**

## 2026-05-19 — Identity join model clarified
- Two unique IDs per volunteer: `sales_rep_id` (Unify) and `full_contact_id` (Salesforce).
- The Sales Rep ID file (§4.2) is the canonical bridge — Conor will add `Full Contact ID` to it.
- Consolidated ask to Conor: add `Full Contact ID` to (1) Sales Rep IDs export, (2) Gorlocks exports, (3) Sponsorship/In-Kind export.

## 2026-05-19 — Architecture: SharePoint landing zone
- All Unify + Salesforce report exports land in a SharePoint folder owned by the foundation's M365 tenant.
- Engine reads files via Microsoft Graph API (Azure AD app registration with `Sites.Selected` scope).
- Supabase Storage is the operational store post-ingest, not the landing zone.
- Engine treats source as pluggable (`ReportSource` interface) — `LocalFolderSource` for dev, `SharePointSource` for prod.

## 2026-05-19 — Exceptions: plain-text file in SharePoint
- Final approach: `exceptions.txt` in the SharePoint folder, edited directly by Conor + Dan.
- Considered + rejected: Salesforce custom object (skill barrier unclear), Nest admin UI (wrong audience — editors don't live in Nest), SharePoint Excel (validation problems).
- Format: block-per-exception text template, two operation types (SPLIT, ADJUST), Rep IDs as canonical references.
- Engine parses + validates on each ingest; malformed blocks → `ingest_errors`, well-formed blocks → applied + mirrored into Supabase `exceptions` table for runtime queries.
- Training cost: ~10 min via 1-page reference doc.
- **Naming convention locked:** "exceptions" = curated rules file; "ingest_errors" = error log. The two are deliberately distinct concepts.

## Outstanding asks to Kirk (none blocking L-local)
- Send consolidated ask to Conor:
  1. Build a **Master Volunteer Roster** Salesforce report — one unified export replacing the legacy Sales Rep IDs / YJ Directory / Sales Rosters files (see CLAUDE.md §4.2 for column spec).
     - Add `Full Contact ID` column
     - Add `is_captain` as a Contact custom field, surface in report
     - Consolidate Representative Category / YJ Category / Bowl Position → one `member_type` enum
  2. Add `Full Contact ID` column to the existing **Volunteer Credit Export** (Gorlocks-style report).
- Send 3 questions to IT/Conor/Unify rep re: SharePoint folder + scheduled export destinations (CLAUDE.md decisions §SharePoint section).

## 2026-05-19 — Scope simplification: one-way + unified SF export
- **One-way flow locked.** Engine consumes from SF + Unify, writes only to Supabase. No Salesforce Import Wizard output. Salesforce Volunteer Hours object stays maintained by the existing manual JotForm→Conor→SF workflow (out of scope for MVP).
- **Salesforce credits unified into a single export.** Volunteer points, sponsorships, in-kind, direct donations all live in one Gorlocks-style report. Engine routes by `Type` + `Campaign`. Eliminates a second Conor request.
- **JotForm→SF automation logged as Phase 2 candidate** in CLAUDE.md §11.1.
- Naming locked: "Salesforce Volunteer Credit Export" (was Gorlocks/Sponsorship-In-Kind split).
- CLAUDE.md sections updated: §2 (diagram), §3 (integrations), §4.4 (unified), §4.7 (deleted), §5 (one-way intro + 5.2 removed), §7.3 (unified shape), §7.4 (was 7.5), §8 (no write-back invariant), §11 (new deferred enhancements).

## 2026-05-19 — Master Volunteer Roster consolidation + Life Member access rule
- **Three legacy SF exports collapsed into one** Master Volunteer Roster (CLAUDE.md §4.2):
  - Sales Rep IDs (§4.2 old)
  - YJ Directory (§4.3 old)
  - Sales Rosters (§4.5 old)
- Now: §4.1 Unify CSV → §4.2 Master Roster → §4.3 Volunteer Credit Export → §4.4 Exceptions. Cleaner numbering and one less Conor ask.
- **New columns in Master Roster:** `is_captain` (SF custom field), `member_type` (consolidates 3 legacy enum fields), `email`, `phone` (required for Twilio OTP), `fiesta_ticket_link` + `rate_ticket_link`, `last_year_fundraising_dollars/rank` (historical), `job` (optional).
- **Dropped:** `personal_goal_amount` (use $10K default), third tracking link (not needed for Par 3 / KOE).
- **Life Member / Life Director access rule:** `has_nest_access = false` for MVP. They stay in the roster, the engine still attributes credit to them, but they don't appear in Nest UI. One-off future access is an admin override in Supabase, not a roster column.
- **Life Member credit attribution:** Option A — normal attribution. Credit counts in org totals. Multi-rep splits with Life Members default to even split. Custom redistribution = exception block in `exceptions.txt`.

## 2026-05-20 — Phase L kickoff: 4 architecture decisions ratified + 11 SOPs drafted

**Decision 1 (RATIFIED w/ conditions).** Volunteer Credit Export is the two-block Gorlocks shape (one file per team, side-by-side Opportunities + Volunteer Points blocks). Conor's workflow stays "download + drop in shared folder." Kirk will add `Full Contact ID` to the SF report before pilot; engine refuses to run against files lacking it. Codex adversarial review surfaced 4 conditions, all baked into SOPs:
  - (a) Roster duplicate-name preflight as defense-in-depth (warning, not fatal — names aren't join keys).
  - (b) File mascot is a hint; volunteer team comes from roster; mismatch logs to `ingest_errors`.
  - (c) Dedup key includes source-file fingerprint + export timestamp; newer file supersedes older.
  - (d) Cash routing requires opportunity-name allowlist (Kirk chose allowlist over default-to-dollars).

**Decision 2 (RATIFIED).** This session's `compute_metrics.ts` emits ONLY the §7.4 v1 contract. Supabase schema includes nullable columns for v2 extension fields (role, signals, momentum, currentSprint, levelId, etc.). Engine emits genuine NULLs — no sentinel defaults. Stream C populates these in a follow-up session; Stream E null-guards the v2 frontend before pilot.

**Q4 RESOLVED.** No pre-existing Conor reconciliation artifact exists — Conor's manual VLOOKUP+Teams workflow produced a pivot for sales captains to share, not an aggregated truth source. YJNest IS the new authoritative aggregation. Golden test fixture = Claude hand-derives from CLAUDE.md rules applied to sample inputs; Codex audits arithmetic; W2 acceptance gate = Kirk + Conor independently recompute pilot volunteers' totals from raw inputs to $1/1pt tolerance. **Pilot plan success criterion #1 needs re-wording: "matches Conor's spreadsheet" → "independently re-verifiable from raw inputs by Kirk + Conor within $1/1pt."**

**Outputs of this session:** 11 SOPs in `/architecture/` covering identity+join model, Unify CSV ingest, Master Roster parse, Volunteer Credit routing, item categorization, exceptions format, multi-rep split, metrics + Good Standing, tier calculation, ingest errors, orchestrator sequencing + idempotency. Scaffolded `/execution/{sql,tests,fixtures,probes}/` + `/.tmp/`. No TypeScript written; waiting on Kirk's SOP sign-off.

**Spec drift logged for future CLAUDE.md edit:** §4.3 (unified row → two-block shape), §6.6 tier ladder vs v2 PDF-driven IncentiveTier (deferred). Documented inline in `sop_volunteer_credit_routing.md` Rationale section + `sop_tier_calculation.md` Note section.

**Next session (after sign-off):** seed `exceptions.txt` from Manual Tweaks docx → write 8 atomic scripts → 4 SQL migrations → golden ingest test → Codex adversarial review of engine code.

## 2026-05-21 — SOP corrections from Kirk's roster + Unify review

Kirk reviewed the SOPs and surfaced two structural corrections that landed as edits across 7 files + 1 new SOP:

**Roster correction:** Master Roster intentionally over-includes (board members, life members, life directors in addition to YJ + Future). Rows can be missing either `full_contact_id` or `sales_rep_id` (but not both — those rows drop from in-memory roster with warning). Added `Board` as 5th `member_type` enum value. Good Standing thresholds apply ONLY to YJ + Future; for all other member types the 4 booleans are stored as NULL. Supabase `volunteers.id` becomes a deterministic synthetic string (`full_contact_id` or `"rep_"+sales_rep_id`).

**Staff allowlist (NEW input file):** Foundation employees (Tony Econ, Austin Zawicki currently) appear in Unify but never in roster. Kirk uploaded `Sales Staff Directory.xlsx` at project root with `Sales Rep ID | Category | Name` columns. Engine behavior:
- Staff IDs silently filtered from the multi-rep split divisor (no warning). Volunteer co-reps absorb the staff member's share (the full sale value).
- Unknown IDs (neither roster nor staff) also filtered from divisor BUT emit `unknown_sales_rep_id` warning for operator triage.
- N=0 edge case (every rep is staff/unknown) routes to synthetic `org_uncredited` row in `volunteers` so dollars still count toward $1.5M/$4.2M/$5M org goals without crediting any individual.
- Display-name prefix in Unify (`"Life Member Chris Gracey"`) is opaque — engine never parses or cross-checks against roster `member_type`.

**Files edited:** `sop_identity_and_join_model.md`, `sop_unify_csv_ingest.md`, `sop_master_roster_parse.md`, `sop_multi_rep_split.md`, `sop_metrics_and_good_standing.md`, `sop_ingest_errors.md`, `sop_orchestrator.md`. **New:** `sop_staff_directory_parse.md` (12th SOP). **Memory:** new decisions in `decisions.md`, new auto-memories `project_roster_over_inclusive.md` and `project_staff_allowlist.md`.

Still waiting on Kirk's continued read-through of remaining SOPs before TypeScript starts.

## 2026-05-21 — Tier ladder rewrite + role rename to "Sales Captain"

**Tier ladder corrected.** Kirk pointed out the SOP still used CLAUDE.md §6.6's legacy Bronze→Diamond dollar ladder. Rewrote `sop_tier_calculation.md` to the actual locked ladder from the 2025 Yellow Jacket Incentives PDF (project root) + v2 `INCENTIVE_TIERS` constants: 6 points-based tiers (Walk-On 17.5k → Heisman 200k), with Walk-On as the only tier carrying a $ gate (Active 17.5k+$10k, Future 15k+$7.5k). Tiers 2–6 are pure points. CLAUDE.md §6.6 needs a follow-up edit to match.

**Role rename: Captain → Sales Captain.** Kirk's suggestion to disambiguate from Tier 3 "Captain". Applied:
- Roster column: `is_captain` → `is_sales_captain`
- Future SF custom field name: `Sales Captain`
- v2 `VolunteerRole`: `'captain'` → `'sales_captain'` (Stream E type widening)
- Pilot stand-in CSV: `pilot_sales_captains.csv`
- Tier 3 stays "Captain" (product-facing PDF copy, unchangeable)

**Files edited:** `sop_tier_calculation.md`, `sop_master_roster_parse.md`, `sop_metrics_and_good_standing.md`. **Memory:** new decisions in `decisions.md`, new auto-memory `project_tier_ladder.md`, MEMORY.md index extended.

Selection Sunday Individual Incentive (ping pong ball raffle in the PDF) explicitly logged as out-of-pilot-scope; documented in SOP "Out of scope" section.
