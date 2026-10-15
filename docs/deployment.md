# Firebase Hosting operations

## Actual target

The dedicated Google Cloud/Firebase project and default Hosting site were created during this build:

- Project: `testdrive-offgrid-2026`
- Site: `testdrive-offgrid-2026`
- Assigned public address: https://testdrive-offgrid-2026.web.app
- Console: https://console.firebase.google.com/project/testdrive-offgrid-2026/overview

An assigned address is not proof of a deployed application. See [verification.md](verification.md) for the most recent actual deployment and smoke test. Firebase Hosting was selected because the user explicitly requested it; this supersedes the specification's preferred Cloudflare plan. No billable service or billing account was configured for TESTDRIVE by this build.

The published beta is `1.1.0-beta.2`, implementation commit `7521b81ff9584d64bb0d241629ea3923147e916e` and immutable tag `v1.1.0-beta.2`. The deploy message includes this identity. Its public JavaScript and CSS hashes were checked against the local production build. Later documentation/evidence commits do not alter the source tag or deployed bundle. Earlier `v1.1.0-beta.1` and `v1.0.0-beta.3-offgrid` tags are preserved.

## Reproducible deployment

Install the Firebase CLI as documented in the [official CLI guide](https://firebase.google.com/docs/cli). Authenticate using your own account with access to the project. Credentials belong outside this repository.

```sh
firebase login
npm ci
npm run check
firebase deploy --only hosting --project testdrive-offgrid-2026
```

Check the Git root is this directory before any release commit. The parent workspace contains unrelated projects and must never be published as TESTDRIVE.

The deployment command publishes the existing `dist` output. Always rebuild the exact release before deploying. The app has no runtime environment-secret requirement and does not need the Firebase browser SDK. Do not initialize Authentication, Firestore, Cloud Functions, or storage to make static hosting work.

`firebase.json` applies a same-origin content policy, camera/microphone permission policy, frame protection, no-cache for the app shell, and immutable cache for Vite's hashed assets. Extensionless routes receive `/index.html`; file URLs with extensions do not receive the SPA fallback. Keep all runtime fonts/scripts/assets local or review the CSP before adding external resources.

Configuration follows [Firebase Hosting configuration](https://firebase.google.com/docs/hosting/full-config) and [Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart), checked October 14, 2026 (America/New_York).

## Smoke tests after every candidate deployment

1. Open the public HTTPS address in a fresh browser context. Confirm the actual application title and rendered home screen.
2. Refresh a valid nested app route. Request `/assets/does-not-exist.js` and confirm a 404 rather than HTML.
3. Inspect security/permission headers and confirm no CSP console violations affect real checks.
4. Complete setup and one actual input check. Exercise permission denial, skip, and report generation.
5. Export JSON, import it again, and preview Print / Save PDF. Refresh to verify local recovery.
6. Leave camera/microphone checks and verify capture stops. Do not count synthetic browser input as physical hardware evidence.
7. Repeat critical interactions on a physical phone. Record model, OS/browser versions, commit, outcome, and omissions.
8. Open the source link in a logged-out context and verify any demo video after it is recorded/published.

## Rollback

Keep the last working commit and deployment identifiable. The Firebase console's Hosting release history can roll back a failed release. Alternatively, check out the known working commit in a separate clean directory, run `npm ci` and `npm run build`, then deploy its `dist` to the same explicit project. Do not reset or overwrite the active workspace to perform a rollback. Record the rollback and failed version in the ledger.

## Credential failures

If the CLI says credentials expired, use `firebase login --reauth`. A constrained shell may be unable to refresh the credential store even when an existing account is valid; use the normal authorized environment. Never print `firebase login:list --json`, credential-store files, or OAuth tokens into bug reports or build logs. GitHub publication likewise requires an account with repository write permission; verify `gh api user --jq .login` before creating a remote.
