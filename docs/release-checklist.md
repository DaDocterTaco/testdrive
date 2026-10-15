# Release checklist

Use [verification.md](verification.md) for evidence. Empty boxes are unfinished work. Deadline in the planning baseline: **October 15, 2026, 12:00 a.m. EDT** (midnight ending October 14). Recheck the official event form before assuming submissions remain open.

## Code and privacy

- [x] Dedicated repository root; preserve unrelated parent projects.
- [x] Dedicated Firebase project and hosting-only configuration.
- [x] Static security headers, SPA fallback, hashed asset caching, fresh app shell.
- [x] README, MIT license, attribution, deployment and support documentation prepared.
- [x] Verify implemented features against the product scope and document omissions.
- [x] Typecheck, lint, 21 meaningful unit tests, and production build pass.
- [x] Reproducible `npm ci` passes in GitHub CI.
- [x] Complete 7 desktop/mobile-width browser scenarios with honest expected outcomes.
- [x] Verify browser stop/interruption, permission denial, malformed files, partial recovery, and temporary storage through unit/browser cases; physical-device behavior remains separate.
- [ ] Confirm actual camera/microphone tracks stop on navigation and recordings stay temporary.
- [ ] Check keyboard navigation, visible focus, readable zoom, reduced motion, touch targets.
- [x] Review named staged files for secrets, personal reports, recordings, serials, and unrelated material.

## Public release

- [x] Create the dedicated public GitHub repository under the verified owner.
- [x] Push the checked source to the dedicated public repository.
- [x] Update source links in app/README and record the real remote.
- [x] Deploy the exact checked beta 3 production build to Firebase Hosting.
- [x] Verify HTTPS, direct app/deep routes, missing-JS404, CSP/permission headers, and cache policy. Fresh browser scenario checks recorded separately.
- [x] Complete the deployed browser inspection → report → JSON export/import → seven-page browser-PDF flow with labeled synthetic input/specifications.
- [x] Verify repository PUBLIC visibility and source/release/video HTTP 200 through anonymous HTTPS requests.
- [ ] Test a physical phone and record exact environment, or disclose missing coverage.
- [x] Keep the working deployment/commit identifiable for rollback: d7eea49, v1.0.0-beta.3-offgrid.
- [ ] Tag only the final submitted commit if a submission occurs.

## Submission materials

- [x] Capture labeled sanitized browser screenshots for desktop, software inputs, synthetic specs/report, and mobile viewport emulation. Physical phone evidence remains outstanding.
- [x] Record/review a real 60.44-second silent browser walkthrough; synthetic specifications and software inputs are clearly labeled. The earlier 90–120-second plan was an editorial target.
- [x] Attach the reviewed walkthrough to the public GitHub release; uploaded digest matches the local artifact. Event-specific accepted video hosting remains to be checked at submission.
- [x] Adapt [submission-draft.md](submission-draft.md) to actual shipped behavior and real app/source/demo URLs.
- [ ] Complete participant/team eligibility declarations personally and accurately.
- [ ] Add real app/source/video URLs and screenshots to the event form.
- [ ] Submit and verify a submitted state or receipt; a draft is not submitted.
- [ ] Record project URL, timestamp, commit/tag, and proof in the ledger.

AI coding agents are development assistance, not human team participants. Do not add invented engineers, device tests, submission receipts, or repository URLs.
