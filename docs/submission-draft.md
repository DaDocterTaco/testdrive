# TESTDRIVE

**Know the device before you buy it.**

- **Working app:** https://testdrive-offgrid-2026.web.app
- **Public source:** https://github.com/DaDocterTaco/testdrive
- **Release:** https://github.com/DaDocterTaco/testdrive/releases/tag/v1.0.0-beta.3-offgrid
- **Demo video:** https://github.com/DaDocterTaco/testdrive/releases/download/v1.0.0-beta.3-offgrid/demo-browser-walkthrough.webm

## Short description

A browser inspection for computers, phones, and tablets that combines real observations, hands-on checks, exact Windows specifications, and a clear, portable report.

## Inspiration

A used-device listing tells a buyer what the seller says. A quick glance rarely shows which functions actually work, which have not been tested, or whether the advertised specifications match a system report. TESTDRIVE makes that inspection understandable and keeps its limits visible.

## What it does

Open TESTDRIVE on the device being inspected, correct its suggested device type if needed, and choose the relevant checks. A quick scan collects available browser information and runs short processing and graphics samples. Guided checks cover keyboard, pointer, touch, camera, microphone, speakers, and display.

The app distinguishes browser-reported hints, measured events, imported specifications, and human answers. An English Windows System Information text report can be imported locally, previewed, and compared with specific seller claims about installed memory or processor model. A browser memory hint is never treated as exact installed RAM.

The final report organizes observations, attention items, unknown areas, notes, and next steps. Inspections stay in browser storage and can be resumed, deleted, exported/imported as versioned JSON, or printed using the browser's Print / Save PDF service. No account is required.

## How it was built

React and TypeScript provide the adaptive interface, with Vite producing a static application. A separate diagnostic registry and attempt model preserve sources, execution states, and test versions. A bounded background worker verifies a deterministic processing workload; WebGL renders a known scene and checks an actual read-back pixel. Pointer, keyboard, touch, media, and Web Audio APIs support the guided interactions.

Native TypeScript validation checks imported record versions, field allowlists, limits, and malformed content. The local Windows parser retains only supported hardware fields and excludes raw reports, serials, usernames, network details, and paths. IndexedDB persistence falls back visibly to memory when storage is unavailable. Media is temporary and released when the person leaves a test.

Firebase Hosting serves the public HTTPS app. Inspection data is not uploaded to an application database. Self-hosted fonts and a same-origin content policy keep runtime assets local. GitHub Actions performs a reproducible installation, typecheck, lint, 21 unit tests, production build, and seven desktop/mobile-viewport browser scenarios.

## Challenges

Browser hardware access is intentionally limited and differs across devices. An unavailable API, a denied permission, a missing event, and an observed problem must not collapse into the same result. TESTDRIVE preserves those distinctions rather than producing an unsupported health score.

Exact specifications create another challenge: a report is user-supplied, and similar-looking memory or processor descriptions may not be equivalent. The import preview, source labels, cautious normalization, explicit units, and insufficient-information state help keep comparisons honest.

## Accomplishments

- A published inspection-to-report workflow with ten implemented check modules and no sign-up requirement.
- Source-aware Windows specification import and seller-claim comparison demonstrated with labeled synthetic data.
- Partial guided-progress recovery, permission-denial handling, storage fallback, portable reports, and local deletion.
- Passing typecheck, lint, 21 unit tests, production build, and all seven public browser scenarios, plus production HTTPS/content-policy checks.
- Labeled desktop and mobile-viewport evidence that distinguishes software testing from physical-device verification.
- A publicly available 60-second silent browser walkthrough with explicit synthetic-data and software-input labels.

## What was learned

An inspection becomes more useful when it explains uncertainty clearly. Browser hints, actual events, human judgement, and imported fields answer different questions. Preserving their sources and untested areas gives a buyer a better next question to ask, without pretending that a website can certify a device.

## What's next

Expand physical-device verification and accessibility coverage, support additional operating-system and battery reports, and explore consent-based paired viewing. Shop workflows and cloud sharing require a separate privacy and product design phase. They are not necessary for a useful local inspection.

## Limitations

Physical iPhone/Safari behavior and real camera/microphone/input quality have not been independently verified. Mobile evidence uses Chromium viewport emulation with synthetic events. Browser checks cannot prove ownership, authenticate an imported report, certify hardware condition, measure every internal component, or guarantee a good purchase. Battery wear and disk health remain unchecked. Timing reflects the browser and current environment. No paired-device relay, account system, or cloud report sync is included.

## Technology and attribution

React, TypeScript, Vite, React Router, Lucide, browser workers, WebGL, media/input/Web Audio APIs, IndexedDB, Firebase Hosting, GitHub Actions, Vitest, Playwright, ESLint, and Prettier. DM Sans and Manrope are self-hosted under the SIL Open Font License.

OpenAI Codex and specialist coding agents assisted architecture, interface design, implementation, testing, infrastructure, and documentation. They are AI development tools, not human participants. Device diagnostics is an existing category; this project's contribution is its own application, workflow, parsing/comparison logic, evidence-aware reporting, and integration. Third-party foundations retain their licenses and are documented in the public source.

## Submission status

The application and source are public. This draft is not a Devpost submission, and no submitted-state confirmation or participant declaration has been recorded.
