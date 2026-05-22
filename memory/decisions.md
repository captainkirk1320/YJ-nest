# Decisions — YJ-Nest

_Architectural choices and the reason behind each._

## 2026-05-18 — Adopt B.L.A.S.T. + A.N.T.
- **Decision:** Follow the System Pilot protocol (Blueprint → Link → Architect → Stylize → Trigger) with A.N.T. 3-layer separation.
- **Why:** Reliability over speed. Deterministic business logic isolated from probabilistic LLM reasoning.

## 2026-05-18 — Halt before Data Schema
- **Decision:** No code in `/execution/` until Discovery Q1–Q5 are answered and Data Schema locked in CLAUDE.md.
- **Why:** Data-First Rule. Output shape drives every downstream choice.

## 2026-05-19 — SharePoint as the canonical file landing zone
- **Decision:** Unify + Salesforce scheduled report exports will land in a SharePoint folder owned by the foundation's M365 tenant. Engine reads from there via Microsoft Graph API. Supabase Storage is NOT the landing zone — it's the operational store *after* ingestion.
- **Why:** The foundation already runs on M365/SharePoint, so IT handles retention/compliance/audit-trail for free. Manual fallback works (admins can drag files into the folder). Native integrations exist for Salesforce → SharePoint. Engine treats source as pluggable (`ReportSource` interface) so SharePoint can be swapped for Supabase Storage / local folder during dev.
- **How to apply:** When Phase L hits the cloud step, implement `SharePointSource` first; keep `LocalFolderSource` for development.

## 2026-05-19 — Identity join via two IDs, never names
- **Decision:** All cross-system joins use `sales_rep_id` (Unify) and `full_contact_id` (Salesforce). The Sales Rep ID file (§4.2) is the bridge that carries both — Conor will add `Full Contact ID` to it.
- **Why:** Name-based fuzzy matching is fragile (typos, married names, "Bob" vs "Robert") and produces unnecessary ingest exceptions. Two durable IDs = deterministic engine.
- **How to apply:** Engine REJECTS rows it cannot map deterministically (Rep ID or Contact ID missing/unrecognized) → routes to `ingest_errors` for operator review. No silent name-guess fallback.

## 2026-05-19 — Exceptions are a plain-text file in SharePoint, NOT a Supabase admin UI or SF custom object
- **Decision:** Manual reconciliation tweaks live in `exceptions.txt` in the SharePoint folder, edited directly by foundation back-office staff (Conor + Dan). Engine parses on each ingest, validates strictly, mirrors valid entries into a Supabase `exceptions` table for runtime queries.
- **Why:** The editors are Salesforce/Unify admins who don't live in Nest. Building an admin UI in Nest is wrong-audience. A Salesforce custom object would be cleaner *if* Conor's SF skill includes custom objects (unknown). Exception edits are infrequent ("every now and again"), so the simplest viable tool wins. Plain text is auditable (SharePoint version history), validatable, and parseable.
- **How to apply:** Engine uses block-format parser (SPLIT or ADJUST per block). Reps referenced by Sales Rep ID only — names are for human readability, never used as join keys. Malformed blocks → `ingest_errors`, never block the rest of the ingest. Naming: "exceptions" = the curated rules; "ingest_errors" = error log. Keep these distinct.

## 2026-05-19 — YJ-Nest is one-way (read-only) from source systems
- **Decision:** Engine consumes from Salesforce + Unify exports and writes ONLY to Supabase. No write-back to Salesforce (no Volunteer Hours object updates), no writes to Unify, no writes to JotForm.
- **Why:** Source systems remain canonical for their respective domains (SF = identities + non-Unify credits; Unify = sales transactions). YJ-Nest is the canonical home for *reconciled* credit + display + gamification. One-way flow eliminates a large category of failure modes (SF API auth, write conflicts, two-way sync drift) and reduces required permissions to read-only.
- **How to apply:** The Salesforce "Volunteer Hours" import workflow described in `automation_spec.md` §4 is OUT OF SCOPE. The existing manual JotForm → Conor → SF process continues unchanged. Nest displays reconciled credit, but does not push it back to SF. Anyone asking "why don't I see this credit in SF?" should be pointed to Nest.

## 2026-05-19 — Salesforce volunteer credits live in ONE unified export, not two
- **Decision:** Volunteer/attendance points, sponsorships, in-kind donations, and direct donations all live in the same Gorlocks-style Salesforce report. The engine reads ONE Salesforce credit export (per team) and routes each row by `Type` + `Campaign` to the correct metric dimension.
- **Why:** Earlier I had split this into §4.4 (Gorlocks points) + §4.7 (Sponsorship/In-Kind) — wrong. Conor's single mass-download already carries everything. Avoids asking him to produce a second report.
- **How to apply:** Engine routing rules in CLAUDE.md §4.4. `Campaign` contains "Committee Participation Points" → points. `Type` ∈ {Sponsorship, In-Kind} → dollars. Other dollar campaigns → dollars. Ambiguous → `ingest_errors`.

## 2026-05-19 — JotForm → Salesforce automation deferred to post-MVP
- **Decision:** Logged in CLAUDE.md §11.1. Not built in V1.
- **Why:** The manual JotForm → Conor → Salesforce step is friction-prone but not blocking. Revisit when the rest of YJ-Nest is in production and Conor's operator pain justifies the integration work.

## 2026-05-19 — Master Volunteer Roster consolidation
- **Decision:** Collapse the three legacy Salesforce people-related exports (Sales Rep IDs, YJ Directory, Sales Rosters) into a single **Master Volunteer Roster** export. Conor produces ONE SF report covering identity, both system IDs, team assignment, contact info, member classification, personal tracking links, and historical performance.
- **Why:** Eliminates joins between 3 files at ingest time. Single source of truth for "who is a volunteer this year." Reduces Conor's ongoing maintenance burden. Easier audit.
- **How to apply:** Engine reads ONE Master Roster file per ingest. `member_type` is the canonical enum replacing Representative Category + YJ Category + Bowl Position. `is_captain` is a new Salesforce Contact custom field (~10-12 people flagged). `team` is nullable (Life Members have no team).

## 2026-05-19 — Life Members are in the roster but excluded from Nest UI for MVP
- **Decision:** For MVP, `has_nest_access = false` for any volunteer where `member_type ∈ {Life Member, Life Director}`. They don't log in, don't appear in leaderboards or team views, but they DO stay in the Master Roster and the engine attributes their credit normally so org-wide totals stay accurate.
- **Why:** Stakeholder explicitly scoped Life Member access out of MVP; future access will be one-off additions, not bulk. Excluding them from the roster entirely would break the engine on Unify CSV rows that credit Life Members (real data shows them in multi-rep splits — e.g., "(2041777) Life Member Chris Gracey, (2095092) Josh Guinn").
- **How to apply:** `has_nest_access` is derived from `member_type` at runtime, not stored as a roster column. Future one-off access is an admin row in a `nest_access_overrides` Supabase table. Life Member credit attribution defaults to even split on multi-rep rows; if a different distribution is wanted (e.g., redirect Life Member share to an Active Yellow Jacket), it's a SPLIT exception in `exceptions.txt`.

## 2026-05-20 — Volunteer Credit Export shape: two-block Gorlocks, identity by ID

- **Decision:** Production Volunteer Credit Export = the side-by-side two-block xlsx shape seen in the sample (Opportunities block on the left, Volunteer Points block on the right), one file per team named `{TeamMascot}-{timestamp}.xlsx`. `Full Contact ID` column is added to both blocks before pilot ingest. Identity join is strictly by `full_contact_id` → roster, never by name. Engine refuses to run against files missing the `Full Contact ID` column.
- **Why:** CLAUDE.md §4.3 originally specified a unified-row shape with one Type column per row. Inspection of the actual Salesforce report output revealed the production shape is two parallel reports in one sheet. Kirk's hard constraint ("no extra work for Conor beyond download-and-drop") locks the two-block shape. ID-based identity is preserved because Kirk is editing the SF report template himself to add the ID column — that's report config, not ongoing Conor work.
- **How to apply:** `parse_volunteer_credit.ts` identifies blocks by matching header labels (`Opportunity: Opportunity Name` / `Volunteer Job: Volunteer Job Name`), not by fixed column letters. Routing is block-based: left block → dollars (with Cash routing gated by an allowlist), right block → points (Campaign-validated). Codex's 4 adversarial conditions are non-negotiable: (a) roster duplicate-name preflight warning, (b) volunteer team comes from roster not filename, (c) dedup key includes source-file fingerprint + timestamp so amended exports supersede prior batches, (d) Cash routing requires explicit opportunity-name allowlist seeded in Supabase `volunteer_credit_allowlist` table. CLAUDE.md §4.3 needs a follow-up edit to match.

## 2026-05-20 — Cash routing via allowlist, not default

- **Decision:** In the Volunteer Credit Export left block, `Type=Cash` rows route to `totalFundraising` ONLY if their `Opportunity: Opportunity Name` appears in the allowlist. Unknown opportunity names → `ingest_errors`, row skipped. `Type=Sponsorship` and `Type=In-Kind` auto-allowlist (always route to dollars).
- **Why:** Cash is the ambiguous Type. Future entries could include refunds, ledger corrections, or non-credit Cash that should not inflate fundraising totals. Default-to-dollars would silently mis-route. Pilot success criterion #1 (data accuracy within $1/1pt) demands loud, reviewable failures over silent over-classification.
- **How to apply:** Supabase `volunteer_credit_allowlist` table holds `(type, opportunity_name_pattern, routing)` rows. Engine seeds with `(Cash, "AI Help", dollars)` from sample data; Kirk + Conor classify new opportunity names as they appear in `ingest_errors` reviews.

## 2026-05-20 — v2 extension fields scope split: v1 emits real nulls

- **Decision:** This session's `compute_metrics.ts` emits ONLY the v1 §7.4 contract (4 metrics + thresholds + tier + rank). The Supabase `volunteers` table includes nullable columns for v2 extension fields (`role`, `signals`, `momentum`, `currentSprint`, `levelId`, `compositePoints`, `rankDelta7d`, `sprintRank`, `weekPoints`, `fundraisingPercentile`, `activityPercentile`). Stream C compute scripts (out of scope this session) populate them in a follow-up.
- **Why:** Sentinel defaults (`atRisk: false`, `activeSprintsLast4: 0`) look like real measurements; if Stream C is delayed, the UI would silently show "everyone's fine" when in fact those signals were never computed. That poisons pilot data-accuracy for the entire window. Genuine NULL = "not yet measured" — explicit, auditable, doesn't lie.
- **How to apply:** Supabase columns are nullable. Engine writes NULL. v2 frontend MUST add null-guards before pilot launch (Stream E work in pilot plan, hard ordering gate). Schema is forward-compatible — no migration needed when Stream C lands.

## 2026-05-20 — Golden fixture is spec-derived; no pre-existing Conor reconciliation artifact

- **Decision:** The W2 engine acceptance test's golden fixture is hand-derived by Claude from CLAUDE.md rules applied to the sample input files, audited by Codex for arithmetic. No pre-existing reconciliation spreadsheet exists. The pilot W4 acceptance gate becomes "Kirk + Conor independently recompute pilot volunteers' totals from raw inputs to $1/1pt tolerance."
- **Why:** Conor's manual workflow today produces a pivot for sales captains to share with volunteers — it's a distribution artifact, not a stored aggregation. YJNest replaces both the workflow and the artifact. The engine is the new authoritative aggregation; there's nothing pre-existing to test against except the raw inputs plus CLAUDE.md.
- **How to apply:** `execution/fixtures/golden_expected.json` is checked in; `execution/fixtures/golden_derivation.md` shows every input row → output line so reviewers can audit. Pilot plan success criterion #1 needs re-wording from "matches Conor's spreadsheet" to "independently re-verifiable from raw inputs."

## 2026-05-20 — Roster is intentionally over-inclusive; identity is flex-keyed

- **Decision:** The Master Roster includes board members, life members, and life directors in addition to Yellow Jackets and Futures. Roster rows can have either `full_contact_id` or `sales_rep_id` missing (but not both — rows with neither are dropped from the in-memory roster with a warning, kept on the spreadsheet for human reference / future ID assignment). `member_type` enum extends to include `Board` (5 values: YJ / Future / Life Member / Life Director / Board). Supabase `volunteers.id` becomes a deterministic synthetic string: `full_contact_id` when present, else `"rep_" + sales_rep_id`.
- **Why:** Conor's actual roster sheet legitimately mixes people across all five categories. Board members + life members fundraise materially and their Unify credit must roll up to the program's $1.5M / $4.2M / $5M org goals. Failing the ingest when a board member lacks `sales_rep_id` (because they don't sell through Unify) or a life member lacks `full_contact_id` (because they don't have a current SF Contact) would be wrong. The over-inclusive roster also leaves a path for one-off future Nest access without a roster restructure.
- **How to apply:** Engine joins still use ID columns deterministically — `sales_rep_id` for Unify rows, `full_contact_id` for SF credit rows. A roster row missing one ID simply isn't reachable from that source (and that's fine — they have nothing to receive there). Their credit from the OTHER source still flows. Org-wide totals sum every roster row's credit; team rollups + ranks EXCLUDE Board/LM/LD because they have no team. Good Standing thresholds apply ONLY to YJ + Future — for everyone else, all 4 thresholds are stored as NULL (the rule doesn't apply; storing false would misrepresent as "measured and failing"). Nest UI access (`has_nest_access`) stays YJ+Future-only for MVP.

## 2026-05-21 — Foundation staff allowlist + org_uncredited bucket

- **Decision:** Foundation employees (ticket reps, suite coordinators, sales staff) who appear as Unify reps live in a separate file — `Sales Staff Directory.xlsx` at the project root — and are mirrored into a Supabase `staff_rep_ids` allowlist. When the engine sees a staff `sales_rep_id` on a Unify row, the staff rep is **filtered out of the multi-rep split divisor silently** (no warning). Remaining volunteer co-reps split the full sale value among themselves. When ALL reps on a row are staff or unknown (N=0 known volunteers), the sale routes to a synthetic `org_uncredited` row in `volunteers` so its dollars still count toward the $1.5M / $4.2M / $5M org totals without giving credit to any individual leaderboard. Unknown rep IDs (in neither roster nor allowlist) behave like staff for split math BUT emit an `unknown_sales_rep_id` warning for operator triage.
- **Why:** Foundation staff helping close a sale is a real workflow (Kirk confirmed 2026-05-21). Treating them as regular reps would dilute volunteer credit (50/50 with Tony Econ when Chris Gracey was the real seller is wrong). Dropping their share entirely (the original SOP behavior) would silently lose program revenue. Filtering them out + redistributing to volunteers preserves both individual fairness and program-revenue accuracy. The allowlist (Option B) plus warning for unknowns gives operational visibility into typos vs. real new staff that need adding.
- **How to apply:** `parse_staff_directory.ts` parses the file at preflight; `staff_rep_ids` is loaded alongside the roster into a `Map<number, StaffEntry>`. `sop_multi_rep_split.md` classifies each Unify rep as volunteer / staff / unknown and computes the divisor from known volunteers only. `org_uncredited` is a single synthetic row with `has_nest_access = false` and no team — all UI surfaces filter it out except org-wide goal progress bars. Seed allowlist (2026-05-21): Tony Econ (200288), Austin Zawicki (2095453).

## 2026-05-21 — Unify display name prefix is opaque; no roster cross-check

- **Decision:** The display-name portion of Unify's `(repId) Display Name` tokens (e.g., "Life Member Chris Gracey", "Future Daniel Akmon") is treated as opaque diagnostic text. Engine never parses the prefix and never validates it against the roster's `member_type`. The rep ID is the only join key.
- **Why:** Prefixes are inconsistent across Unify exports (Kirk confirmed multiple prefix patterns observed, with live-export confirmation still pending). Trusting Unify's prefix could mask roster-out-of-date situations and add a brittle parser surface for zero correctness gain. The roster's `member_type` is the canonical category source.
- **How to apply:** `parse_unify_csv.ts` tokenizer captures `display_name` and stores it for diagnostics only. No `unify_name_prefix_mismatch` warning exists.

## 2026-05-21 — Tier ladder is points-based, college-football names, sourced from 2025 PDF

- **Decision:** The incentive tier ladder is the 6-tier college-football progression from the 2025 Yellow Jacket Incentives PDF (also already in `volunteer-impact-dashboard-v2/src/constants.ts`): Walk-On → Starter → Captain → All-Conference → All-American → Heisman. Thresholds are points-based: 17.5k / 30k / 50k / 75k / 100k / 200k. Walk-On (Tier 1) is the ONLY tier with a $ gate — Actives need 17.5k pts AND $10k raised; Futures need 15k pts AND $7.5k raised. Tiers 2–6 are pure points. This supersedes CLAUDE.md §6.6's legacy Bronze→Diamond dollar ladder, which is wrong and needs a follow-up edit.
- **Why:** Kirk confirmed 2026-05-21: tier thresholds are points, not solely dollars; tier names use the college-football progression confirmed by product. The PDF + v2 constants are the source of truth. The legacy Bronze/Silver/Gold/Platinum/Diamond ladder in CLAUDE.md §6.6 was a placeholder.
- **How to apply:** `sop_tier_calculation.md` rewritten 2026-05-21. Supabase `incentive_tiers` seed loads the 6 tiers verbatim from v2 constants. Assignment algorithm uses Future-aware threshold lookup at Walk-On only; higher tiers ignore `member_type`. Naming note: tier 3 is "Captain" — distinct from the roster's `is_captain` boolean (sales-team captain). Code + UI keep both meanings separate.
- **Out of scope:** Selection Sunday Individual Incentive (ping pong ball raffle from the PDF) is a separate incentive system, not a tier. Add in Stream C or later. Future-role $ gates for tiers 2–6 are also unmodeled today; extend `thresholdFuture` / `minFundraisingFuture` columns when needed.

## 2026-05-21 — Rename role to "Sales Captain" to disambiguate from "Captain" tier

- **Decision:** Rename the team-lead role everywhere in engine + schema + UI from `captain` to `sales_captain`. Roster field is `is_sales_captain`; future SF custom field name is `Sales Captain`; v2 frontend `VolunteerRole` extends to `'volunteer' | 'sales_captain' | 'admin'` (was `'captain'`); pilot stand-in CSV is `pilot_sales_captains.csv`. Tier 3's name stays "Captain" because it's product-facing copy in the 2025 Yellow Jacket Incentives PDF.
- **Why:** Avoids the collision between Captain tier (>= 50K pts) and the volunteer who leads a sales team. Without the rename, "Tony's a Captain" was ambiguous — does he lead a team, or did he hit 50K points? With the rename, "Tony's a Sales Captain" is unambiguous about role; "Tony's at Captain tier" is unambiguous about reward.
- **How to apply:** All future schema, code, and UI uses `is_sales_captain` / `sales_captain`. v2 frontend type widening is Stream E work; until then, the engine writes null for `role` (per the v2 extension-fields-are-null decision). The PDF is unchanged — Tier 3 is still "Captain" in volunteer-facing reward copy.

## 2026-05-19 — TypeScript engine, single language across stack
- **Decision:** Reconciliation engine written in TypeScript, run via `tsx`. Same language as the MVP UI (`volunteer-impact-dashboard`), so engine output types and UI consumption types can be shared.
- **Why:** Schema drift between backend and frontend is the #1 source of bugs in this kind of system. Sharing `types.ts` between engine and UI eliminates a whole class of failure.
- **How to apply:** Single root-level `package.json` for the engine. The MVP keeps its own `package.json`. When we wire up the real frontend, both will import from a shared `types/` module.
