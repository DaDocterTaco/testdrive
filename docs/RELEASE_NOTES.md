# TESTDRIVE 1.1.0-beta.1

This update makes an inspection easier to start and completes more checks from observed input. One click starts the automatic scan; saving a result takes the user to the next pending check.

- Four manufacturer-sourced US keyboard profiles: ASUS Zenbook DUO UX8406CA, Apple MacBook Air13-inch M2 (2022), Dell XPS13 9315, and Lenovo ThinkPad T14 Gen4. A supported confirmed Windows import selects a matching layout; manual choices are remembered locally and cleared with local data.
- Explicit keyboard capture with visible active state, per-key press/release progress, triple-Escape, mouse Exit,60-second inactivity and focus-loss exits.
- An eight-step pointer challenge automatically checks target movement, clicks, both scroll directions and dragging.
- Four-second camera and five-second microphone samples automatically check received media and stop capture. Optional installed on-device speech recognition can match the displayed phrase. No cloud transcription fallback or language-pack download is used.
- Battery/charger readings where available, a pausable display color tour, clearer instructions, optional human feedback and next-check navigation.

The laptop catalog is a reference database, not proof of current hardware specifications. Exact model selection needs a supplied/confirmed model or a manual choice. Operating-system reserved keys may still open system actions because a website cannot intercept keys the OS withholds. Sound detection does not claim word recognition; picture/sound quality and display defects still need human judgement.

Camera/microphone access starts only after the relevant action. Temporary media and normalized reports stay in the browser unless the user exports a report. Firebase serves the static app; no account, inspection backend or API secret is required.

## Verification

The implementation was checked with TypeScript, ESLint,36 unit tests, a production build and the desktop/mobile-viewport browser regression suite. Current local, production and CI results are recorded in [verification.md](verification.md). Full Chromium is used for media tests: the stripped Playwright headless shell crashes in its experimental speech availability API even without this app, while the full browser returns the supported local-language status safely.

Software input, synthetic camera/audio streams, and mobile viewport emulation do not establish physical hardware quality. Physical iPhone/Safari and actual camera/microphone/input hardware still require device testing.

[Live app](https://testdrive-offgrid-2026.web.app) · [Public source](https://github.com/DaDocterTaco/testdrive) · [Update details](usability-update.md) · [Catalog sources](device-catalog.md)

The earlier beta3 walkthrough remains historical evidence of that release. It does not demonstrate the1.1 changes. Earlier source tags are unchanged.

OpenAI Codex and specialist coding agents assisted development and verification. They are AI tools, not human team participants. Third-party packages and fonts retain their licenses in THIRD_PARTY_NOTICES.md. A public release does not establish event submission.
