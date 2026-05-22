# Findings — YJ-Nest

_Research, discoveries, constraints. Log prior art and references here._

## Open Questions
- _Pending Blueprint discovery._

## Prior Art
- **Google AI Studio UI/UX draft** — stakeholder reports "almost the entire UI/UX drafted." Must obtain access before Phase A SOPs are written; UI shape will dictate component structure, navigation taxonomy, and what data the Supabase schema must expose.

## Technical notes
- **Click-to-share constraints (per platform, 2026-05):**
  - **Web Share API** (`navigator.share`) — clean on mobile for SMS, Email, IG, FB, LinkedIn, generic. Desktop support is partial; Safari macOS = good, Chrome desktop = limited.
  - **IG Stories** — deep link `instagram-stories://share?source_application=...&backgroundImage=...` works on mobile devices with IG installed. Desktop = no native path; offer "download image → upload manually."
  - **FB Stories** — `facebook-stories://share` similar mobile-only constraint.
  - **LinkedIn** — `https://www.linkedin.com/sharing/share-offsite/?url=...` works on both mobile/desktop.
  - **SMS** — `sms:?body=...` works universally.
  - **Email** — `mailto:?subject=...&body=...` works universally.
- **Supabase + Twilio SMS Auth** — Supabase Auth has native Twilio support for SMS OTP; no custom auth code required, just project config.
- **CSV-fed pipeline** — preferred shape: Storage drop → trigger → ingest function → typed upsert into normalized tables. Idempotent on `(source, external_id)` to handle re-uploads.

## Constraints
- _None yet._
