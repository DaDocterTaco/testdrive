# Silent browser walkthrough

- Recording: [public 60-second silent walkthrough](https://github.com/DaDocterTaco/testdrive/releases/download/v1.0.0-beta.3-offgrid/demo-browser-walkthrough.webm)
- Release: [TESTDRIVE beta 3](https://github.com/DaDocterTaco/testdrive/releases/tag/v1.0.0-beta.3-offgrid).
- Captured: October 14, 2026, approximately 9:40–9:41 p.m. America/New_York.
- App origin: https://testdrive-offgrid-2026.web.app
- App version: 1.0.0-beta.3.
- Format: silent WebM, 1440 × 960, **60.44 seconds**, 8,843,559 bytes.
- Runner: `node scripts/record-demo.mjs`, with `TD_DEMO_URL` set to the app origin.

This is a real isolated Chromium browser recording of TESTDRIVE. A narrow provenance banner annotates the UI; the runner does not replace app results or page screens. The sequence starts an inspection, performs the actual quick scan, sends keyboard events through Playwright, advances all eight display patterns with their actual controls, imports the repository's explicitly synthetic Windows fixture, compares a synthetic 16 GB seller claim against its 8 GB imported memory, creates a report, and downloads its JSON through the real export button. The Print / Save PDF control is shown; no native print dialog is opened.

The inspection is named **DEMO — synthetic specifications**. Imported specifications and seller claims are synthetic and describe no physical device. The demo checks the import confirmation only to exercise the software workflow with that fixture. Keyboard and display answers are recorded as **Not sure** with explanatory notes; no person confirmed physical hardware quality. The automated key events are browser input events, not proof of working physical keys. Rendering a display pattern is not proof of a healthy panel. Remaining guided checks remain untested. The browser's quick-scan observations describe only the automated browser session. No personal browser profile, real camera, microphone, or existing inspection data is used.

Verification: the exported JSON retained the demo nickname, imported 8.00 GB memory, claimed 16 GB memory, and `not_sure` keyboard/display answers. The workflow recorded no page errors. The saved WebM was opened and decoded in an isolated Chromium browser; duration and dimensions were read from the media element. Sample frames at 3, 25, 38, 50, and 56.44 seconds were visually reviewed for legibility, synthetic-data labels, report content, and the visible beta.3 version. The provenance banner remains visible. No media editing, invented product screens, or physical-device testing is represented.

This artifact is a software demonstration, not a physical device test, hardware certification, or evidence of real iPhone/Safari testing. The recording script keeps its output in the local workspace and does not publish it. After privacy/metadata review, the exact reviewed file was separately attached to the public GitHub release. Its SHA256 is `b984b627f3642c7684b97da71b66eec48d25566e215d88b80e159b83a01cfc35`; GitHub's uploaded asset digest matches.
