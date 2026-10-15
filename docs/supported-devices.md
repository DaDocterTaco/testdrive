# Supported behavior and device evidence

TESTDRIVE is a browser beta. Support is capability-based: unavailable or denied APIs are reported honestly. Physical-device evidence is recorded separately from automated checks and responsive emulation.

The 1.2 UX release adds tested desktop (1440px), tablet (768px) and phone (390px/320px) layouts, a browser-sourced battery/website-quota overview, and native/full-viewport touch and display checks. Touch controls can move to expose covered cells; exit retains the observed grid. Website quota is not physical storage capacity. Native fullscreen and OS key handling remain browser-dependent. Current local, public and CI results are recorded in [verification.md](verification.md); older evidence below is historical.

## Intended browser coverage

| Environment                    | Intended usable path                                                            | Restrictions                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Current Chrome/Edge on Windows | Computer profile, keyboard/pointer, display/audio/media, Windows import, report | Exact hardware needs an imported report; browser timing is environment-dependent           |
| Current Safari on iPhone/iPad  | Touch coverage, supported media, display/audio, report                          | Memory/CPU/battery fields may be unavailable; permission and playback require user actions |
| Current Chrome on Android      | Touch coverage, supported media, display/audio, report                          | Device/browser APIs vary; camera switching depends on available cameras                    |
| Current Safari/Chrome on macOS | Computer input/media/display/report                                             | macOS system-report import is R1 and must not be implied                                   |
| Firefox on desktop             | Available input/media/display/report                                            | Some profile hints and graphics fields can be unavailable                                  |

These are implementation targets, not claims of completed physical testing.

## Implemented beta scope

The 1.1 source starts its automatic profile, fixed worker processing, and pixel-verified WebGL samples with one click. It retains optional setup, a correctable device class and selectable checks. Guided keyboard, pointer, touch, camera, microphone, speaker, display and battery/charger checks lead to the next pending check when saved. It also includes English Windows text-report import with review/confirmation; exact processor and installed-memory claim comparison; IndexedDB persistence with in-memory fallback; saved report revisions, deletion, versioned JSON import/export, and browser printing. This inventory describes implemented code; the verification matrix below records actual execution evidence.

The local catalog includes US English reference layouts for ASUS Zenbook DUO UX8406CA, Apple MacBook Air 13-inch M2 (2022), Dell XPS 13 9315, and Lenovo ThinkPad T14 Gen 4. Model references are manufacturer-sourced; they are not measured hardware specifications. Only a specific supplied or confirmed imported model selects a matching profile. An unknown model keeps a generic reference rather than guessing. Regional variants, external keyboards, replacements and remapping can differ. Keyboard capture cancels received page events; the browser and operating system retain control over reserved shortcuts.

The pointer challenge completes from observed movement, clicks, scrolling and dragging. Touch coverage is a 6×10 grid covering the rendered test area; it does not include browser chrome or the whole physical panel. Camera video and microphone sound are sampled automatically after explicit access, with bounded capture and visible results. Local speech recognition requires installed on-device browser support; microphone sound detection is available separately. Media quality and display condition still require optional human feedback. The display tour shows static colors every four seconds, with manual control and pause. Processing uses one bounded worker; graphics uses a small known WebGL scene rather than a stress test.

R1 paired viewing, QR relay, macOS import, Windows battery-report import, motion checks, desktop collector, accounts, analytics, and cloud report sync are not included in this beta.

## Check interpretation

| Check                        | Evidence it can provide                                                                | What it cannot prove                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Browser profile              | Browser-reported viewport, logical processor/memory hints, renderer/API availability   | Exact model, installed RAM, full storage, hardware authenticity                                                                |
| Bounded processing/rendering | Work completed and timing in this browser session                                      | A universal health/benchmark score or system stability under prolonged load                                                    |
| Keyboard                     | Observed physical key codes during the session                                         | Condition of keys that were not pressed; every language layout                                                                 |
| Pointer                      | Registered movement, buttons, scrolling                                                | Sensor calibration or unexercised controls                                                                                     |
| Touch                        | Registered coverage and maximum observed simultaneous contacts                         | Hardware maximum contacts or condition outside the test area                                                                   |
| Camera                       | Stream opened, observed dimensions, user's preview judgement                           | Lens/sensor health in every mode or independent quality certification                                                          |
| Microphone                   | Input received, available playback, user's judgement                                   | Calibrated sensitivity, noise floor, or untested audio paths                                                                   |
| Speaker                      | User-triggered test sound and human confirmation                                       | Objective frequency response or audio calibration                                                                              |
| Display                      | Rendered patterns and human confirmation                                               | Automatic dead-pixel detection or certified color accuracy                                                                     |
| Battery/charger              | Browser charge reading and a charging-state change during an optional connection check | Battery health/wear, full capacity, charger wattage, runtime, or whether a desktop's default reading represents a real battery |
| Windows import               | Extracted fields from supported English `msinfo32` text                                | Whether the file is genuine/current or belongs to this device                                                                  |

## Actual verification matrix

The 1.1.0-beta.2 release passed 36 unit tests and all 17 public HTTPS browser workflows using full Chromium, including synthetic media, source-change reset, line-based wheel input, model matching/preferences and deletion. The earlier beta3 PDF and screenshots listed below remain historical where identified as beta3. The complete current record is in [verification.md](verification.md).

| Environment                                          | Evidence                                                                                                                                | Status                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Node.js 24.15.0 / npm 11.6.1 on Windows              | Runtime versions inspected during setup                                                                                                 | Verified environment only                                                        |
| Windows Chromium 156.0.8078.4 (Playwright build1248) | Seven local desktop/mobile software scenarios and final focused keyboard-fallback regression; CI repeated seven successfully on Ubuntu  | Verified software behavior                                                       |
| Mobile viewport emulation                            | iPhone13 dimensions390×844 and320px width; synthetic touch and report, no overflow in tested paths                                      | Verified emulation; no physical iPhone claim                                     |
| Public Firebase HTTPS                                | App/deep routes200; absent JS404; security/cache/content types                                                                          | Verified HTTP configuration                                                      |
| Public beta 3 browser workflow                       | Seven scenarios passed; automatic worker/WebGL observations under CSP; only same-origin requests with zero policy/console/page failures | Verified software behavior                                                       |
| Browser print output                                 | Seven-page A4 synthetic PDF and all seven page renders visually inspected, without clipping/overlap/orphan heading/split fact rows      | Verified Chromium PDF rendering; OS print dialog and physical printer not tested |
| Physical Windows keyboard/pointer/camera/microphone  | Requires real interaction                                                                                                               | Not yet verified                                                                 |
| Physical iPhone/Safari                               | No physical-device test recorded                                                                                                        | Not yet verified                                                                 |
| Other physical devices                               | No evidence recorded                                                                                                                    | Not yet verified                                                                 |

Do not replace unknowns with a pass to make a report look complete. Missing hardware verification should remain visible in release notes. A laptop browser driving mobile viewport emulation is still a laptop browser.
