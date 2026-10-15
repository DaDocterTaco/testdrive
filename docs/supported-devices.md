# Supported behavior and device evidence

TESTDRIVE is a browser beta. Support is capability-based: unavailable or denied APIs are reported honestly. Physical-device evidence is recorded separately from automated checks and responsive emulation.

## Intended browser coverage

| Environment | Intended usable path | Restrictions |
| --- | --- | --- |
| Current Chrome/Edge on Windows | Computer profile, keyboard/pointer, display/audio/media, Windows import, report | Exact hardware needs an imported report; browser timing is environment-dependent |
| Current Safari on iPhone/iPad | Touch coverage, supported media, display/audio, report | Memory/CPU/battery fields may be unavailable; permission and playback require user actions |
| Current Chrome on Android | Touch coverage, supported media, display/audio, report | Device/browser APIs vary; camera switching depends on available cameras |
| Current Safari/Chrome on macOS | Computer input/media/display/report | macOS system-report import is R1 and must not be implied |
| Firefox on desktop | Available input/media/display/report | Some profile hints and graphics fields can be unavailable |

These are implementation targets, not claims of completed physical testing.

## Implemented beta scope

The current source includes setup with user-correctable device class and selectable checks; automatic profile, fixed worker processing, and pixel-verified WebGL samples; guided keyboard, pointer, touch, camera, microphone, speaker, and display modules; English Windows text-report import with review/confirmation; exact processor and installed-memory claim comparison; IndexedDB persistence with in-memory fallback; saved report revisions, deletion, versioned JSON import/export, and browser printing. This inventory describes implemented code; the verification matrix below records which behavior was actually exercised.

The keyboard is an ANSI reference with an alternate-layout option, not a universal hardware layout. Touch coverage is a 6×10 grid covering the rendered test area; it does not include browser chrome or the whole physical panel. Camera source labels and recording formats depend on browser exposure. Media quality and display condition require a human answer. Processing uses one bounded worker; graphics uses a small known WebGL scene rather than a stress test.

R1 paired viewing, QR relay, macOS import, Windows battery-report import, motion checks, desktop collector, accounts, analytics, and cloud report sync are not included in this beta.

## Check interpretation

| Check | Evidence it can provide | What it cannot prove |
| --- | --- | --- |
| Browser profile | Browser-reported viewport, logical processor/memory hints, renderer/API availability | Exact model, installed RAM, full storage, hardware authenticity |
| Bounded processing/rendering | Work completed and timing in this browser session | A universal health/benchmark score or system stability under prolonged load |
| Keyboard | Observed physical key codes during the session | Condition of keys that were not pressed; every language layout |
| Pointer | Registered movement, buttons, scrolling | Sensor calibration or unexercised controls |
| Touch | Registered coverage and maximum observed simultaneous contacts | Hardware maximum contacts or condition outside the test area |
| Camera | Stream opened, observed dimensions, user's preview judgement | Lens/sensor health in every mode or independent quality certification |
| Microphone | Input received, available playback, user's judgement | Calibrated sensitivity, noise floor, or untested audio paths |
| Speaker | User-triggered test sound and human confirmation | Objective frequency response or audio calibration |
| Display | Rendered patterns and human confirmation | Automatic dead-pixel detection or certified color accuracy |
| Windows import | Extracted fields from supported English `msinfo32` text | Whether the file is genuine/current or belongs to this device |

## Actual verification matrix

| Environment | Evidence | Status |
| --- | --- | --- |
| Node.js 24.15.0 / npm 11.6.1 on Windows | Runtime versions inspected during setup | Verified environment only |
| Desktop browser automation | Pending; record exact browser/version and results in verification.md | Not yet recorded |
| Mobile viewport emulation | Pending; does not validate an iPhone touchscreen/camera | Not yet recorded |
| Physical Windows keyboard/pointer/camera/microphone | Requires real interaction | Not yet verified |
| Physical iPhone/Safari | No physical-device test recorded | Not yet verified |
| Other physical devices | No evidence recorded | Not yet verified |

Do not replace unknowns with a pass to make a report look complete. Missing hardware verification should remain visible in release notes. A laptop browser driving mobile viewport emulation is still a laptop browser.
