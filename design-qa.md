# TESTDRIVE 1.2 UX design QA

final result: passed

Reviewed October 15, 2026, 03:32 UTC. The supplied images are visual inspiration, as directed by the user, rather than a pixel-exact replacement of the functioning product. No actionable P0/P1/P2 finding remains after the fixes below. This is browser software evidence, not physical-device certification.

## Sources and captures

Source visual truth: the five supplied generated images in the local `generated_images/01a13d77-e838-71a3-a5df-edfb8587a366` directory. Full filenames are recorded here so the private comparison can be reproduced. The originals and comparison sheets were kept out of the public repository.

| Screen | Source file | Source pixels | Implementation screenshot | CSS viewport / capture pixels |
| --- | --- | --- | --- | --- |
| Mobile home | exec-02926e95-00d0-466c-9480-153a31b4d5f4.png | 853×1844 | docs/evidence/ux-mobile-home-viewport.png | 390×844 / 390×844 |
| Tablet library | exec-07b4ad3d-790a-4864-bd7f-10648eb0d63a.png | 1048×1501 | docs/evidence/ux-tablet-library-viewport.png | 768×1024 / 768×1880 full page |
| Tablet camera | exec-29e11cf2-5008-4956-b77f-67af45e2d32b.png | 1048×1501 | docs/evidence/ux-tablet-camera-viewport.png | 768×1024 / 768×1474 full page |
| Mobile microphone | exec-bbd48bb3-7107-4cc8-a6e8-96ef245614da.png | 853×1844 | docs/evidence/ux-mobile-microphone-viewport.png | 390×844 / 390×1363 full page |
| Desktop report | exec-4dcfd56e-110b-456b-884c-d7f2f1559ac5.png | 1586×992 | docs/evidence/ux-desktop-report-viewport.png | 1440×1000 / 1440×2042 full page |

Implementation captures use Chromium at deviceScaleFactor 1. Each source and implementation was normalized to 600 pixels wide, preserving aspect ratio, and placed together in `tmp/compare-{home,library,camera,microphone,report}.png`. Focused library, microphone and report crops are in `tmp/focus-*.png`. These combined images were opened and reviewed. Browser chrome and device frames are excluded. Reference camera/microphone images show completed samples; baseline implementation captures show the honest permission-before-capture state. The report capture has one untouched check, so its counts and density intentionally differ from the eleven-check example. Existing buyer lifecycle evidence also shows the populated report and attention state.

## Required surfaces

- **Typography:** Self-hosted Manrope headings and DM Sans interface text retain the clear geometric heading/body hierarchy of the references. Actual reference font identity is not supplied. We checked wrapping, weights and readable controls at 320, 390, 768 and 1440 pixels. No clipped heading or horizontal overflow remained.
- **Spacing:** Light panels, restrained borders, generous primary actions and grouped guidance follow the reference direction. Tablet library density was reduced after comparison. Touch and display overlays fill the viewport; moving controls exposes covered touch cells. The guided save bar remains available while content scrolls.
- **Color:** Forest-green actions and headings, pale green/white surfaces, muted gray secondary text, amber attention and explicit unknown states are consistent across views. States use text and icons as well as color.
- **Imagery:** The existing product logo and standard interface icons are preserved. The user requested no new artwork for this pass. The decorative device illustration and fictional camera photograph were intentionally omitted; camera content appears only after permission. No sample photograph or waveform is presented as observed hardware evidence.
- **Copy:** Start, permission, active capture, automatic stop, optional human feedback and next actions are distinguished. Battery/browser quota sources and unknowns are explicit. Reports retain technical evidence behind expandable details and include it when printed.

## Findings and iteration history

1. **P2, tablet library density:** Initial 768-pixel capture was 2191 pixels tall and cards were roughly 285 pixels tall. Compact padding, headings and card footer spacing reduced the final page to 1880 pixels while preserving 44-pixel actions and readable descriptions. Re-captured and compared in `tmp/compare-library.png`; resolved.
2. **P2, mobile microphone instruction visibility:** Starting a five-second sample could leave the phrase beneath the fixed save bar. The actual capture start now brings the phrase/meter into view after permission and before the timer. A new browser regression verifies the entire phrase sits above the save bar; synthetic input completes. `docs/evidence/ux-mobile-microphone-synthetic-complete.png`; resolved.
3. **P2, native touchscreen exit focus:** Native fullscreen exit could override the attempted return focus. Focus now restores after the native exit promise and layout frames. Both native mouse Exit and fallback Escape pass, preserving two touch cells and restoring page scrolling. `docs/evidence/touch-native-active-mobile.png` and `touch-native-retained-mobile.png`; resolved.
4. Accessible home heading lacked a space across its line break. Explicit spacing was added and exact accessible-text assertions pass at all three principal widths.

The first review was blocked by the density and capture/focus issues. The final review uses the revised captures and affected passing workflows. No visual fix remains pending. Minor differences in icon size, paragraph length and report density are accepted adaptations to functional content, not a claim of exact reproduction.

## Interaction verification

The previous full run passed 24 of 25 scenarios and exposed native exit focus. After its fix, all eight responsive/scan/touch workflows passed. The final desktop media and mobile microphone visibility scenarios also passed. The suite now contains 27 cases for CI. TypeScript, ESLint, 40 unit tests and the final production build pass. Captures recorded zero page errors. Public deployment and CI identities are recorded in `docs/verification.md` after publication.

Primary paths checked: start scan, valid and unavailable device readings, stop/retry/navigation cancellation, all eight guided cards, native/fallback touch coverage and exits, mouse exclusion, camera/microphone permission and bounded synthetic samples, keyboard capture, pointer challenge, responsive report/import/export and print. Physical iPhone/Safari, actual keyboard shortcuts and real media quality remain outside this software review.
