# TESTDRIVE

**Know the device before you buy it.**

TESTDRIVE is a browser inspection tool for computers, phones, and tablets. It combines available browser observations, hands-on checks, optional Windows system-report import, and a portable report. Values always identify their source. An incomplete check stays untested.

The 1.1 update adds one-click scanning, a four-laptop US keyboard catalog, explicit keyboard capture, an eight-step pointer challenge, automatic bounded camera/microphone observations, battery/charger readings, and a guided display tour. See [what changed](docs/usability-update.md) and the [manufacturer-sourced laptop catalog](docs/device-catalog.md).

This repository is the implementation for HACK47: OFFGRID, October 2026. See [the public product specification](docs/PRODUCT_SPEC.md), [verification evidence](docs/verification.md), and [supported devices](docs/supported-devices.md) for the actual release state. A planned feature or a passing automated test does not establish that physical hardware passed.

## Release access

- [Live app](https://testdrive-offgrid-2026.web.app) — Firebase Hosting, beta `1.1.0-beta.3`.
- [Public source](https://github.com/DaDocterTaco/testdrive) and [immutable 1.1 source tag](https://github.com/DaDocterTaco/testdrive/tree/v1.1.0-beta.3).
- [Release verification CI](https://github.com/DaDocterTaco/testdrive/actions/runs/38673570544) — all 37 unit tests and 18 desktop/mobile-viewport scenarios passed on the beta 3 source. See the [verification record](docs/verification.md) for local and production results.
- [Current release notes](https://github.com/DaDocterTaco/testdrive/releases/tag/v1.1.0-beta.3). The [earlier beta 3 demonstration](https://github.com/DaDocterTaco/testdrive/releases/tag/v1.0.0-beta.3-offgrid) is historical and does not show the 1.1 update.
- Demo recording and Devpost submission status are tracked in the verification record. Do not infer submission from the presence of this repository.

## Develop

Use Node.js 24 LTS and npm (Node 22.12 or newer is accepted by this project).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. `localhost` is a secure context for local media testing. A phone opening an ordinary LAN HTTP address may not receive camera/microphone access; use the public HTTPS deployment.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

`npm run check` runs the main local quality checks. The production files are in `dist`. Browser automation uses `npm run test:e2e` after Playwright browsers are installed; those checks are distinct from physical-device verification.

## Product behavior

One click starts a local inspection and runs the available automatic scan. The app then guides one task at a time and advances to the next check after saving. Device class, keyboard profile and the inspection plan remain editable. Imported model identifiers can choose one of four documented US keyboard references, and a remembered manual choice stays labeled as a preference. Camera and microphone samples finish automatically; optional human feedback covers clarity and quality. Specific checks and their evidence are listed in [supported-devices.md](docs/supported-devices.md).

The 1.1 release is covered by 17 browser workflows and public HTTP/content-policy checks, including report export/import and print CSS. The earlier beta 3 release also received a seven-page browser-PDF render review; that PDF remains historical evidence. Windows Chromium automation and mobile viewport emulation exercise the interface; a physical iPhone, real camera/microphone quality, and physical input hardware have not been independently verified. Run the relevant checks on the actual device and read the report's limitations.

Browser observations cannot establish an exact laptop model, exact installed RAM, complete storage capacity, disk health, battery wear, ownership, authenticity, or the absence of hidden faults. Imported specifications describe the selected file; they are not independently authenticated. Catalog details do not establish a particular device's configuration. Keyboard capture suppresses only events delivered to the browser; OS-reserved shortcuts may still open. Word matching requires installed on-device speech support; ordinary audio detection does not claim to recognize speech. Workload timing reflects the browser and current environment, not a universal hardware score. Human observations remain labeled as human observations.

R1 work such as paired-device viewing, macOS reports, battery-report import, and a desktop collector must not be represented as shipped unless the release ledger records working evidence.

## Import a Windows report

1. On the computer being inspected, open **System Information** (`msinfo32`).
2. Choose **File → Export** and save an English-language text report.
3. In TESTDRIVE, choose the file under exact specifications. Review the extracted fields before applying them.
4. Confirm that the report describes the device being inspected. Missing fields stay unknown.

The parser reads locally. Avoid sharing the raw report: it can contain names, serials, and other personal details. Use sanitized fixtures when reporting parser bugs.

## Privacy and persistence

Inspection records remain in browser storage on this browser/device unless the person exports them. Camera/microphone access starts only after a specific user action. Temporary captures and recordings are not uploaded to an application backend. Imported reports are read in the browser. Deleting local data does not delete files already downloaded by the person.

Firebase serves the static website and receives normal web requests, which may produce hosting access logs. This release does not need Firebase Authentication, Firestore, a realtime database, cloud storage, analytics, or an API key. No secret belongs in a `VITE_` variable. Clearing browser storage or using a private window may remove local inspections.

## Deploy and recover

See [deployment.md](docs/deployment.md) for the exact Firebase target, prerequisites, smoke tests, and rollback. `firebase.json` publishes only `dist`, sets security/permission headers, refreshes the app shell, caches hashed assets, and rewrites extensionless app routes. Missing asset files remain missing rather than returning an HTML document.

GitHub Actions runs install, typecheck, lint, unit tests, a production build, and Chromium desktop/mobile-viewport scenarios. It does not deploy automatically; no deployment token is committed.

## Contributions and attribution

The application code is MIT licensed; dependencies retain their own licenses. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). OpenAI Codex and specialist coding agents assisted with architecture, implementation, testing, and release preparation. AI-generated code does not replace live verification. The device-diagnostics category predates this project; TESTDRIVE's contribution is this implementation and inspection workflow.

To report an issue, include browser/OS versions, the affected check, steps, and a sanitized screenshot. Do not attach personal system exports, recordings, serial numbers, or credentials.
