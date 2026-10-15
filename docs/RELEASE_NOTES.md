# TESTDRIVE 1.0.0-beta.3

**Know the device before you buy it.**

[Open the live app](https://testdrive-offgrid-2026.web.app) · [Public source](https://github.com/DaDocterTaco/testdrive) · [Immutable implementation](https://github.com/DaDocterTaco/testdrive/tree/v1.0.0-beta.3-offgrid)

This beta provides an inspection-to-report workflow for computers, phones, and tablets. It combines qualified browser information, bounded processing and graphics samples, guided input/media/display checks, local English Windows specification import, and cautious seller-claim comparison. Reports retain sources, uncertainty, notes, and attempts, and can be saved locally, moved as validated JSON, or printed.

[Watch or download the silent 60-second walkthrough](https://github.com/DaDocterTaco/testdrive/releases/download/v1.0.0-beta.3-offgrid/demo-browser-walkthrough.webm). It shows the actual public app with labeled synthetic specifications, seller claims, and software inputs. It does not claim physical-device verification.

Camera/microphone access starts only from the relevant action. Temporary media is not uploaded to an application backend. Inspections remain in the browser unless exported. Firebase serves static assets, including self-hosted fonts; no account or inspection database is required.

Beta 2 added schema-safe keyboard fallbacks when browsers omit physical key codes. Beta 3 improves printed reports by keeping headings and evidence rows readable across pages. Earlier source tags remain unchanged.

## Verification

- Implementation commit: `d7eea4973711164ee758c70eacab9e383b921fdc`; immutable tag: `v1.0.0-beta.3-offgrid`.
- [Final GitHub CI](https://github.com/DaDocterTaco/testdrive/actions/runs/38666848119): reproducible install, typecheck, lint, 21 unit tests, production build, and all 7 desktop/mobile-viewport browser scenarios passed.
- Public HTTPS/deep-route behavior, real missing-file 404, security/permission headers, cache policy, and public asset hashes were verified against the checked build.
- All 7 final public workflows passed in 39.2 seconds. A fresh production browser ran all 3 automatic observations under the content policy with no CSP violations, failed requests, third-party requests, or browser errors.
- The actual synthetic browser PDF spans 7 A4 pages; all page renders passed visual review without clipping, overlap, orphan results heading, or split evidence rows. Physical printing was not tested.
- Screenshots and any walkthrough explicitly label synthetic data, software input, and viewport emulation. Detailed production evidence is in `docs/evidence/production` and `docs/verification.md`.

## Limits

Physical iPhone/Safari behavior and real camera/microphone/input quality have not been independently verified. Browser hints are not exact hardware specifications. Imported reports are user-supplied and are not authenticated. Timing depends on the environment. Battery wear, disk health, ownership, hidden defects, pairing/QR relay, accounts, and cloud report sync are outside this beta.

TESTDRIVE is an inspection record, not a device certification or purchase guarantee. A public app/release does not establish that an event submission was completed.

OpenAI Codex and specialist coding agents assisted development and verification. They are AI tools, not human team participants. Third-party packages and self-hosted fonts retain their licenses; see `THIRD_PARTY_NOTICES.md`.
