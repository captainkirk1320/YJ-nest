# Task Plan — YJ-Nest

## Current Phase
**L — Link IN PROGRESS.** SOPs drafted 2026-05-20, awaiting Kirk sign-off before TypeScript.

## B.L.A.S.T. Checklist

### Phase B — Blueprint
- [x] Q1: North Star defined — single YJ hub, frequent effortless updates, $5M goal, plug-and-play for non-technical users
- [x] Q2: Integrations confirmed (Unify+Salesforce CSV, Twilio, Supabase, Vercel hosting, React 19 + Vite PWA, Gemini Flash for in-app AI). Credentials verified in Phase L. Share channels = SMS/Email/IG/FB/LinkedIn click-to-share. No donation processing.
- [x] Q3: Source of Truth identified — Unify CSV + Salesforce Master Volunteer Roster (CLAUDE.md §4.2) + Salesforce Volunteer Credit Export (CLAUDE.md §4.3, single unified export routed by Type + Campaign) + `exceptions.txt` (SharePoint)
- [x] Q4: Delivery Payload specified — (a) Supabase tables matching MVP types.ts consumed by The Nest, (b) Missing-match log (`ingest_errors`). System is **one-way / read-only** with respect to source systems.
- [x] Q5: Behavioral Rules captured — Good Standing (4 thresholds), Item categorization map, multi-rep even split default, exceptions file (`exceptions.txt` in SharePoint), tier ladder draft, push windows
- [x] Data Schema (Input + Output) locked in CLAUDE.md — pending sample-file verification when Phase L begins
- [x] Prior-art research logged in findings.md

### Phase L — Link
- [x] Decision 1 ratified — Volunteer Credit Export = two-block Gorlocks shape, one file per team; Full Contact ID required on both blocks; identity join by IDs only; Codex's 4 conditions baked in (2026-05-20)
- [x] Decision 2 ratified — v1 §7.4 compute only this session; nullable v2 columns; real nulls, no sentinels (2026-05-20)
- [x] Q4 resolved — no pre-existing reconciliation artifact; golden fixture is spec-derived from CLAUDE.md rules; W2 gate = Kirk + Conor recompute (2026-05-20)
- [x] Cash routing decision — opportunity-name allowlist (2026-05-20)
- [x] All 11 SOPs drafted in `/architecture/` (2026-05-20)
- [ ] Kirk sign-off on SOPs
- [ ] Atomic scripts scaffolded in `/execution/` (post sign-off)
- [ ] `exceptions.txt` seeded from Manual Tweaks docx (post sign-off)
- [ ] Supabase SQL migrations in `/execution/sql/` (post sign-off)
- [ ] Golden ingest test at `/execution/tests/` (post sign-off)
- [ ] Codex adversarial review of engine code (post sign-off)
- [ ] Supabase credentials received from Kirk; probe scripts return green
- [ ] Master Roster: Kirk adds `is_captain` + consolidates `member_type` columns

### Phase A — Architect
- [x] SOPs drafted in `/architecture/` (2026-05-20)
- [ ] Navigation layer designed (orchestrator script + Edge Function shape — covered in `sop_orchestrator.md` draft)
- [ ] Atomic tools scaffolded in `/execution/`

### Phase S — Stylize
- [ ] Payload formatting finalized
- [ ] Verify step (test/screenshot/command) defined per output
- [ ] User sign-off captured

### Phase T — Trigger
- [ ] Production transfer
- [ ] Automation/trigger configured
- [ ] Maintenance log section completed in CLAUDE.md
