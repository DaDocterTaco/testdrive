# Release verification record

This file records actual evidence. Checklists and intended behavior are not test results.

## 1.2.0-beta.1 responsive UX release

The final candidate passed `npm run check`: TypeScript, ESLint, all 40 unit tests and the production build. The full integration run passed 24 of 25 workflows and caught native fullscreen exit focus. After fixing focus and compacting tablet cards, all eight affected responsive, cancellation and touchscreen scenarios passed in 44.4 seconds. The final mobile microphone instruction visibility fix and desktop camera/microphone scenario passed together in 38.9 seconds. The suite now has 27 workflows. Unchanged earlier scenarios retain their full-run results; CI repeats the entire suite on the release source.

New checks cover desktop 1440, tablet 768 and mobile 390 layouts, valid and unavailable battery/browser quota readings, stopped scan/retry/navigation cancellation, native and fallback fullscreen touch with actual browser touch events, mouse exclusion, retained coverage, Exit/Escape and focus restoration. The device-profile unit tests also cover rejected, invalid and never-settling APIs. Design comparison and resolved findings are documented in [design-qa.md](../design-qa.md). Screenshots are browser/software evidence; no physical panel or media-quality pass is implied. No new video or artwork is included.

## 1.1.0-beta.4 unknown-keyboard confirmation

The candidate passed `npm run check`: TypeScript, ESLint, all 37 unit tests and the production build. All six affected keyboard/mobile workflows passed locally in 46.7 seconds. The new nineteenth scenario verifies extra Numpad1 input, no confirmation before input or during capture, explicit confirmation before saving, invalidation on a new capture, and an exported `user_confirmed` assessment without invented core-key totals. The model-specific Copilot path, Escape exits, confirmed model import, partial progress and mobile layout also passed. Labeled screenshots are software evidence; physical keyboards remain unverified. Prior release results below retain their identities.

Firebase deployed implementation `6607ba1912e19324015a51a58eb6efb865ac5489`, immutable tag `v1.1.0-beta.4`, with 17 static files. All six affected workflows passed on the public HTTPS app in 29.6 seconds. Checks at 2026-10-15T03:02Z verified exact JavaScript/CSS build hashes, app and deep routes 200, missing JavaScript 404, security/cache headers, seven direct browser routes, refresh, three automatic observations and same-origin requests only. There were zero content-policy violations, failed requests or console/page errors. Current evidence is in `docs/evidence/production`. No new video or artwork was published.

The first full beta 4 CI run passed 18 of 19 scenarios; the older buyer scenario still expected the generic reference's removed required-key count and `keyboard.untested` fact. Test-only commit `003dc47702ae6e499393b3d0df2204332b08c80b` updates those assertions to the actual response count and absence of an invented untested total. It changes no deployed application code. The corrected complete buyer/report/import/export/deletion scenario passed separately on production in 8.3 seconds.

[Final CI run 38674464362](https://github.com/DaDocterTaco/testdrive/actions/runs/38674464362) succeeded on that test-only correction: reproducible install, typecheck, lint, all 37 unit tests, production build, full Chromium installation and all 19 browser scenarios. The complete job took 2 minutes 36 seconds. [Public beta 4 release](https://github.com/DaDocterTaco/testdrive/releases/tag/v1.1.0-beta.4). The immutable app tag remains unchanged.

## 1.1.0-beta.3 keyboard correction

The beta 3 candidate passed TypeScript, ESLint, all 37 unit tests and the production build. Four affected existing browser scenarios passed: capture defaults and exit paths, confirmed Zenbook import, partial keyboard/report persistence and mobile layout. The new eighteenth scenario passed after the final batching fix: a synthetic Win + Shift + F23 sequence marks Copilot while preserving raw modifier observations without granting independent core-key credit; standalone Shift remains testable. It also verifies Escape dots at 0/1/2/3, timeout and other-key resets, retained exit confirmation, and exported report facts.

The regression first exposed Playwright's unsupported `F23` key-name helper, so the test dispatches explicit browser keyboard events. It then caught a real batched-event metadata issue, corrected by snapshotting shortcut members before queuing the React state update. The final focused scenario passed in 7.2 seconds. Labeled screenshots show two dots while active and three after exit. These are software events, not physical ASUS-key or OS-interception validation. The preceding beta 2 results below retain their own identity. No new video is part of this patch.

Firebase deployed implementation `461c7568f1ad88e466956b3195e33699b56df97d`, immutable tag `v1.1.0-beta.3`, with 17 static files. All five affected scenarios then passed against production HTTPS in 24.8 seconds. Public checks at 2026-10-15T02:56Z confirmed the exact built JavaScript/CSS hashes, app/deep routes 200, missing JavaScript 404, no-cache shell and immutable assets. The full browser security smoke verified seven direct routes, refresh, three automatic observations, only same-origin requests, and zero content-policy violations, failed requests or console/page errors. Updated evidence is in `docs/evidence/production`.

[CI run 38673570544](https://github.com/DaDocterTaco/testdrive/actions/runs/38673570544) completed successfully on the exact deployed implementation: reproducible install, typecheck, lint, all 37 unit tests, build, full Chromium installation and all 18 browser scenarios. The complete job took 2 minutes 4 seconds. [Public beta 3 release](https://github.com/DaDocterTaco/testdrive/releases/tag/v1.1.0-beta.3).

## 1.1.0-beta.2 usability release

The deployed implementation is `7521b81ff9584d64bb0d241629ea3923147e916e`, immutable tag `v1.1.0-beta.2`. [Release](https://github.com/DaDocterTaco/testdrive/releases/tag/v1.1.0-beta.2) · [CI run 38672436016](https://github.com/DaDocterTaco/testdrive/actions/runs/38672436016).

The updated source passed `npm run check`: TypeScript, ESLint, 36 unit tests in five files, and the production build. All 17 full-Chromium desktop/mobile-viewport scenarios passed locally in 1.6 minutes on October 14, 2026. Beta 2 then fixed line-based wheel units and changing the microphone source after a completed sample; both affected scenarios passed again, including stale-result/playback reset and a fresh second sample. The full cases cover one-click scan without media permission, keyboard default prevention and triple-Escape/mouse/inactivity exits, all eight pointer stages, bounded synthetic camera/microphone capture, silent-input feedback, late-stream cancellation, battery charging events, confirmed Zenbook model import, remembered-profile deletion, a paused display tour, speaker stop controls, and the prior complete report/import/recovery/mobile workflows.

Testing uncovered a native crash in the stripped Playwright Chromium 156 headless shell's experimental `SpeechRecognition.available` call, reproduced on an otherwise empty page. Full Chromium safely reports local language availability and completes the microphone sample. Browser projects and the production smoke use Playwright's `channel: "chromium"`; CI's normal `playwright install --with-deps chromium` installs that full browser. No remote speech engine or language-pack download was added.

Firebase confirmed the beta 2 release complete with 17 static files. Public HTTP checks at 2026-10-15T02:40:46Z verified app/deep routes 200, missing JavaScript 404, security/cache headers, and exact public JS/CSS SHA256 matches to the checked build. A fresh full-Chromium production browser verified seven direct routes, refresh, all three automatic observations, only same-origin page requests, zero content-policy violations, zero failed requests, and zero page/console errors. See `docs/evidence/production/hosting-http.json` and `security-smoke.json`.

All 17 final production HTTPS workflows passed in 1.7 minutes. The first CI run passed 16 cases but exposed a test assertion that read a preference before asynchronous deletion completed. Test-only commit `7527d2d48e3f780b383a88abed8da124be08e59a` waits for the deletion dialog to close and then checks preference removal; it does not change deployed application code. [CI run 38672436016](https://github.com/DaDocterTaco/testdrive/actions/runs/38672436016) completed successfully on that commit: reproducible npm install, typecheck, lint, all 36 unit tests, production build, full Chromium installation and all 17 browser workflows. The corrected deletion regression also passed separately against the public app.

Software input, generated canvas video, oscillator audio, fake battery events and mobile viewport emulation remain explicitly synthetic. Physical iPhone/Safari and actual hardware quality remain unverified. The beta 3 entries below are historical and identify their earlier implementation. Its PDF and video evidence are not re-labeled as 1.1 evidence. No new video was published for this release.

## Infrastructure evidence

| Action | Observed result |
| --- | --- |
| Inspect Git root | Original root was the unrelated parent workspace; a dedicated `testdrive/.git` was initialized |
| Dedicated branch | `codex/testdrive-build` based on a new `main` repository |
| GitHub account/repository | Public [DaDocterTaco/testdrive](https://github.com/DaDocterTaco/testdrive); default `main` and implementation branch contain beta 3 source |
| Runtime | Node.js `v24.15.0`, npm `11.6.1` |
| Firebase project creation | `testdrive-offgrid-2026` created successfully; Firebase resources added |
| Firebase Hosting site listing | Default site `testdrive-offgrid-2026`, assigned URL `https://testdrive-offgrid-2026.web.app` |
| Firebase production release | Beta 3 deployed successfully October 14, 2026; CLI confirmed release complete and 17 deployed files |
| Direct dependency license inventory | Checked installed package name/version/license metadata against THIRD_PARTY_NOTICES.md |
| Initial source credential/backend scan | No credential/private-key patterns or inspection-upload calls found; Google Fonts import replaced by self-hosted files and OFL notices |
| GitHub Actions dependencies | Current official release tags checked through GitHub API and pinned to exact commit SHAs; workflow token is read-only and checkout does not persist credentials |

## Candidate validation

| Check | Commit/build | Result |
| --- | --- | --- |
| Reproducible npm install | d7eea49, Ubuntu GitHub Actions | npm ci passed |
| Typecheck | Final beta 3, d7eea49 | Passed locally through npm run check and in GitHub CI |
| ESLint | Final beta 3, d7eea49 | Passed locally and in GitHub CI |
| Unit tests | Final beta 3, d7eea49 | 21 tests passed locally and in GitHub CI |
| Production build | Final beta 3, d7eea49 | Passed; public JS/CSS hashes match the resulting dist |
| Browser scenario checks | Public beta 3, Chromium software input and mobile viewport emulation | 7/7 passed in 39.2 seconds; physical hardware not established |
| Production HTTPS / headers / deep links / missing asset | d7eea49, public Firebase Hosting | Passed: app/deep routes 200, missing JS 404, no-cache shell, immutable hashed JS/CSS, same-origin CSP and media permission policy; public JS/CSS SHA256 match the checked local build. See production/hosting-http.json |
| Production browser content policy and workloads | Public beta 3, Chromium 156.0.8078.4 | Seven direct routes and refresh, three completed automatic observations, only same-origin requests, zero CSP violations/failed requests/console or page errors |
| Actual browser PDF | Public beta 3, synthetic inspection | Seven A4 pages rendered and inspected; required content present, controls hidden, no blank pages, clipped/overlapping text, orphan results heading, or split fact rows. Native OS print dialog/physical printer not tested |
| Physical phone path | Pending physical access | Not verified |
| Camera/microphone capture cleanup on real hardware | Pending physical interaction | Not verified |
| Demo video | Public beta 3, reviewed synthetic walkthrough | Published release asset: 60.44 seconds, 1440×960 silent WebM, 8,843,559 bytes; local and GitHub SHA256 digests match |
| Devpost submission | Pending participant action and final links | Not submitted |

For each completed scenario append date/time (America/New_York), release commit or artifact identity, URL, browser/OS/device, observed behavior, and any limitation. Keep screenshots sanitized and local system exports out of the repository.

Initial release readiness was confirmed October 14, 2026 at approximately 9:30 p.m. EDT. The checked source includes partial guided-progress persistence, per-source media resets, always-available clear-local-data, source-aware exact-spec comparison, portable validated reports, and labeled synthetic/emulated screenshots. GitHub CI and production checks are recorded separately after publication.

## Published source and CI

- Initial implementation: `1f4ef82da28f22b240f534bb726747f370417623`, immutable `v1.0.0-beta.1-offgrid`.
- Beta 2 implementation: `dbb850bdbf8e421db48dbbf9d48d96480572c5b9`, immutable `v1.0.0-beta.2-offgrid`.
- Final deployed beta 3 implementation: `d7eea4973711164ee758c70eacab9e383b921fdc`, immutable `v1.0.0-beta.3-offgrid`, app version `1.0.0-beta.3`.
- Beta 2 fixes schema-safe keyboard fallbacks when a browser omits physical key codes; KEY-01 test version is `1.0.1`. Fallback values are counted separately from physical codes. A focused browser regression passed before deployment.
- [GitHub CI 38666399039](https://github.com/DaDocterTaco/testdrive/actions/runs/38666399039) completed successfully on the beta 2 source: npm ci, typecheck, lint, 21 unit tests, production build, Chromium install, and all 7 browser scenarios.
- [GitHub CI 38666848119](https://github.com/DaDocterTaco/testdrive/actions/runs/38666848119) repeated those checks successfully on final beta 3. Its source-only change improves print pagination by retaining headings with following content and keeping evidence rows together.
- Runtime-only dependency audit (`npm audit --omit=dev --audit-level=high`) reported 0 vulnerabilities before release. This is a point-in-time dependency check, not a security guarantee.
- Final production assets: `/assets/index-boF5AmZl.js` and `/assets/index-DyN0cqvy.css`. The source tag identifies the implementation; later documentation/evidence commits do not move that tag.
- Local browser evidence used Chromium `156.0.8078.4` (Playwright-installed build1248) on Windows. Software events and iPhone viewport emulation are labeled and do not establish physical hardware behavior.

## Final production scenarios

At approximately 9:41 p.m. EDT on October 14, 2026, the following seven scenarios passed against the deployed beta 3:

1. Buyer inspection, synthetic installed-memory mismatch, finished report, JSON export/import, deletion, and print output.
2. Camera denial with no automatic camera/microphone access and an honest untested result.
3. Malformed, oversized, unsupported-version, extra-field imports and inert markup handling.
4. Unavailable IndexedDB, visible temporary storage, usable export, and honest loss on refresh.
5. Partial keyboard observations, sidebar navigation, refresh recovery, and missing-physical-code fallback.
6. Ordinary keyboard navigation and useful recovery for missing routes/records.
7. iPhone-sized and 320px viewport navigation, adaptive selection, synthetic touch, and saved reports without horizontal overflow.

Production screenshots, HTTP/content-policy JSON, the synthetic PDF, seven rendered PDF pages, and a contact sheet are in `docs/evidence/production`. All seven PDF pages were visually reviewed. The small NFKC normalization update in the PDF-inspection helper handles text ligatures in extracted text; it does not change the deployed app or source tag.

## Demonstration and remaining human work

The [public release](https://github.com/DaDocterTaco/testdrive/releases/tag/v1.0.0-beta.3-offgrid) includes a [reviewed silent walkthrough](https://github.com/DaDocterTaco/testdrive/releases/download/v1.0.0-beta.3-offgrid/demo-browser-walkthrough.webm). Its duration is 60.44 seconds, resolution 1440×960, and SHA256 `b984b627f3642c7684b97da71b66eec48d25566e215d88b80e159b83a01cfc35`. A real isolated browser completed all eleven recording chapters, and sample video frames were visually inspected. Synthetic specifications, seller claims, software input, and human uncertainty are explicitly labeled. No real camera, microphone, personal browser profile, private report, or physical-iPhone validation is represented. See `docs/evidence/DEMO.md`.

Anonymous HTTPS requests on October 14, 2026, at approximately 9:45 p.m. EDT confirmed public source text, release page, and video asset all return 200 without a GitHub login. The source contains beta 3 and the video content length is 8,843,559 bytes. Evidence: `docs/evidence/production/public-access.json`.

The private planning file remains local and ignored by Git. The public product specification is sanitized. Event participant declarations, final Devpost submission, and any requirement to upload video to an event-supported video service remain human work; a GitHub release is not a submitted event entry. Physical-device/media-quality verification remains unperformed.
