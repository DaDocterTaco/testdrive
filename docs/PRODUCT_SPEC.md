# TESTDRIVE public product specification

**Promise:** Know the device before you buy it.

TESTDRIVE is a browser inspection tool for computers, phones, and tablets. It gathers available browser information, runs bounded checks, guides hands-on interactions, optionally adds exact Windows specifications from a local report, and produces a portable inspection record. It is a beta, with evidence and device coverage maintained in [verification.md](verification.md) and [supported-devices.md](supported-devices.md).

This is the public engineering summary. Private planning notes and participant details are deliberately excluded from the repository. The original local planning document remains preserved outside published Git contents. This document defines product behavior; it does not certify that every target environment was tested or that an event entry was submitted.

## Users and outcomes

Primary users are people inspecting a used device and owners investigating a suspected problem. A user should understand what the browser observed, what they confirmed themselves, which specification fields came from a supplied report, and what remains unknown. A useful outcome is a record and an informed next question, not a purchase recommendation or a certification.

## Inspection workflow

1. Open TESTDRIVE on the device to inspect. Start without an account or a permission prompt.
2. Correct the proposed device class if needed, choose a purpose, add an optional nickname, and select appropriate checks. Keyboard and touch checks can coexist on a hybrid device.
3. Explicitly start the quick scan. Profile collection, processing, and graphics checks run sequentially, with actual progress, bounded workloads, stop controls, and interruption handling.
4. Complete guided checks with one clear task at a time. Real events and human answers remain separate. Skip, retry, finish early, or revisit a test without fabricating a pass.
5. Optionally import supported exact specifications locally and compare specific seller claims.
6. Review observations, attention items, unknowns, and next steps. Finalize a versioned local report, export/import JSON, or use the browser's Print / Save PDF service.

## Evidence language

| Source | Meaning |
| --- | --- |
| Browser-reported | Exposed by this browser; may be limited, masked, approximate, or generalized |
| Measured | An event or bounded workload was observed during this session |
| Imported | Read from a user-selected report; not independent device attestation |
| User-provided | A nickname, note, seller claim, or intended input/output source |
| User-confirmed | The person inspected or listened and recorded an answer |

Execution state and finding are separate. Attempts can complete, be skipped, be unsupported, be denied permission, be interrupted, be cancelled, or encounter an error. An API error is not proof of a physical fault. A completed workload is not a universal health pass. Human uncertainty remains visible.

## Implemented checks

| ID | Check | Evidence contract |
| --- | --- | --- |
| SYS-01 | Device profile | Qualified browser/OS family, CSS dimensions, logical processor/memory hints when exposed, renderer and API availability |
| PERF-01 | Processing sample | One background worker, fixed deterministic xorshift computation, warmup, iteration count, verified checksum, measured active duration; stop/visibility/time bounds |
| GFX-01 | Graphics rendering | Small known WebGL scene, actual pixel readback, observed frames/interval; release GPU resources |
| KEY-01 | Keyboard | Physical key codes and release events received within a focused test area; unpressed/intercepted keys remain untested |
| PTR-01 | Pointer | Movement, primary/secondary/double clicks, wheel events, and target drag; selected mouse/trackpad source is user-provided |
| TOUCH-01 | Touch | Actual touch pointer coverage in a 6×10 visible grid and maximum observed simultaneous touches; resizing resets grid geometry |
| CAM-01 | Camera | Intentional stream access, available source switching, preview, stream settings, observed frames, temporary capture, human judgement |
| MIC-01 | Microphone | Intentional input, qualified level observations, bounded local recording and playback when supported, human judgement |
| SPK-01 | Speakers | User-triggered low-volume left/right/both tones or spoken sample, selected intended output, human confirmation |
| DISP-01 | Display | Static colors/gradient/checkerboard, optional fullscreen with exit, human visual confirmation; no automatic defect detection |

Test UI covers only browser-visible areas. Browser and operating-system shortcuts, firmware keys, hidden display regions, Bluetooth routes, and unavailable media devices have explicit limits.

## Exact specifications and claim comparison

The beta accepts English Windows System Information (`msinfo32` → File → Export) text reports up to 10 MiB. UTF-8 and UTF-16 with a byte-order mark are supported. It extracts only allowlisted manufacturer, model, processor, and installed-memory fields. Computer/user names, serials, network addresses, file paths, raw source content, available memory, and unrelated sections are not retained. The person reviews the extracted fields and confirms that the selected file describes the inspected device.

Comparisons require compatible exact fields from an imported report. Browser memory hints never substitute for installed RAM. Decimal and binary units are converted explicitly. Broad processor families such as “i7” are insufficient; specific supported model descriptions are normalized cautiously. Results are consistent, different, or insufficient information. Conflicting imported values remain unresolved.

## Records and privacy

- R0 has no accounts, cloud inspection database, analytics, ads, or model API calls.
- Normalized inspections and report revisions use IndexedDB; when unavailable, a visible in-memory fallback preserves the current visit. Browser storage is not a backup.
- Save meaningful normalized progress. Resume does not restart media automatically.
- Camera/microphone permission is requested only for the specific action. Temporary captures and audio remain in memory and are released when leaving the test.
- JSON import is versioned, size-bounded (5 MiB), and validated. Unknown schemas/fields and malformed content are rejected with an explanation.
- Delete individual records or clear all local data. Previously downloaded files are separate copies and require deletion by their owner.
- Firebase Hosting receives ordinary website requests and may retain provider access logs. The app does not upload normalized inspections, imports, recordings, or captures to an application backend.

## Architecture

React/TypeScript render the interface; Vite builds a static production bundle. `src/diagnostics` owns capability detection and automatic workloads, `src/features/tests` owns guided interactions, `src/imports` owns local parsing/comparison/portability, `src/schemas` validates records, and `src/storage` handles local persistence. Findings retain source and attempt metadata through the UI and report.

Firebase Hosting serves `dist` with HTTPS, extensionless route fallback, a same-origin script/content policy, intentional camera/microphone permissions, no-cache app shell, and immutable hashed assets. Fonts and icons are distributed with the app and their licenses are preserved. No Firebase browser SDK or API secret is required.

GitHub Actions uses read-only repository access and runs reproducible installation, typecheck, lint, unit tests, production build, and Chromium desktop/mobile-viewport scenarios. Physical-device checks remain separate from automated and emulated tests.

## Quality and release requirements

Complete the inspection/report loop, preserve failure/unknown states, verify deletion/export/import/printing, test relevant permission and interruption cases, and document actual device coverage. A release must have a working public app, accessible source, accurate notices, and honest limitations. Screenshots and video must use actual behavior; synthetic fixtures and emulation must be labeled. See [release-checklist.md](release-checklist.md) for remaining work.

## Limits and later work

A browser inspection cannot guarantee a healthy device, verify ownership, authenticate a seller, certify malware absence, diagnose every hardware fault, or decide whether a device is safe to buy. Exact RAM/storage/CPU details may remain unknown. Timing depends on browser, power settings, load, and environment. Battery wear and internal disk health are not checked.

Future work includes expanded physical-device coverage, additional OS/battery imports, a transparent optional collector, and consent-based paired viewing. Pairing/QR relay, motion checks, accounts, shop workspaces, cloud sharing, and monetization are outside this beta. No destructive disk tests, firmware changes, device erasure, registry repairs, or ownership guarantees are included.
