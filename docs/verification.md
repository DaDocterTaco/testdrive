# Release verification record

This file records actual evidence. Checklists and intended behavior are not test results.

## Infrastructure evidence

| Action | Observed result |
| --- | --- |
| Inspect Git root | Original root was the unrelated parent workspace; a dedicated `testdrive/.git` was initialized |
| Dedicated branch | `codex/testdrive-build` based on a new `main` repository |
| GitHub account/repository | Authenticated CLI account `DaDocterTaco`; public `https://github.com/DaDocterTaco/testdrive` created, initial source push pending final checks |
| Runtime | Node.js `v24.15.0`, npm `11.6.1` |
| Firebase project creation | `testdrive-offgrid-2026` created successfully; Firebase resources added |
| Firebase Hosting site listing | Default site `testdrive-offgrid-2026`, assigned URL `https://testdrive-offgrid-2026.web.app` |
| Firebase production release | Pending build and deployment; assigned URL alone is not a smoke test |
| Direct dependency license inventory | Checked installed package name/version/license metadata against THIRD_PARTY_NOTICES.md |
| Initial source credential/backend scan | No credential/private-key patterns or inspection-upload calls found; Google Fonts import replaced by self-hosted files and OFL notices |
| GitHub Actions dependencies | Current official release tags checked through GitHub API and pinned to exact commit SHAs; workflow token is read-only and checkout does not persist credentials |

## Candidate validation

| Check | Commit/build | Result |
| --- | --- | --- |
| Reproducible npm install | Pending | Not recorded |
| Typecheck | Frozen implementation, October 14, 2026, before release commit | Passed through npm run check |
| ESLint | Same frozen implementation | Passed through npm run check |
| Unit tests | Same frozen implementation | 21 tests passed |
| Production build | Same frozen implementation | Passed; Vite dist produced |
| Browser scenario checks | Local candidate, Chromium software input and mobile viewport emulation | 7/7 passed in 25.8 seconds; physical hardware not established |
| Production HTTPS / headers / deep links / missing asset | Pending | Not recorded |
| Physical phone path | Pending physical access | Not verified |
| Camera/microphone capture cleanup on real hardware | Pending physical interaction | Not verified |
| Demo video | Pending recording | Not created |
| Devpost submission | Pending participant action and final links | Not submitted |

For each completed scenario append date/time (America/New_York), release commit or artifact identity, URL, browser/OS/device, observed behavior, and any limitation. Keep screenshots sanitized and local system exports out of the repository.

Initial release readiness was confirmed October 14, 2026 at approximately 9:30 p.m. EDT. The checked source includes partial guided-progress persistence, per-source media resets, always-available clear-local-data, source-aware exact-spec comparison, portable validated reports, and labeled synthetic/emulated screenshots. GitHub CI and production checks are recorded separately after publication.
