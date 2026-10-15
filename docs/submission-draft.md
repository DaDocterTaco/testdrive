# TESTDRIVE — Devpost draft

**Draft status:** Review against the deployed build before posting. This file is not a submitted Devpost entry. Replace only with real working links; do not paste placeholders into a live submission.

## Project name

TESTDRIVE

## Short description

Know the device before you buy it. A browser inspection that brings available device information, guided checks, and a clear, portable report together.

## Inspiration and problem

Buying a used laptop or phone often means trusting a short listing and a quick glance. A camera may open while another important function goes untested. Hardware descriptions may be incomplete, and a nontechnical buyer may not know which questions to ask. We wanted a focused way to inspect what a browser can access while clearly showing what remains unknown.

## What it does

TESTDRIVE guides an inspection on the device being checked. It separates browser-reported information, measured events, imported specifications, and human judgement. Users can select appropriate hands-on checks, add supported Windows specifications locally, and keep a portable inspection record. Untested features stay visibly untested.

Retain the preceding paragraph only for features verified in the release. A report cannot certify ownership, establish that an imported report is authentic, or rule out every hardware fault.

## How we built it

The app uses React, TypeScript, and Vite. Its inspection model separates test attempts from presentation, and its report keeps the source of observations visible. Browser APIs power capability detection, bounded workloads, input interactions, and consent-based camera/microphone checks. A local parser reads supported English Windows System Information exports. Firebase Hosting serves the static app; user inspections and temporary media are not sent to an app database. GitHub Actions checks the source and production build.

Before publication, verify deployment and CI status in the release ledger. Configuration and source files exist before a first successful hosted release or GitHub Actions run.

**Disclosure:** OpenAI Codex with specialist coding agents assisted development, verification, and release preparation. These agents are AI development tools and are not human team members. React, Vite, TypeScript, Lucide, Zod, and testing tools are third-party foundations; see the repository's notices. Device diagnostics is an existing category. Our contribution is this application, workflow, implementation, and reporting approach developed for the event.

## Challenges

Browsers intentionally limit hardware information and vary in their APIs and permissions. The product must avoid turning “not accessible” into “broken” or “passed.” We designed source labels and incomplete states to make those limits useful and understandable. Exact specifications use a local, reviewable system-report import rather than a fabricated browser guess.

## Accomplishments

Replace this section with verified release outcomes from `docs/verification.md`. Suitable evidence is a complete inspection/report loop, an observed input/media check, a tested report parser, working portable exports, or a public deployment. Do not describe intended behavior as an accomplishment.

## What we learned

A useful inspection record needs explicit boundaries as much as successful checks. Human confirmations, browser hints, and locally imported fields answer different questions. Keeping those distinctions visible helps users decide what to recheck or ask a seller to demonstrate.

## What's next

Expand physical-device verification and accessibility testing, add additional supported system-report formats, and explore consent-based paired-device viewing. Accounts, shop workflows, and sharing require a future privacy and product review; they are not necessary for a useful local inspection.

## Stack

React; TypeScript; Vite; browser media/input APIs; Firebase Hosting; GitHub Actions; Vitest; Playwright; Lucide; Zod; OpenAI Codex. Remove tools or APIs not actually used in the final release.

## Links and final review

- App: use the verified public HTTPS deployment from the ledger.
- Source: use the actual public repository from the ledger.
- Video: record/upload and verify actual playback; no video is implied by this draft.
- Screenshots: use sanitized captures from the deployed release.
- Participant declarations: the human participant must confirm eligibility and team details.
- Submission: verify the event form's submitted state and record a timestamp, not merely saved text.

Known limitations and tested-device coverage must match `docs/supported-devices.md` and the release ledger. The source specification records the original hard deadline as October 15, 2026, 12:00 a.m. EDT; check the official schedule/form before attempting submission.
