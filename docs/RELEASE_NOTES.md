# TESTDRIVE 1.1.0-beta.4

This update makes an inspection easier to start and completes more checks from observed input. One click starts the automatic scan; saving a result takes the user to the next pending check.

Beta 4 makes an unknown keyboard easier to finish. It counts received key responses, shows extra keys such as a number pad, and lets the user choose **All my keys responded** after leaving capture. This is recorded as explicit user confirmation. A generic reference never invents a required physical key count or automatic full-keyboard coverage, and starting another capture clears the confirmation. Known laptop layouts keep their existing automatic coverage checks.

Beta 3 corrects the ASUS AI/Copilot key: a received Win + Shift + F23 sequence lights its dedicated key, while shortcut modifiers do not falsely count as independently tested keys. Three visible red Escape dots show exit progress, reset after a pause or another key, and confirm the third press. The browser must receive the shortcut to identify it; Win + Shift alone is insufficient.

- Four manufacturer-sourced US keyboard profiles: ASUS Zenbook DUO UX8406CA, Apple MacBook Air 13-inch M2 (2022), Dell XPS 13 9315, and Lenovo ThinkPad T14 Gen 4. A supported confirmed Windows import selects a matching layout; manual choices are remembered locally and cleared with local data.
- Explicit keyboard capture with visible active state, per-key press/release progress, triple-Escape, mouse Exit, 60-second inactivity and focus-loss exits.
- An eight-step pointer challenge automatically checks target movement, clicks, both scroll directions and dragging.
- Four-second camera and five-second microphone samples automatically check received media and stop capture. Optional installed on-device speech recognition can match the displayed phrase. No cloud transcription fallback or language-pack download is used.
- Battery/charger readings where available, a pausable display color tour, clearer instructions, optional human feedback and next-check navigation.

The laptop catalog is a reference database, not proof of current hardware specifications. Exact model selection needs a supplied/confirmed model or a manual choice. Operating-system reserved keys may still open system actions because a website cannot intercept keys the OS withholds. Sound detection does not claim word recognition; picture/sound quality and display defects still need human judgement.

Camera/microphone access starts only after the relevant action. Temporary media and normalized reports stay in the browser unless the user exports a report. Firebase serves the static app; no account, inspection backend or API secret is required.

## Verification

Beta 4 passed TypeScript, ESLint, all 37 unit tests and the production build. All 19 browser workflows passed in [CI](https://github.com/DaDocterTaco/testdrive/actions/runs/38674464362). The six affected keyboard/mobile workflows and the complete buyer/report lifecycle also passed against the live HTTPS app. Exact deployed asset hashes, routes, headers and browser security checks passed. Source identities and prior release results are recorded in [verification.md](verification.md). Full Chromium is used for media tests: the stripped Playwright headless shell crashes in its experimental speech availability API even without this app, while the full browser returns the supported local-language status safely.

Software input, synthetic camera/audio streams, and mobile viewport emulation do not establish physical hardware quality. Physical iPhone/Safari and actual camera/microphone/input hardware still require device testing.

[Live app](https://testdrive-offgrid-2026.web.app) · [Public source](https://github.com/DaDocterTaco/testdrive) · [Update details](usability-update.md) · [Catalog sources](device-catalog.md)

The earlier beta 3 walkthrough remains historical evidence of that release. It does not demonstrate the 1.1 changes. Earlier source tags are unchanged.

OpenAI Codex and specialist coding agents assisted development and verification. They are AI tools, not human team participants. Third-party packages and fonts retain their licenses in THIRD_PARTY_NOTICES.md. A public release does not establish event submission.
