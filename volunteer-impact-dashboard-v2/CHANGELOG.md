# YJ-Nest Dashboard — v2 CHANGELOG

**Date:** 2026-05-19
**Driven by:** Three-brain analysis (Gemini structural scan + Codex adversarial review) and follow-up product decisions on personas, sprints, and gamification deployment.
**Status:** Reference implementation. Mock data still hardcoded — engine integration is Phase L.

---

## v2.1.4 patch (2026-05-20) — Real 2025 incentives + Tickets/Swag/Experiences/Donations

Sourced from [`Incentives_for_Yellow_Jackets_-_2025.pdf`](../Incentives_for_Yellow_Jackets_-_2025.pdf). Everything below is the 2025 program reality, not placeholder.

### New data model

- **`TierReward` struct** carries the four categories per tier: `tickets`, `swag`, `experiences`, `donations` (+ optional `chooseOne` upgrade list).
- **`IncentiveTier`** extended with:
  - `thresholdFuture` — Tier 1 alternate threshold for Futures
  - `minFundraising` / `minFundraisingFuture` — $ gate on Tier 1
- **`VolunteerCategory`** type (`'Active' | 'Future' | 'Life Member' | 'Life Director'`) — drives which Tier 1 threshold applies. Added as `Volunteer.volunteerCategory`.

### Real 2025 thresholds

| Tier | Name | Active threshold | Future threshold | $ gate (Active / Future) |
|---|---|---|---|---|
| 1 | Walk-On | 17,500 pts | 15,000 pts | $10,000 / $7,500 |
| 2 | Starter | 30,000 pts | — | — |
| 3 | Captain | 50,000 pts | — | — |
| 4 | All-Conference | 75,000 pts | — | — |
| 5 | All-American | 100,000 pts | — | — |
| 6 | Heisman | 200,000 pts | — | — |

### UI changes

- **Pre-tier state on Standings** — when `levelId === 0`, personal hero reads "Working Toward Walk-On" with role-aware threshold ("17,500 pts + $10,000 raised" for Actives, "15,000 + $7,500" for Futures) and progress bar from 0 to that target.
- **Ladder cards now show categorized rewards** — Tickets / Swag / Experiences / Donations rows + a "Choose one" upgrade list per tier.
- **Tier 1 split threshold visible** in the Ladder ("17,500 pts (Actives) · 15,000 pts (Futures) · $10,000 raised / $7,500 (Futures)").

### Mock data recalibration

Most demo volunteers are now **pre-Tier-1**, which is realistic — Walk-On itself is an achievement. Mock distribution:

- Elena (38.5k pts, Active) → Starter (Tier 2)
- Michael Chen (16.8k pts, Future, $15.4k raised) → Walk-On (Tier 1) — exactly the kind of volunteer the dashboard should celebrate
- Kirk (13.1k pts, Active) → Pre-tier, working toward Walk-On
- 5 other demo volunteers → Pre-tier
- Top of MOCK_LEADERBOARD: 3 at Starter (Elena/James/Priya), 4 at Walk-On (Marcus/Anna/Hannah/Michael), 4 pre-tier

### Selection Sunday incentive (deferred)

The 2025 PDF describes a parallel ping-pong-ball / CFP-experience mechanic for individual fundraising milestones ($10k base + $7.5k increments + $10k YoY bonus). Not modeled in v2.1.4 — flagged for separate prototyping. It's a sweepstakes-style mechanic, not a tier.

### Reward format note

The 2025 PDF doesn't have an explicit "Donations" category; that field is empty for all six tiers. When the new format you mentioned lands with actual donation entitlements, drop them into `TierReward.donations: string[]` per tier — no schema change needed.

---

## v2.1.3 patch (2026-05-20) — Strip editorial from tiers

Product correction: incentive tiers are strictly point thresholds. Nothing more, nothing less.

- **Dropped `description` field** from `IncentiveTier`. The "what this tier means" copy I added ("Best in the region," "National caliber," etc.) was editorial drift — gone.
- **Marked thresholds as PLACEHOLDER** in `constants.ts`. The 2025 incentives reference image didn't come through; current values are placeholders until product shares the real numbers.
- **Reward strings set to `'TBD'`** to make it obvious they're stubs until the Tickets/Goods/Experiences/Donations format lands.
- Standings UI no longer shows description on the personal hero or in the Ladder rows — just tier name, threshold, % scarcity, and the placeholder reward.

---

## v2.1.2 patch (2026-05-20) — Consolidate to 6 incentive tiers

Product decision: the gamification ladder IS the incentive tier ladder. One structure, not two.

- **6 tiers (down from 9):** Walk-On → Starter → Captain → All-Conference → All-American → Heisman
- **`LEVELS` array removed.** The `IncentiveTier` interface now carries the gamification fields (`pctOfProgram`, `description`) and Standings reads directly from `INCENTIVE_TIERS`.
- **`Level` interface removed** from `types.ts` — `IncentiveTier` is now the unified type.
- **`Volunteer.tierId`** strings changed from `bronze/silver/gold/platinum/diamond` → `walk-on/starter/captain/all-conference/all-american/heisman`.
- **`Volunteer.levelId`** now 1..6 (1-based index into `INCENTIVE_TIERS`).
- **Home Good Standing card** now compares composite points against tier thresholds (was comparing `raised` dollars against tier thresholds — broken when the unit changed).
- Helpers: `tierForPoints()` and `pctAtOrAboveTier()` replace the removed `levelForPoints()` / `pctAtOrAboveLevel()`.
- Reward strings (e.g., "Heisman Experience Package") are placeholders — they'll be restructured into the Tickets / Goods / Experiences / Donations format when that spec lands.

---

## v2.1.1 patch (2026-05-20) — Windows & level names

- **Dropped All-Time leaderboard** per product decision (not enough multi-year continuity to justify the tab)
- **Windows are now Week / Sprint / Season** (Sprint kept over Month per behavioral-signal rationale)
- **Level names refreshed to lean fully into college football:** Rookie → Walk-On → Starter → Captain → All-Conference → All-American → Heisman → Bowl Champion → Hall of Fame
- `STANDINGS_BY_USER` and `MOCK_LEADERBOARD` updated to carry `weekPoints` (last 7 days) instead of `allTimePoints`

---

## v2.1 update (2026-05-19, same-day) — Standings + 9-level ladder

**Driven by:** Inspiration from Skool's leaderboard pattern. North star: move the middle 60-70% (top 10% stays consistent YoY).

### What's new

- **`Standings` tab replaces `Hustle Board`** inside Activity Report. Same modal slot, much richer content.
- **Three-window leaderboards** — Sprint / Season / All-Time. Each window has a different #1, so multiple paths to feel like a winner exist.
- **Top 10 only** — bottom never publicly shown. Middle volunteers see themselves in a dedicated "Your Position" row only if outside the top 10.
- **Movers This Week** — a dedicated section showing the top 5 climbers (by rank delta over 7 days). Specifically designed to spotlight mid-pack volunteers who had a hot week. The top 10% can't be movers (already at top) — this section is structurally engineered for the middle.
- **9-level ladder** — Rookie → Walk-On → Sideline → Drive Captain → Game Changer → Playmaker → All-Conference → All-American → Hall of Fame. Football-themed, with % scarcity at each level.
- **Composite scoring** — levels and ranking based on a blend of totalPoints + sprint participation + recognition counts, not pure dollars. Fairer to middle volunteers whose networks have less money.
- **Personal hero** at top of Standings — your current level, points to next, sprint rank, season rank, 7-day movement. Always visible alongside the social leaderboard.
- **"See full standings" link** on Home's Where You Stand card — explicit affordance to deep-dive.

### Why this beats v2's Hustle Board

| v2 Hustle Board | v2.1 Standings |
|---|---|
| One leaderboard (push only) | Three windows (Sprint / Season / All-Time) |
| Shows up to ~5 rows w/ rank #1 dominant | Top 10 per window + your position separately |
| No mover/climber recognition | Dedicated Movers This Week (top 5 climbers) |
| 5-tier reward ladder (Bronze-Diamond) only | 9-level identity ladder + 5-tier reward (coexist) |
| No personal hero | Hero card with level + points to next + scarcity |

### What's still mock data
- `STANDINGS_BY_USER` keyed by user id — engine will derive from ActivityEvent + Contributions
- `MOCK_LEADERBOARD` — synthetic top-of-program data; production reads from real volunteers
- `LEVELS` thresholds — config, tunable per season

### Files touched in v2.1
- `src/types.ts` — Volunteer extended with `levelId`, `compositePoints`, `rankDelta7d`, `sprintRank`, `allTimePoints`; new `Level` interface
- `src/constants.ts` — added `LEVELS`, `levelForPoints()`, `pctAtOrAboveLevel()`, `STANDINGS_BY_USER`, `MOCK_LEADERBOARD`
- `src/tabs/Standings.tsx` — NEW (~285 lines)
- `src/tabs/ActivityReport.tsx` — Hustle tab renamed to Standings; old hand-rolled leaderboard JSX (~120 lines) replaced with `<Standings />`
- `src/tabs/Home.tsx` — Where You Stand card gains "See full standings →" affordance
- `src/App.tsx` — `initialTab: 'Hustle'` → `'Standings'`

---

---

## What changed at a glance

| Surface | v1 | v2 |
|---|---|---|
| **Home (volunteer)** | 11-widget dashboard | 5-block sprint launchpad |
| **Home (captain)** | n/a — same as volunteer | New `<CaptainHome />` triage view |
| **Home (admin)** | n/a — same as volunteer | New `<AdminDashboard />` oversight view |
| **Routing** | Single Home tab | Role-based Home; bottom nav adds "My Team" for captains, "Admin" for admins |
| **Hustle Board card on Home** | Present | **Removed** (still exists inside Activity Report) |
| **Live Activity Feed on Home** | Firehose | **Replaced** with single peer-proof line |
| **2026 Campaign Progress Bar** | On Home | **Moved** to Weekly Digest |
| **Tier ladder** | Full reward matrix on Home | Compact: current tier + next milestone only |
| **Streak (8-week)** | Visual `i > 1` literal | **Replaced** with momentum model: "3 of last 4 sprints active" |
| **Smart Action Prompt copy** | "Football Kickoff push is live" | Sharpened: one action + one reason + one button |
| **Sprint/push model** | Mentioned in CLAUDE.md, not wired | First-class. Home is sprint-scoped. |
| **Nudge flow** | n/a | New `<NudgeModal />` — SMS template, opens native Messages app |

---

## Personas (now three)

Defined in `src/types.ts` via `Volunteer.role`:

- **`'volunteer'`** (~95–100 of 112): launchpad Home, sprint-focused, personal action surfaces
- **`'captain'`** (~10–15): regional-manager equivalent. Sees own team in full (members + donors + activity). Sees other teams as aggregates only. Cannot communicate via the platform — sends SMS from their own phone using templates surfaced by the app.
- **`'admin'`** (Foundation staff, Life Directors): full visibility across all teams, all volunteers, all donors. Configures sprints.

Operator persona (Conor, Dan) edits `exceptions.txt` in SharePoint — out of app, not modeled here.

---

## At-risk signal definition

From `src/types.ts` `Volunteer.signals`:

```ts
signals.atRisk   = fundraisingPercentile <= 0.15 && activityPercentile <= 0.15;
signals.coasting = fundraisingPercentile <= 0.50 && activityPercentile <= 0.15;
signals.rising   = deltaShares(14d) > 0 || tierLevelChanged || milestoneHitThisSprint;
```

**Intersection rule** (both bottom 15%) avoids false positives:
- High $ + low activity (raised big from few asks, then quiet) → NOT at risk
- High activity + low $ (trying hard, not converting yet) → NOT at risk (coaching opportunity instead)
- Both bottom 15% → real concern, captain intervenes

Thresholds live in Supabase config when the engine ships — UI reads them, doesn't define them.

---

## Captain triage view (`<CaptainHome />`)

Three buckets, sorted by urgency:

| Bucket | Trigger | Default action |
|---|---|---|
| ✅ Rising | hit a milestone, climbed a tier, personal-best week | "Send congrats" |
| 🟡 Coasting | runway exists, no movement 14d | "Send nudge" |
| 🔴 At risk | bottom 15% × 15% | "Schedule check-in" |

Each row → opens `<NudgeModal />` with templates per signal type.

Captain also sees:
- Own team aggregate stats (with all donors)
- Other teams' aggregates only (no individual visibility)

---

## Admin dashboard (`<AdminDashboard />`)

Full-visibility oversight:

- Org-goal progress bar (this is where it lives — not on volunteer Home)
- All-teams aggregate table (sortable by metric)
- All-volunteers list (signals visible, donor counts visible)
- Filter chips: by signal (rising / coasting / at-risk), by team, by Good Standing met/unmet
- Drill into any volunteer → same Activity Report donor view captains get

No captain-activity tracking. We explicitly decided NOT to log/measure captain nudge behavior (privacy + trust). Per CHANGELOG decision 2026-05-19.

---

## Nudge mechanics

Out-of-app SMS via native Messages.

1. Captain taps a member row → `<NudgeModal />`
2. Modal shows 3–5 templates for that signal type (loaded from `NUDGE_TEMPLATES` table)
3. Token substitution (`{firstName}`, `{sprintName}`, `{daysLeft}`) renders preview
4. "Open in Messages" fires `sms:+1xxx?body=<urlencoded>`
5. Captain reviews on their phone, edits, sends. Platform never touches Twilio for outbound nudges.

Templates kept ≤160 chars (single SMS segment). Personal-sounding language. No "AI generated" labels. Editable by admins via the (future) admin template editor.

---

## Sprint as organizing principle

Pushes (CLAUDE.md §6.8) are now load-bearing data:

- `Push` interface added to `types.ts`
- `Volunteer.metrics` extended with `currentSprint` sub-shape
- `ActivityEvent.pushId` field added (nullable for evergreen)
- Home banner shows active push status; everything below is sprint-scoped

Mock data includes one active push: Football Kickoff sprint.

---

## Cuts and moves

### Removed from Home
- Hustle Board card (still accessible via Activity Report → Hustle Board sub-tab)
- Live Activity Feed (replaced with single insight line: "12 Yellow Jackets shared Football Kickoff this week")
- 2026 Campaign Progress Bar (relocated to Weekly Digest)
- Cohort comparison expanded view (compacted to one rank line)
- Tier ladder full matrix (compacted to current + next milestone)

### Single-sourced
- All share counts now read from one derived field. No more "14 on Home, 12 on Weekly Digest" drift.
- Org goal progress reads from `GOALS` array in one place.

### Smart Action Prompt copy template
Now follows Codex's "one action / one reason / one button" rule:
- "Send your Football Kickoff link to 3 people who bought last year. Takes 45 seconds." → `Text 3 Contacts`
- "You need $180 for Good Standing. One Rate Bowl table share is your fastest path." → `Send Rate Bowl Link`

---

## File-by-file delta

| File | Change | Lines (v1 → v2) |
|---|---|---|
| `src/types.ts` | Added Role, Signals, Momentum, Push, RecognitionCategory, NudgeTemplate; extended Volunteer, Team | 207 → ~280 |
| `src/constants.ts` | Added PUSHES, NUDGE_TEMPLATES, RECOGNITION_CATEGORIES; updated VOLUNTEERS w/ roles, signals, momentum | 587 → ~700 |
| `src/App.tsx` | Role-based Home routing; new tabs registered | 300 → ~320 |
| `src/components/Layout.tsx` | NAV_ITEMS now role-filtered; "My Team" tab for captains, "Admin" for admins | 192 → ~200 |
| `src/tabs/Home.tsx` | **Rewrite** — 5-block volunteer launchpad | 729 → ~280 |
| `src/tabs/CaptainHome.tsx` | **NEW** — triage view | 0 → ~320 |
| `src/tabs/AdminDashboard.tsx` | **NEW** — oversight view | 0 → ~280 |
| `src/tabs/WeeklyDigest.tsx` | Adds the org goal bar moved from Home | 148 → ~200 |
| `src/components/NudgeModal.tsx` | **NEW** — SMS template send flow | 0 → ~180 |

Other files (`Toolkit.tsx`, `Team.tsx`, `Events.tsx`, `Schedule.tsx`, `Help.tsx`, `ActivityReport.tsx`, `Login.tsx`, `AIChatAssistant.tsx`, `EventSummaryCard.tsx`, `ResourceCard.tsx`) — unchanged from v1.

---

## What's still mock data (engine work in Phase L)

- All percentile-based signals (`atRisk`, `coasting`, `rising`) are hardcoded per volunteer in `constants.ts`. The engine will compute them.
- Sprint progress (shares vs. target) is a static number for the demo push.
- Nudge templates are 4 hardcoded examples. Production library lives in Supabase.
- Peer-proof insight line on Home ("12 YJs shared this week") is a literal string. Production reads from aggregated ActivityEvent.

---

## CLAUDE.md updates required when v2 promotes

These haven't been written yet — the dashboard updates run ahead of the constitution update. When v2 is locked in, update:

- **§1 North Star** → add Personas subsection (Volunteer / Captain / Admin / Operator)
- **§5.1 Supabase tables** → add Volunteer.role, Volunteer.signals, Volunteer.momentum, nudge_templates table
- **§6 Behavioral Rules** → add 6.x: Captain triage signal definitions (15%/15% intersection)
- **§7.4 Output shape** → extend `Volunteer` row schema with role, signals, momentum, currentSprint metrics
- **§11 Deferred** → record decision that captain-activity tracking is explicitly out of scope

---

## Decisions log (this conversation)

- Captain communication = SMS template via native Messages, **never** server-sent — relational integrity over delivery confirmation
- Captain activity tracking = **out** — privacy + trust over admin visibility
- Donor visibility on own team = full
- At-risk threshold = bottom 15% × 15% intersection
- Sprint reset cadence = per active push window (not weekly)
- Tier ladder rewards table = stays in Supabase config, not code
- Home name = stays "Home" for all roles (consistency); page heading inside differentiates
- Bottom nav = role-aware (volunteers see 6 tabs, captains 7, admins 7–8)
