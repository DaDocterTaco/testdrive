# October 14 UX polish

This pass follows the five user-supplied green-and-white design references as visual direction for the existing production app. The references are concepts, not recorded diagnostic evidence. No concept camera picture or decorative waveform is presented as a real test result.

## Research and decisions

- **Make the next action obvious.** The home screen has one primary Start inspection action. The library separates hands-on checks from the automatic scan. Active tests use a focused header, visible progress, larger assessment choices and a persistent save area. [Nielsen Norman Group: visibility of system status](https://www.nngroup.com/articles/visibility-system-status/).
- **Make controls easy to reach.** Main controls use at least 44 CSS pixels in height, with visible keyboard focus and responsive wrapping. WCAG 2.2's minimum target criterion is 24 CSS pixels subject to exceptions; 44-pixel controls are our more generous product choice, not a claim of complete WCAG conformance. [W3C: target size minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- **Show useful information early.** The quick scan displays system/browser family, CSS display size, available battery charge and website storage allowance. Missing APIs remain explicitly unavailable. Exact model, installed memory and physical disk capacity are never inferred from browser hints. Optional battery and storage reads each time out after 1.2 seconds.
- **Give touch and display tests the space they need.** A direct user action requests native fullscreen. If it is unsupported or denied, a fixed view fills the available page viewport. Touch controls can move to expose covered cells. Exit/Escape restores the page and keeps observations. Browser/system controls outside the available viewport are not tested. [MDN: requestFullscreen](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen).
- **Keep reports readable.** Findings, attention items and unknowns are prominent. Technical observations stay available behind disclosures, which expand for printing and then return to their previous state.

## Scope

This is a production UI and workflow improvement, not an AI model integration. Guidance and feedback are based on observed browser events and explicit user answers. Media stays local; camera and microphone permission is still requested only when the user starts the relevant check. No video was created in this pass.

See the root `design-qa.md` and release verification record for actual test results and limitations.
