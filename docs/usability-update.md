# TESTDRIVE 1.1 usability update

This update makes an inspection easier to start and guides each action. It also keeps a clear distinction between an event the browser observed and physical quality the user judged.

## Changes

- One **Start inspection** action opens the automatic scan. Device details and the inspection plan remain editable, and the completed scan points directly to the next check.
- Saving a guided result continues to the next pending check. Users can still skip an unavailable check, revisit the checklist, or review a report early.
- A local laptop catalog provides documented US English keyboard reference layouts. A confirmed supported Windows model can select its reference automatically. Manual model selection is always available. The browser cannot reliably discover an exact laptop model by itself, and catalog specifications are not measurements of a particular device.
- Keyboard capture has a prominent start control and visible active state. While active, the page cancels keyboard defaults that reach it. Three consecutive Escape presses, the mouse-operated Exit button, 60 seconds without input, or losing focus end capture. An operating system may intercept Windows, Command, power, security, and other reserved shortcuts before the page sees them; no browser page can guarantee suppression of all keys. The test reports which keys actually arrived.
- The pointer challenge guides movement, primary click, double click, secondary click, scrolling in both directions, and dragging. Each completed step requires matching browser input. Touch input does not count as a mouse or trackpad action.
- On the ASUS layout, a received Win + Shift + F23 sequence highlights the AI/Copilot key. Its bundled modifiers do not count as separately tested keys. Three red Escape dots show progress toward leaving keyboard capture; another key or a two-second pause resets that progress.
- Camera and microphone checks run short local samples after explicit permission. Video frames, brightness/change samples, and audio input are checked automatically. A microphone phrase gives the user a consistent thing to say; word recognition is available only when the browser supports installed on-device recognition. Recognizing words is separate from detecting sound. No cloud transcription is required.
- Automatic observations can be saved without inventing a human answer. Optional human feedback remains available for picture clarity, sound quality, or concerns that the browser cannot judge.
- A capability-based battery/charger check uses only available browser charge information and observed charging-state changes. It does not estimate battery health or wear.

## Validation scope

Automated regression coverage exercises one-click start, keyboard capture/exit behavior, the pointer challenge, bounded synthetic media streams, imported/report data, progress recovery, and narrow viewports. Synthetic media and software input prove application behavior, not the physical condition of a camera, microphone, mouse, keyboard, or laptop battery. Current execution results and release identity are recorded in [verification.md](verification.md).

The previous beta 3 video remains a demonstration of that earlier release. It should not be treated as a walkthrough or verification of the 1.1 update.
