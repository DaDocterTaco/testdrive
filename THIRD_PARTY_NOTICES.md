# Third-party notices and development disclosures

TESTDRIVE application code is distributed under the MIT license in `LICENSE`. Dependencies retain their original licenses. The committed lockfile is the authority for exact dependency versions. Distributed package license files remain available in installed package directories. This summary does not replace those licenses.

## Direct runtime foundations

| Package | Role | License |
| --- | --- | --- |
| React and React DOM 19.3.1 | Application rendering | MIT |
| React Router DOM 7.18.4 | Client navigation | MIT |
| Lucide React 0.468.0 | Interface icons | ISC |
| Zod 4.6.7 | Structured data validation | MIT |

## Build and verification tools

Vite, `@vitejs/plugin-react`, Vitest, ESLint, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, and the Prettier code formatter use MIT licenses. TypeScript and Playwright use Apache-2.0. React and Node.js TypeScript declaration packages are MIT licensed. These tools and their transitive dependencies keep their own notices; consult the installed packages and lockfile. Verify this inventory if dependencies change.

The direct dependency licenses above were checked against installed package metadata on October 14, 2026. Installed tool versions at that check: Vite 7.3.7, plugin-react 5.2.0, TypeScript 5.9.3, Vitest 3.2.7, Playwright 1.64.1, ESLint 9.39.5, typescript-eslint 8.71.2, eslint-plugin-react-hooks 7.1.1, and globals 16.5.0.

## Hosting and AI assistance

The self-hosted DM Sans and Manrope font files in `public/fonts` were obtained from Google Fonts. Both are distributed under the SIL Open Font License 1.1. Their original copyright and full license texts are preserved alongside the fonts in `DM-Sans-OFL.txt` and `Manrope-OFL.txt`. The app serves these files from its own origin; no Google Fonts request is required at runtime.

- Firebase Hosting serves the static production assets. TESTDRIVE does not bundle Firebase's SDK or require a Firebase runtime database for the local inspection workflow.
- GitHub and GitHub Actions provide source hosting and CI when the repository is published.
- OpenAI Codex and specialist coding agents assisted architecture, code, UI, testing, infrastructure, and documentation. They are development tools, not human participants or independent hardware validators.
- Browser/OS API documentation informed the implementation. Sanitized fixtures are demonstration data and must not be represented as the inspected device's actual specifications.
- Existing diagnostics products establish the category. No claim is made that TESTDRIVE invented device inspection.

No proprietary diagnostic database, remote AI measurement service, purchased stock image, copied product interface, or third-party recording is required by this release. Any later asset or dependency addition must update this file with its actual origin and licensing.
