# Release checklist

Use [verification.md](verification.md) for evidence. Empty boxes are unfinished work. Deadline in the planning baseline: **October 15, 2026, 12:00 a.m. EDT** (midnight ending October 14). Recheck the official event form before assuming submissions remain open.

## Code and privacy

- [x] Dedicated repository root; preserve unrelated parent projects.
- [x] Dedicated Firebase project and hosting-only configuration.
- [x] Static security headers, SPA fallback, hashed asset caching, fresh app shell.
- [x] README, MIT license, attribution, deployment and support documentation prepared.
- [x] Verify implemented features against the product scope and document omissions.
- [x] Typecheck, lint, 21 meaningful unit tests, and production build pass.
- [ ] Reproducible `npm ci` passes in GitHub CI.
- [x] Complete 7 desktop/mobile-width browser scenarios with honest expected outcomes.
- [ ] Check stop/skip/retry, permission denial, unsupported APIs, malformed files, refresh recovery.
- [ ] Confirm actual camera/microphone tracks stop on navigation and recordings stay temporary.
- [ ] Check keyboard navigation, visible focus, readable zoom, reduced motion, touch targets.
- [x] Review named staged files for secrets, personal reports, recordings, serials, and unrelated material.

## Public release

- [x] Create the dedicated public GitHub repository under the verified owner.
- [ ] Push the checked source to the dedicated public repository.
- [ ] Update source links in app/README and record the real remote.
- [ ] Deploy the exact checked production build to Firebase Hosting.
- [ ] Open HTTPS production app in a fresh browser, test deep-link refresh and missing assets.
- [ ] Complete a real browser inspection → report → JSON export/import → print flow.
- [ ] Verify public source without a logged-in builder account.
- [ ] Test a physical phone and record exact environment, or disclose missing coverage.
- [ ] Keep the working deployment/commit identifiable for rollback.
- [ ] Tag only the final submitted commit if a submission occurs.

## Submission materials

- [x] Capture labeled sanitized browser screenshots for desktop, software inputs, synthetic specs/report, and mobile viewport emulation. Physical phone evidence remains outstanding.
- [ ] Record a real 90–120 second demo using [demo-script.md](demo-script.md).
- [ ] Upload the video to a publicly accessible supported service and verify playback.
- [ ] Adapt [submission-draft.md](submission-draft.md) to match actual shipped behavior.
- [ ] Complete participant/team eligibility declarations personally and accurately.
- [ ] Add real app/source/video URLs and screenshots to the event form.
- [ ] Submit and verify a submitted state or receipt; a draft is not submitted.
- [ ] Record project URL, timestamp, commit/tag, and proof in the ledger.

AI coding agents are development assistance, not human team participants. Do not add invented engineers, device tests, submission receipts, or repository URLs.
