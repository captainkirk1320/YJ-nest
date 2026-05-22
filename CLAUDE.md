# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Project Constitution — YJ-Nest (Fiesta Bowl Fundraising)

**Status:** 🟢 Phase B — Blueprint **COMPLETE.** Data Schema locked (pending sample-file verification in Phase L). Ready to advance.
**Initialized:** 2026-05-18
**Last reconciled:** 2026-05-19 (rev 3 — Salesforce sponsorship source resolved)

---

## For Future Claude Instances

**No code exists yet.** This is a pre-build project in structured discovery. Before doing anything, read `/memory/task_plan.md` to see which B.L.A.S.T. phase is active and what's blocked.

**Hard stop:** Writing any file in `/execution/` is forbidden until the Data Schema section below is approved by the user.

**Session start checklist:**
1. Read `/memory/task_plan.md` → identify current phase and next open checkbox.
2. Read `/memory/progress.md` → see what was resolved last session.
3. Read `/memory/findings.md` → technical constraints already researched.
4. Read `/memory/decisions.md` → architectural choices already made.
5. Advance one phase step at a time; update the memory files as you go.

**Engine build/lint/test commands do not exist yet** — `/architecture/` and `/execution/` are empty. They will be added when Phase L (Link) begins.

The **MVP reference app** lives in [volunteer-impact-dashboard/](volunteer-impact-dashboard/) — the existing AI-Studio-generated React 19 + Vite + Tailwind 4 PWA whose [`src/types.ts`](volunteer-impact-dashboard/src/types.ts) is the **target output shape** the engine must populate (see §5.1 and §7.4). Treat it as the data-contract source of truth: do not refactor those types without updating §7 of this doc first.

Commands (run inside `volunteer-impact-dashboard/`):
- `npm install` — install dependencies
- `npm run dev` — dev server via tsx + Vite ([server.ts](volunteer-impact-dashboard/server.ts))
- `npm run build` — Vite client build + esbuild server bundle into `dist/`
- `npm start` — run production bundle (`dist/server.cjs`)
- `npm run lint` — type-check only (`tsc --noEmit`); no ESLint configured
- `npm run preview` — Vite preview of the built client

No test runner is configured. `GEMINI_API_KEY` must be set in `.env.local` for the in-app AI assistant (see [.env.example](volunteer-impact-dashboard/.env.example)).

---

## 1. North Star

A single mobile-first hub (**YJ's Nest**) that surfaces sales + volunteer data, gamifies fundraising, and pushes shareable resources to Yellow Jacket volunteers so the program hits its 2026 goals. To make the hub *live* (not stale), an automated reconciliation pipeline replaces the current manual VLOOKUP-and-Teams-message workflow.

### Goal hierarchy (2026 season)

| Milestone | Amount | Deadline |
|---|---|---|
| Fast Start | **$1,500,000** | Aug 21, 2026 |
| Annual Goal | **$4,200,000** | Dec 5, 2026 |
| Stretch Goal | **$5,000,000** | Dec 5, 2026 |

### Hard constraints
- **Plug-and-play for non-technical users.** Sharing to social, sending updates, finding shareable content = ≤ a couple of clicks.
- **Mobile-first PWA.** Add-to-Home-Screen flow. Designed for phone use.
- **No donation processing** on this platform. YJ-Nest is empowerment + knowledge base + visibility; money moves elsewhere (Unify/SeatGeek + Salesforce upstream).

---

## 2. System Architecture (3 layers)

```
┌──────────────────────────────────────────────────────────────┐
│  LAYER 3 — The Nest (the experience)                         │
│  Mobile-first PWA, 8 tabs, click-to-share toolkit, AI asst.  │
│  Stack: React 19 + Vite + Tailwind 4 + Motion + Lucide       │
│  Auth: Supabase Auth + Twilio (SMS OTP)                      │
│  Host: Vercel                                                │
└──────────────────────────────────────────────────────────────┘
                            ▲
                            │ reads
                            │
┌──────────────────────────────────────────────────────────────┐
│  LAYER 2 — Aggregation & Rules                               │
│  Per-volunteer × 4 metric dimensions                         │
│  Tiers, ranks, Good Standing booleans, team rollups          │
│  Deterministic. Lives as Supabase views / scheduled functions│
└──────────────────────────────────────────────────────────────┘
                            ▲
                            │ writes
                            │
┌──────────────────────────────────────────────────────────────┐
│  LAYER 1 — Ingest & Reconciliation Engine                    │
│  Unify CSV + Salesforce exports (Sales Rep IDs, YJ Directory,│
│  Volunteer Credit) → normalized rows in Supabase             │
│  Atomic, idempotent, exception-aware                         │
└──────────────────────────────────────────────────────────────┘
                            ▲
                            │ reads (one-way)
                            │
                 Unify export + Salesforce reports
                 (NO write-back to either system)
```

### A.N.T. mapping
- **A — `/architecture/`** SOPs for: CSV ingest, multi-rep split logic, exception application, item categorization, tier calculation, Good Standing rule.
- **N — Navigation:** Routes data between SOPs and Tools. Implemented as orchestrator script + Supabase Edge Functions.
- **T — `/execution/`** Atomic scripts: `parse_unify_csv.ts`, `parse_rep_id_map.ts`, `parse_sf_credit_export.ts`, `parse_exceptions.ts`, `apply_exceptions.ts`, `compute_metrics.ts`, `write_supabase.ts`, etc.

---

## 3. Integrations

### Confirmed
| Service | Role | Access path | Credential status |
|---|---|---|---|
| **Unify / SeatGeek** | Sales source (**read-only**) | Scheduled CSV download → SharePoint | N/A — file-based |
| **Salesforce** | Roster + identity + credit source (**read-only**) | Scheduled report exports → SharePoint | N/A — file-based |
| **SharePoint (M365)** | Canonical landing zone for all source exports | Microsoft Graph API | _Pending Phase L_ |
| **Supabase** | DB + auth + storage + edge functions | API | _Pending Phase L_ |
| **Twilio** | SMS OTP (via Supabase Auth) + outbound texting | API | _Pending Phase L_ |
| **Vercel** | Hosting (PWA) | CLI/Git | _Pending Phase L_ |
| **Gemini 1.5 Flash** | In-app AI assistant (existing MVP choice) | API | _Pending Phase L_ |

### Share-out channels (click-to-share, NOT auto-post)
SMS · Email · Instagram (feed + Stories) · Facebook (feed + Stories) · LinkedIn.

### Dev tooling (not runtime)
Claude Code · Antigravity.

### Known platform constraints
- IG/FB **Stories** click-to-share works via deep-link intents on mobile only. Desktop fallback: download asset → user uploads manually.
- IG/FB **Feed** + LinkedIn share via Web Share API and `linkedin.com/sharing/share-offsite` work cross-platform.

---

## 4. Source of Truth (Inputs)

### 4.0 Identity / Join Model

Each volunteer has **two unique system-of-record IDs**. The engine joins everything through these — never through names.

| ID | System | Format | Example |
|---|---|---|---|
| `sales_rep_id` | Unify / SeatGeek | Numeric | `2041777` |
| `full_contact_id` | Salesforce | 15/18-char alphanumeric | `0031Y0000637jKFQAY` |

```
                  Unify CSV row                            Salesforce records
                  ┌──────────────────┐                     ┌──────────────────────┐
                  │ (sales_rep_id)   │                     │  full_contact_id     │
                  └──────────────────┘                     └──────────────────────┘
                         │                                            ▲
                         │                                            │
                         ▼                                            │
            ┌────────────────────────────────────────────────────────┐
            │     §4.2 Master Volunteer Roster (the bridge file)     │
            │     sales_rep_id  ←→  full_contact_id                  │
            │     + name + team + member_type + contact + links      │
            └────────────────────────────────────────────────────────┘
                         │
                         ▼
                  Volunteer row in Supabase  (canonical record, joined and enriched)
```

> The Master Roster (§4.2) is the bridge — it carries both IDs. Conor to add `full_contact_id` to the Master Roster export.


### 4.1 Unify CSV — `Report Data - YYYY-MM-DDTHHMMSS.csv`
The transactional engine output. **Refresh cadence: scheduled download.**

| Column | Type | Notes |
|---|---|---|
| `Yellow Jacket Rep` | string | Comma-joined list of `(repId) Display Name` tokens. Multi-rep rows = credit split. |
| `Item` | string | Product name. Drives categorization (see §6.3). |
| `Total Sale Value` | decimal | 4-decimal dollar amount. |
| `Account Name` | string | Buyer. `Last, First` or company name. **Field contains commas — must be parsed as quoted CSV.** |

### 4.2 Salesforce — Master Volunteer Roster (consolidated)
**One unified Salesforce export** covering everyone the engine needs to know about: identity, both system IDs, team assignment, contact info, member classification, personal tracking links, and historical performance. **Replaces the three legacy exports** (Sales Rep IDs, YJ Directory, Sales Rosters) — generated by Conor as a single Salesforce report.

| Column | Type | Notes |
|---|---|---|
| `full_contact_id` | string | **required** — Salesforce Contact ID (e.g., `0031Y0000637jKFQAY`). Canonical identity. |
| `sales_rep_id` | int? | **nullable** — numeric Unify Rep ID. Matches `(repId)` tokens in Unify CSV. Some members may lack one. |
| `first_name`, `last_name`, `full_name` | string | identity |
| `email` | string | comms + email share-out channel |
| `phone` | string (E.164) | **required** for SMS OTP login via Twilio |
| `team` | string? | **nullable** — mascot team name (Pistol Petes, Peter the Anteater, etc.). Life Members + Life Directors have no team. |
| `is_captain` | boolean | defaults `false`. True only for sales-team captains. **TO BE ADDED to SF** as a Contact custom field (one-time setup; ~10-12 captains). |
| `member_type` | enum | **canonical column** — `Yellow Jacket` / `Future` / `Life Member` / `Life Director`. Consolidates legacy `Representative Category` + `YJ Category` + `Bowl Position` fields into one. |
| `active` | boolean | inactive members are filtered out of leaderboards but stay queryable for historical data |
| `first_year_of_volunteering` | int | tenure display ("YJ since 2021") |
| `fiesta_ticket_link` | string? | personal SeatGeek URL for Fiesta Bowl |
| `rate_ticket_link` | string? | personal SeatGeek URL for Rate Bowl |
| `last_year_fundraising_dollars` | numeric? | optional YoY display |
| `last_year_fundraising_rank` | int? | optional YoY display |
| `job` | string? | optional admin context (employer + title) |

**Derived in the engine, not stored on the roster:**
- `has_nest_access` — derived from `member_type`. For MVP: `true` for `Yellow Jacket` + `Future`, `false` for `Life Member` + `Life Director`. Future one-off Life Member access = an admin override flag in Supabase, not a roster column.
- `personal_goal_amount` — defaults to `$10,000` for all volunteers (the Good Standing threshold). No per-volunteer column.
- `tier_id`, `rank`, `metrics.*`, `thresholds.*`, `raised` — all computed by the engine.

**Conor's open items on this export:**
1. Add `full_contact_id` column (Salesforce report field — flexible per Conor).
2. Add `is_captain` as a Contact custom field in Salesforce, then include in the report.
3. Consolidate `Representative Category` / `YJ Category` / `Bowl Position` into one `member_type` column.

> **Known gap (legacy):** prior YJ Directory exports were missing 12 new "Futures" and contact info for some active members. The consolidated Master Roster export must include them. Engine still treats missing matches as `ingest_errors` (not hard failures) for resilience.

### 4.3 Salesforce — Volunteer Credit Export (Gorlocks-style report)
**Single unified Salesforce export** carrying everything credited to a volunteer in Salesforce — volunteer/attendance points, sponsorships, in-kind donations, direct donations, and any other non-Unify credits. Generated by Conor; mirrors the `2026-27 Gorlocks-….xlsx` template. **One file per team**, file naming pattern: `{TeamMascot}-{timestamp}.xlsx`.

| Column | Notes |
|---|---|
| `Full Contact ID` | **TO BE ADDED to the export** — Conor confirmed Salesforce report format is flexible. Required to eliminate fuzzy-name joins. |
| `Contact Full Name` | identity (kept for human readability) |
| `Opportunity: Opportunity Name` | e.g., "AI Help", "Acme Co Sponsorship" |
| `Amount Credited` | numeric value — unit depends on `Type` + `Campaign` (see routing below) |
| `Type` | e.g., `Cash`, `Sponsorship`, `In-Kind` |
| `Volunteer Job: Volunteer Job Name` | e.g., "April YJ Meeting" |
| `Volunteer Job: Campaign` | e.g., "Committee Participation Points 2026-27", or sponsorship campaign name |

**Routing logic (engine applies per row):**

| Row matches… | Treated as | Feeds |
|---|---|---|
| `Campaign` contains `"Committee Participation Points"` | **points** | `totalPoints` only |
| `Type` ∈ {`Sponsorship`, `In-Kind`} | **dollars** | `totalFundraising` + `totalPoints` |
| Any other dollar-denominated campaign (direct donations, etc.) | **dollars** | `totalFundraising` + `totalPoints` |
| Ambiguous (unknown Type and Campaign) | → `ingest_errors` | none until reviewed |

> **Source of volunteer points today:** Volunteers fill a JotForm → Conor downloads CSV → uploads to Salesforce → creates Volunteer Hours records → those records flow into this report as points-denominated rows. The JotForm → Salesforce step is **manual** and remains outside YJ-Nest's scope for MVP (see §11 deferred enhancements).

### 4.4 Exceptions (`exceptions.txt` in SharePoint)
A plain-text file, edited by foundation staff (Conor + Dan), containing the human-curated business rules that adjust default reconciliation behavior (custom credit splits, fixed dollar adjustments). Seeded from `Manual Tweaks for YJ Report.docx` (~13 entries). See §6.5 for format and engine behavior.

---

## 5. Delivery Payload (Outputs)

**YJ-Nest is one-way and read-only with respect to source systems.** The engine consumes from Salesforce + Unify exports and writes to Supabase. It never writes back to Salesforce, Unify, or any source system. The "Volunteer Hours" Salesforce object is **not** a target of this system — it is maintained by the existing manual JotForm → Conor → Salesforce workflow (out of scope; see §11).

### 5.1 Supabase tables consumed by The Nest
The MVP's TypeScript interfaces (in `volunteer-impact-dashboard/src/types.ts`) are the **target shape**:
`Volunteer`, `Team`, `Goal`, `IncentiveTier`, `Resource`, `Committee`, `PersonalLink`, `EventAnnouncement`, `ActivityEvent`, `Attendance`, `Contribution`, `ScheduleEvent`, `UpcomingMoment`, `AppNotification`, `SocialCalendarEntry`, `Issue`.

The engine's job: produce rows that **fully populate** each `Volunteer.metrics`, `Volunteer.thresholds`, `Volunteer.tierId`, `Volunteer.rank`, and the matching `Team` rollups.

### 5.2 Missing-match log (operational output, not a payload)
Every row that fails to join (unknown repId, unknown name, ambiguous exception, malformed exception block, ambiguous Salesforce credit-export row) → `/.tmp/missing_matches_{date}.csv` + a Supabase `ingest_errors` row for operator review.

---

## 6. Behavioral Rules (the deterministic business logic)

### 6.1 The 4 metric dimensions (per volunteer + per team)

| Dimension | Unit | Definition | Threshold ("Good Standing") |
|---|---|---|---|
| `totalFundraising` | **dollars** | All revenue brought in by the rep, summed from **two sources**: (a) everything in Unify CSV (donations, tickets, sponsorships at the ticketing tier, parking, Par 3, KOE, pregame parties), **PLUS** (b) sponsorships + in-kind donations + direct donations recorded in Salesforce (see §4.3). | ≥ $10,000 |
| `rateBowl` | **dollars** | Sum where Unify `Item` matches Rate Bowl (incl. `PARKING - Rate Bowl`) | ≥ $2,000 |
| `wishesForTeachers` | **dollars** | Sum where Unify `Item` matches Wishes for Teachers | ≥ $1,000 |
| `totalPoints` | **points** | `totalFundraising × point-multiplier` **+ volunteer_points** (Gorlocks). **Note:** "Attendance points" and "volunteer points" are the same stream — there is no separate attendance-points column. The MVP's `Attendance` UI is a *presentation slice* of the volunteer_points data (e.g., rows where Volunteer Job Name contains "Meeting" / event attendance). | ≥ 17,500 pts |

**Unit of measure:** `totalFundraising`, `rateBowl`, `wishesForTeachers` are denominated in **dollars**. `totalPoints` is denominated in **points** (the integer count, not a dollar value — even though the current multiplier is 1.0 making the numbers equal-looking).

**Good Standing** = all four thresholds met. Binary state surfaced as `Volunteer.thresholds.{4 booleans}`.

### 6.2 RESOLVED RULINGS (2026-05-19)

- ✅ **`totalFundraising` includes ticket revenue.** All Unify-CSV revenue counts. The MVP's `doc-points` text ("donations only") is **outdated copy** and will be updated in the UI.
- ✅ **`totalFundraising` also includes Salesforce sponsorships + in-kind donations + direct donations.** Engine must merge two source streams (Unify + Salesforce non-ticket revenue). See §4.3.
- ✅ **`totalPoints` is denominated in points, not dollars.** Threshold is 17,500 *points*, not $17,500. With the current 1.0 multiplier the numbers look the same as dollars, but the units differ — labels in the UI must say "pts."
- ✅ **Volunteer Points = Volunteer Points + Attendance Points (single stream).** No separate attendance column exists.

### 6.2.1 RESOLVED 2026-05-19
- ✅ **All Salesforce credits (volunteer points, sponsorships, in-kind, direct donations) live in ONE unified export** — the Volunteer Credit Export (§4.3). Engine routes rows by `Type` + `Campaign`. Generated by Conor.
- ✅ **Salesforce report format is flexible** → engine spec REQUIRES `Full Contact ID` on the Master Roster (§4.2) AND the Volunteer Credit Export (§4.3) to eliminate fuzzy-name joins. Conor to add.

### 6.3 Item → Metric categorization map (current ruleset)

Match `Item` strings case-insensitively. Multiple categorizations are additive (one row can hit multiple metrics).

| Pattern | totalFundraising* | rateBowl | wishesForTeachers | totalPoints |
|---|---|---|---|---|
| `/Rate Bowl/` (incl. `Rate Bowl - {opponent}`) | ✅ | ✅ | — | ✅ |
| `/PARKING - Rate Bowl/` | ✅ | ✅ | — | ✅ |
| `/Wishes for Teachers/` | ✅ | — | ✅ | ✅ |
| `/Par 3 Challenge/` | ✅ | — | — | ✅ |
| `/Fiesta Bowl/` (incl. parking + Club '71 + tickets) | ✅ | — | — | ✅ |
| `/Football Kickoff/` or `/KOE/` | ✅ | — | — | ✅ |
| All other items | ✅ | — | — | ✅ |

> **Note on Rate Bowl matchups:** Rate Bowl game opponents (`Rate Bowl - Minnesota vs New Mexico`) are not known until late in the season. The pattern matcher is `/Rate Bowl/` (substring), which handles all variants.

> **Salesforce-sourced revenue** (sponsorships, in-kind, direct donations not in Unify) is **NOT** categorized via this Item-pattern table — it flows directly to `totalFundraising` + `totalPoints` based on the Salesforce report's own `Type` / `Campaign` field. See §4.3.

### 6.4 Multi-rep credit split

When `Yellow Jacket Rep` contains N reps (after CSV-quoted parse and `(repId)` extraction):

- **Default rule:** split `Total Sale Value` **evenly** among N reps (each gets `value / N`).
- **Exception rule:** if an exception block matches `(Account Name, Item)` or `(Account Name)` or any rep involved, apply the exception (custom split percentages, redirected credit, fixed dollar adjustments).
- Exceptions **replace** the default split when a match is found.
- **Life Member / Life Director in a multi-rep split is handled normally** — credit is attributed to them in the underlying data even though they don't appear in Nest. If a different distribution is wanted (e.g., redirect the Life Member's share to an Active Yellow Jacket), it must be expressed as a SPLIT exception in `exceptions.txt`.

### 6.4.1 Life Member / Life Director access rule

- For MVP, `has_nest_access = false` for `member_type ∈ {Life Member, Life Director}`. They do not log in, do not appear in leaderboards, team views, or any Nest UI.
- They DO remain in the master roster and the engine processes their credit normally — so org-wide totals stay accurate and their data is queryable for admin/historical purposes.
- One-off future access for an individual Life Member: an admin-only `nest_access_overrides` row in Supabase, NOT a column on the roster.

### 6.5 Exceptions — plain-text file in SharePoint

**Source-of-truth file:** `exceptions.txt` in the same SharePoint folder as the report exports. Edited by foundation staff (Conor + Dan) — no admin UI, no Salesforce custom object. Low edit frequency (every now and again) makes this the simplest viable system.

**Block format** (one block per exception, separated by `---`):

```
---
ID: OV-001
Added: 2026-02-15
Active: yes
Type: SPLIT
Account: Patrick Meyer's dad's account
Reps:
  - 2095100 Patrick Meyer: 50%
  - 2095101 Steven Davis: 50%
Notes: Father's account split between sons.

---
ID: OV-002
Added: 2026-03-01
Active: yes
Type: ADJUST
Account: Barkyoumb sale
Adjustments:
  - 2095102 Eric Barkyoumb: -800 rate_bowl
  - 2095103 Kerry Cummiskey: +800 rate_bowl
Notes: Credit transferred per request.
```

**Two operation types** cover the full Manual Tweaks corpus:
- `SPLIT` — redistribute credit on matched rows (custom percentages instead of even).
- `ADJUST` — add/subtract fixed dollar amounts to specific reps × metrics.

**Identifier rule:** Reps MUST be referenced by Sales Rep ID (the numeric value). Names are kept on the line for human readability but are NOT the join key — names are ambiguous, Rep IDs are not.

**Runtime mirror:** On each ingest, the engine parses `exceptions.txt` and upserts the result into a Supabase `exceptions` table (so The Nest can display the active rule set, audit trail, etc.). The text file remains the source of truth; the table is a cache.

**Validation behavior:**
- Each block parsed independently. A malformed block → one `ingest_errors` row with block ID + reason; the rest of the file still applies.
- Unknown Rep IDs → `ingest_errors` row, block skipped.
- Split percentages not summing to 100% → `ingest_errors` row, block skipped.
- Unknown metric name (must be one of `total_fundraising`, `rate_bowl`, `wishes_for_teachers`, `total_points`) → `ingest_errors` row, block skipped.

**Training:** A 1-page reference doc (`docs/exceptions_format.md`) with the template + 3 worked examples ships to Conor and Dan. Approximate learning curve: 10 minutes.

**Seed data:** ~13 entries from `Manual Tweaks for YJ Report.docx`.

### 6.6 Tier ladder *(DRAFT — likely to change)*

Per `INCENTIVE_TIERS` in MVP:

| Tier | Threshold ($ raised) | Reward (placeholder) |
|---|---|---|
| Bronze | $2,500 | Bronze Shield Reward |
| Silver | $5,000 | Silver Medal Reward |
| Gold | $10,000 | Fiesta Bowl Polo |
| Platinum | $20,000 | VIP Game Tickets |
| Diamond | $35,000 | Field Passes |

> Stored as a Supabase table so it's editable without a deploy.

### 6.7 Points multiplier

`points_per_dollar` defaults to **1.0**. Stored as a config row per Item-pattern, so multipliers can be tuned per event without a code change.

### 6.8 Pushes (Hustle Board context)

A **push** = a time-bounded campaign window (e.g., "Football Kickoff push, July 21 – Aug 21") during which a specific event's resources are featured and shares are aggregated for the Hustle Board.

Schema:
```sql
pushes (id, label, event_type, starts_at, ends_at, target_amount, active)
```
Admin-creatable. Not pre-seeded.

### 6.9 AI Assistant

In-app assistant uses **Gemini 1.5 Flash** (per existing MVP). Implementation is abstracted behind an `aiClient` interface so it can be swapped (Claude, OpenAI, etc.) without UI changes.

---

## 7. Data Schema

### 7.1 Input shape — Unify CSV row
```json
{
  "yellow_jacket_rep": "(2041777) Life Member Chris Gracey,(2095092) Josh Guinn",
  "item": "Vrbo Fiesta Bowl - CFP Semifinal: Miami vs Ole Miss",
  "total_sale_value": 2190.0000,
  "account_name": "Gracey, Kelli"
}
```

### 7.2 Input shape — Master Volunteer Roster row
```json
{
  "full_contact_id": "0031Y0000637jKFQAY",
  "sales_rep_id": 2041777,
  "first_name": "Chris",
  "last_name": "Gracey",
  "full_name": "Chris Gracey",
  "email": "chris.gracey@example.com",
  "phone": "+14805550123",
  "team": null,
  "is_captain": false,
  "member_type": "Life Member",
  "active": true,
  "first_year_of_volunteering": 2018,
  "fiesta_ticket_link": null,
  "rate_ticket_link": null,
  "last_year_fundraising_dollars": 25000,
  "last_year_fundraising_rank": 14,
  "job": "Acme Corp - Partner"
}
```
> `team` and tracking links are `null` for Life Members + Life Directors. `phone` and `full_contact_id` are required for everyone.

### 7.3 Input shape — Salesforce Volunteer Credit Export row (unified)
Single row shape covers all SF-side credits: volunteer/attendance points, sponsorships, in-kind, direct donations. The engine routes each row by `type` + `campaign` per §4.3.

```json
{
  "full_contact_id": "0031Y0000637jKFQAY",
  "contact_full_name": "Kirk Harbaugh",
  "opportunity_name": "April YJ Meeting",
  "amount_credited": 100,
  "type": "Cash",
  "volunteer_job_name": "April YJ Meeting",
  "campaign": "Committee Participation Points 2026-27"
}
```
> `amount_credited` unit depends on row classification: **points** for Committee Participation Points campaigns; **dollars** for sponsorships, in-kind, and other dollar-denominated campaigns.

### 7.4 Output shape — Supabase `volunteers` row (consumed by The Nest)
Exactly matches the `Volunteer` interface in `volunteer-impact-dashboard/src/types.ts`. The engine populates every field. **This is the sole engine output.** There is no Salesforce write-back.

---

## 8. Architectural Invariants

- LLMs are probabilistic; **business logic must be deterministic**. The engine never asks an LLM to categorize an item or split credit.
- Credentials live in `.env` (and Vercel env vars in production). Never in code.
- Intermediate files route through `/.tmp/`. Final output lands in Supabase tables consumed by The Nest. **No write-back to Salesforce, Unify, or any source system.** The engine is one-way.
- **Idempotent:** re-running ingestion with the same input must produce the same output. Engine upserts on `(source, external_id, hash)`.
- **Exception-aware:** every metric calculation passes through the parsed exceptions before write.
- **Missing matches never break execution.** They log to `ingest_errors` for operator review.
- **Tiers, multipliers, push windows are data, not code.** Stored in Supabase tables.
- **Exceptions are a plain-text file in SharePoint**, edited by foundation staff. No admin UI required.
- **If logic changes, update the SOP in `/architecture/` BEFORE the code in `/execution/`.**

---

## 9. Triggers / Automation
*TBD — finalized in Phase T. Expected:*
- Scheduled CSV ingest job (cron / Supabase Edge Function on a schedule)
- Operator-triggered manual ingest (drag-and-drop CSV upload UI)
- Exception edits via direct SharePoint file edit (no admin UI; engine re-parses on each ingest)

---

## 10. Maintenance Log
*Self-annealing repair entries land here once Phase T begins.*

---

## 11. Deferred Enhancements (post-MVP candidates)

Things explicitly **out of scope for V1** but worth tracking so they don't get re-discussed from scratch later.

### 11.1 JotForm → Salesforce automation
**Current manual flow:** Volunteer fills a JotForm to log volunteer hours → Conor downloads the CSV from JotForm → Conor manually uploads it to Salesforce → Salesforce creates `Volunteer Hours` records → those flow into the §4.3 Volunteer Credit Export → YJ-Nest reads them.

**The friction:** Conor's manual download/upload step. Volunteers may submit hours faster than Conor can process them; Nest displays stale points until Conor next runs the upload.

**Future enhancement:** Direct JotForm → Salesforce integration (Zapier, Power Automate, JotForm's native Salesforce connector, or a small webhook ingester writing through the SF API). Volunteer hours land in SF within minutes, propagate to Nest on the next ingest cycle.

**Why deferred:** Not on the critical path for the MVP. Adds an additional system integration (JotForm API or auth) and a Salesforce *write* surface that V1 explicitly excludes. Revisit when the rest of YJ-Nest is in production and operator pain from the manual step justifies the work.

### 11.2 Salesforce write-back of reconciled credit
**Out of V1.** YJ-Nest is read-only with respect to Salesforce. If a future need emerges to push reconciled sales credit back to a Salesforce object (e.g., for legacy reporting), revisit. Today, Nest is the canonical home for reconciled credit; Salesforce holds inputs only.

### 11.3 Per-event point multipliers
The points multiplier defaults to 1.0 (see §6.7). Per-Item multiplier configuration is supported in the data model but not exposed via UI in V1. Add admin UI when business rules require it.

### 11.4 Live API replacements for CSV ingest
Unify and Salesforce may eventually expose API endpoints we can pull directly. The engine's `ReportSource` interface (§3 architecture) is designed so the source can be swapped from file-based to API-based without touching downstream logic.
