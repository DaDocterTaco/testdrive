# Release verification record

This file records actual evidence. Checklists and intended behavior are not test results.

## 1.1.0-beta.1 usability release

The updated source passed `npm run check`: TypeScript, ESLint,36 unit tests in five files, and the production build. All17 full-Chromium desktop/mobile-viewport scenarios passed locally in1.6minutes on October14,2026. The cases include one-click scan without media permission, keyboard default prevention and triple-Escape/mouse/inactivity exits, all eight pointer stages, bounded synthetic camera/microphone capture, silent-input feedback, late-stream cancellation, battery charging events, confirmed Zenbook model import, remembered-profile deletion, a paused display tour, speaker stop controls, and the prior complete report/import/recovery/mobile workflows.

Testing uncovered a native crash in the stripped Playwright Chromium156 headless shell's experimental `SpeechRecognition.available` call, reproduced on an otherwise empty page. Full Chromium safely reports local language availability and completes the microphone sample. Browser projects and the production smoke use Playwright's `channel: "chromium"`; CI's normal `playwright install --with-deps chromium` installs that full browser. No remote speech engine or language-pack download was added.

Software input, generated canvas video, oscillator audio, fake battery events and mobile viewport emulation remain explicitly synthetic. Physical iPhone/Safari and actual hardware quality remain unverified. The production and CI publication results for this release are appended after deployment. The beta3 entries below are historical and identify their earlier implementation.

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
