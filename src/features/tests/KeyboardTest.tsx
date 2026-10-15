import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Keyboard, LockKeyhole, MousePointer2, X } from "lucide-react";
import {
  DEVICE_PROFILES,
  GENERIC_KEYBOARD_PROFILE,
  flattenKeys,
  getDeviceProfile,
  testableKeys,
} from "../../devices/catalog";
import type { KeySpec } from "../../devices/catalog";
import { fact, useEvidence } from "./shared";
import type { ModuleProps } from "./shared";
import {
  KEYBOARD_IDLE_MS,
  isCopilotModifier,
  isCopilotShortcut,
  keyIdentifier,
  nextEscapeSequence,
} from "./keyboardCapture";
import "./keyboard.css";

interface KeyboardLock {
  lock: (keys?: string[]) => Promise<void>;
  unlock: () => void;
}
type KeyboardNavigator = Navigator & { keyboard?: KeyboardLock };
type KeyObservation = { presses: number; released: boolean };

export function KeyboardTest({
  onChange,
  profileId,
  onProfileChange,
  onConfirmAssessment,
}: ModuleProps) {
  const [localProfile, setLocalProfile] = useState(
    profileId ?? GENERIC_KEYBOARD_PROFILE.id,
  );
  const profile =
    getDeviceProfile(profileId ?? localProfile) ?? GENERIC_KEYBOARD_PROFILE;
  const generic = profile.id === GENERIC_KEYBOARD_PROFILE.id;
  const [genericConfirmed, setGenericConfirmed] = useState(false);
  const [seen, setSeen] = useState<Record<string, KeyObservation>>({});
  const [held, setHeld] = useState<Set<string>>(new Set());
  const [lastKey, setLastKey] = useState("—");
  const [active, setActive] = useState(false);
  const [capture, setCapture] = useState("Keyboard capture is off");
  const [exitReason, setExitReason] = useState("");
  const [interruptions, setInterruptions] = useState(0);
  const [escapeCount, setEscapeCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [peakHeld, setPeakHeld] = useState(0);
  const [copilot, setCopilot] = useState({ presses: 0, released: false });
  const [copilotDown, setCopilotDown] = useState(false);
  const [standaloneModifiers, setStandaloneModifiers] = useState<Set<string>>(
    new Set(),
  );
  const [compoundModifiers, setCompoundModifiers] = useState<Set<string>>(
    new Set(),
  );
  const copilotHeld = useRef(false);
  const copilotMembers = useRef(new Set<string>());
  const shell = useRef<HTMLDivElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const activeRef = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const deadline = useRef(0);
  const escapeSequence = useRef({ count: 0, lastAt: 0 });
  const ownsFullscreen = useRef(false);
  const lastProfile = useRef(profile.id);
  const heldRef = useRef(new Set<string>());
  const keys = flattenKeys(profile);
  const expected = testableKeys(profile);
  const tested = Object.keys(seen);
  const keyReleased = (code: string) =>
    isCopilotModifier(code)
      ? standaloneModifiers.has(code)
      : !!seen[code]?.released;
  const completed = expected.filter((k) => keyReleased(k.code)).length;
  const remaining = expected.filter((k) => !keyReleased(k.code));
  const complete = !generic && completed === expected.length;
  const responses = tested.filter((code) => keyReleased(code)).length;
  const extraCodes = tested.filter(
    (code) => !keys.some((key) => key.code === code),
  );
  const canConfirmGeneric = responses > 0 && held.size === 0 && !active;

  const releaseCapture = useCallback(() => {
    try {
      (navigator as KeyboardNavigator).keyboard?.unlock();
    } catch {
      /* Already released by browser. */
    }
    if (
      ownsFullscreen.current &&
      document.fullscreenElement === shell.current
    ) {
      void document.exitFullscreen().catch(() => undefined);
    }
    ownsFullscreen.current = false;
  }, []);
  const stop = useCallback(
    (reason: string, interrupted = false, escapeExit = false) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      generation.current += 1;
      releaseCapture();
      heldRef.current.clear();
      copilotHeld.current = false;
      copilotMembers.current.clear();
      setCopilotDown(false);
      setHeld(new Set());
      setActive(false);
      setCapture("Keyboard capture is off");
      setExitReason(reason);
      setEscapeCount(escapeExit ? 3 : 0);
      escapeSequence.current = { count: 0, lastAt: 0 };
      if (interrupted) setInterruptions((n) => n + 1);
      // Focus is restored only while the window still owns focus; never steal it back.
      if (document.hasFocus())
        requestAnimationFrame(() => startButton.current?.focus());
    },
    [releaseCapture],
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeRef.current = false;
      generation.current += 1;
      releaseCapture();
    };
  }, [releaseCapture]);
  useEffect(() => {
    if (lastProfile.current === profile.id) return;
    lastProfile.current = profile.id;
    setGenericConfirmed(false);
    onConfirmAssessment?.(undefined);
    stop("Keyboard changed. Start again to test this layout.");
    setSeen({});
    setHeld(new Set());
    heldRef.current.clear();
    setPeakHeld(0);
    setCopilot({ presses: 0, released: false });
    setStandaloneModifiers(new Set());
    setCompoundModifiers(new Set());
    setEscapeCount(0);
    setLastKey("—");
  }, [profile.id, stop, onConfirmAssessment]);
  useEffect(() => {
    if (!active) return;
    const refresh = () => {
      deadline.current = Date.now() + KEYBOARD_IDLE_MS;
      setSecondsLeft(60);
    };
    const down = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      refresh();
      const code = keyIdentifier(event);
      const copilotChord = isCopilotShortcut(event);
      setLastKey(
        copilotChord
          ? "Copilot / AI shortcut"
          : event.key === " "
            ? "Space"
            : event.key.slice(0, 32),
      );
      heldRef.current.add(code);
      if (copilotChord) {
        for (const member of heldRef.current) {
          if (isCopilotModifier(member)) copilotMembers.current.add(member);
        }
        const members = [...copilotMembers.current];
        setCompoundModifiers((old) => new Set([...old, ...members]));
        if (!event.repeat && !copilotHeld.current)
          setCopilot((old) => ({
            presses: Math.min(100000, old.presses + 1),
            released: old.released,
          }));
        copilotHeld.current = true;
        setCopilotDown(true);
      }
      setHeld(new Set(heldRef.current));
      setPeakHeld((n) => Math.max(n, heldRef.current.size));
      if (!event.repeat)
        setSeen((old) => {
          if (!old[code] && Object.keys(old).length >= 180) return old;
          return {
            ...old,
            [code]: {
              presses: Math.min(100000, (old[code]?.presses ?? 0) + 1),
              released: old[code]?.released ?? false,
            },
          };
        });
      const next = nextEscapeSequence(
        escapeSequence.current,
        event.key === "Escape" ? "Escape" : code,
        event.repeat,
        Date.now(),
      );
      escapeSequence.current = next;
      setEscapeCount(next.count);
      if (next.count >= 3)
        stop(
          "Exited after three Escape presses. Your key results are kept.",
          false,
          true,
        );
    };
    const up = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      refresh();
      const code = keyIdentifier(event);
      if ((code === "F23" || event.key === "F23") && copilotHeld.current) {
        copilotHeld.current = false;
        setCopilotDown(false);
        setCopilot((old) => ({ ...old, released: true }));
        setLastKey("Copilot / AI shortcut");
      }
      if (
        isCopilotModifier(code) &&
        heldRef.current.has(code) &&
        !copilotMembers.current.has(code)
      ) {
        setStandaloneModifiers((old) => new Set(old).add(code));
      }
      copilotMembers.current.delete(code);
      heldRef.current.delete(code);
      setHeld(new Set(heldRef.current));
      setSeen((old) =>
        old[code] ? { ...old, [code]: { ...old[code], released: true } } : old,
      );
    };
    const blur = () =>
      stop(
        "Paused because this window lost focus. Click Start to continue.",
        true,
      );
    const hidden = () => {
      if (document.hidden) blur();
    };
    const fullscreenChanged = () => {
      if (
        ownsFullscreen.current &&
        document.fullscreenElement !== shell.current
      )
        stop("Exited full screen. Your key results are kept.");
    };
    const focusMoved = (event: FocusEvent) => {
      if (
        activeRef.current &&
        event.target instanceof Node &&
        !shell.current?.contains(event.target)
      ) {
        stop("Paused because focus moved outside the keyboard test.", true);
      }
    };
    const timer = window.setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setSecondsLeft(left);
      if (left === 0)
        stop("Exited after 1 minute of inactivity. Your key results are kept.");
      if (
        escapeSequence.current.count &&
        Date.now() - escapeSequence.current.lastAt > 2000
      ) {
        escapeSequence.current = { count: 0, lastAt: 0 };
        setEscapeCount(0);
      }
    }, 250);
    window.addEventListener("keydown", down, true);
    window.addEventListener("keyup", up, true);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("fullscreenchange", fullscreenChanged);
    document.addEventListener("focusin", focusMoved);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", down, true);
      window.removeEventListener("keyup", up, true);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("fullscreenchange", fullscreenChanged);
      document.removeEventListener("focusin", focusMoved);
    };
  }, [active, stop]);

  async function start() {
    if (activeRef.current) return;
    setGenericConfirmed(false);
    if (generic) onConfirmAssessment?.(undefined);
    const current = ++generation.current;
    activeRef.current = true;
    deadline.current = Date.now() + KEYBOARD_IDLE_MS;
    escapeSequence.current = { count: 0, lastAt: 0 };
    setEscapeCount(0);
    setSecondsLeft(60);
    setExitReason("");
    setCapture("Starting protected capture…");
    setActive(true);
    shell.current?.focus({ preventScroll: true });
    const keyboard = (navigator as KeyboardNavigator).keyboard;
    let full = false;
    try {
      if (shell.current?.requestFullscreen && !document.fullscreenElement) {
        await shell.current.requestFullscreen();
        full = document.fullscreenElement === shell.current;
        if (current !== generation.current || !mounted.current) {
          if (full) void document.exitFullscreen().catch(() => undefined);
          return;
        }
        ownsFullscreen.current = full;
      }
      if (full && keyboard?.lock) {
        try {
          await keyboard.lock();
          if (current !== generation.current || !mounted.current) {
            keyboard.unlock();
            return;
          }
          setCapture(
            "Protected capture · available shortcuts held by this test",
          );
        } catch {
          if (current === generation.current && mounted.current)
            setCapture(
              "Standard capture · some system shortcuts can still open",
            );
        }
      } else if (current === generation.current && mounted.current) {
        setCapture("Standard capture · some system shortcuts can still open");
      }
    } catch {
      if (current === generation.current && mounted.current)
        setCapture("Standard capture · full screen was unavailable");
    }
    if (current === generation.current && mounted.current)
      shell.current?.focus({ preventScroll: true });
  }

  useEvidence(
    onChange,
    {
      ready: generic ? canConfirmGeneric : tested.length > 0,
      automatic: generic
        ? undefined
        : {
            complete,
            summary: complete
              ? `All ${expected.length} core keys sent press and release events.`
              : `${completed} of ${expected.length} core keys pressed and released.`,
          },
      facts: [
        fact(
          "keyboard.layout",
          "Selected keyboard reference",
          profile.name,
          "US English manufacturer reference; not proof of the connected keyboard model.",
          "user_provided",
        ),
        fact(
          "keyboard.profile_id",
          "Keyboard profile ID",
          profile.id,
          undefined,
          "user_provided",
        ),
        fact(
          "keyboard.distinct",
          "Distinct physical key codes received",
          tested.filter((c) => !c.startsWith("Unidentified-")).length,
        ),
        fact(
          "keyboard.fallbacks",
          "Distinct key values without physical codes",
          tested.filter((c) => c.startsWith("Unidentified-")).length,
          "These events do not identify a physical key position.",
        ),
        fact(
          "keyboard.release_count",
          "Key codes with a release event",
          Object.values(seen).filter((k) => k.released).length,
        ),
        ...(!generic
          ? [
              fact(
                "keyboard.core_complete",
                "Core keys pressed and released",
                completed,
              ),
              fact(
                "keyboard.core_total",
                "Core keys in selected reference",
                expected.length,
                "Fn, system, power, screenshot and F-row keys are optional because their events may be intercepted.",
              ),
              fact(
                "keyboard.untested",
                "Core keys not yet pressed and released",
                remaining.length,
                "Untested keys are not automatically defective.",
              ),
            ]
          : [
              fact(
                "keyboard.response_count",
                "Distinct key responses pressed and released",
                responses,
                "Observed browser input only. The reference drawing does not establish which physical keys this keyboard has.",
              ),
            ]),
        fact("keyboard.held", "Keys held at the last observation", held.size),
        fact(
          "keyboard.copilot.shortcut_count",
          "Copilot / AI shortcut events",
          copilot.presses,
          "Recognized Windows + Shift + F23 input. This identifies the logical shortcut, not which physical key produced it.",
        ),
        fact(
          "keyboard.copilot.released",
          "Copilot shortcut release received",
          copilot.released,
        ),
        fact(
          "keyboard.copilot.modifiers",
          "Modifier codes also seen in Copilot shortcuts",
          [...compoundModifiers].join(", ") || "None",
          "Raw modifier events remain in this report. They count toward core-key coverage only after an independent press and release.",
        ),
        fact(
          "keyboard.peak_held",
          "Maximum simultaneous key codes observed",
          peakHeld,
          "Observed sample only; not a keyboard rollover rating.",
        ),
        fact(
          "keyboard.focus_interruptions",
          "Focus interruptions",
          interruptions,
        ),
        ...tested.map((code) =>
          fact(
            `keyboard.key.${code}`,
            code,
            `${seen[code].presses} press${seen[code].presses === 1 ? "" : "es"}; ${seen[code].released ? "release received" : "release not received"}`,
          ),
        ),
      ],
      explanation:
        "Press and release events were received during explicit keyboard capture. Coverage confirms browser input only. Firmware, Fn, reserved OS shortcuts, key feel and intermittent faults need separate assessment.",
    },
    [
      seen,
      held,
      profile.id,
      interruptions,
      peakHeld,
      copilot,
      standaloneModifiers,
      compoundModifiers,
      active,
    ],
  );

  function renderKey(k: KeySpec) {
    if (k.stack)
      return (
        <span
          className="td-key-stack"
          style={{ flex: k.width ?? 1 }}
          key={k.code}
        >
          {k.stack.map(renderKey)}
        </span>
      );
    const state =
      k.code === "Copilot"
        ? copilotDown
          ? "pressed"
          : copilot.released
            ? "released"
            : "unseen"
        : held.has(k.code) && !copilotMembers.current.has(k.code)
          ? "pressed"
          : keyReleased(k.code)
            ? "released"
            : compoundModifiers.has(k.code)
              ? "compound"
              : "unseen";
    return (
      <span
        key={k.code}
        data-code={k.code}
        data-key-state={state}
        title={`${k.label}${k.optional ? " · optional/system key" : ""}${state === "released" ? " · press and release received" : state === "compound" ? " · observed as part of Copilot; press this key separately to test it" : ""}`}
        className={`td-key ${k.optional ? "optional" : ""} ${k.half ? "half" : ""} ${state === "released" ? "seen" : ""} ${state === "compound" ? "compound" : ""} ${state === "pressed" ? "held" : ""}`}
        style={{ flex: k.width ?? 1 }}
      >
        {k.secondary && <small>{k.secondary}</small>}
        <span>{k.label}</span>
        {state === "released" && <Check className="td-key-check" size={9} />}
      </span>
    );
  }
  return (
    <div className="td-module td-keyboard-module">
      <div className="td-toolbar">
        <label>
          Keyboard model · US English
          <select
            value={profile.id}
            disabled={active}
            onChange={(e) => {
              setLocalProfile(e.target.value);
              onProfileChange?.(e.target.value);
            }}
          >
            <option value={GENERIC_KEYBOARD_PROFILE.id}>
              Other keyboard · US ANSI reference
            </option>
            {DEVICE_PROFILES.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="td-help">
        Your layout choice is remembered in this browser.
      </p>
      {generic && (
        <p className="td-help">
          This drawing is a reference, not a list of keys your keyboard must
          have. Press every physical key on your keyboard. Extra keys appear
          below the drawing. Then exit and confirm that all your keys responded.
        </p>
      )}
      <div
        ref={shell}
        tabIndex={-1}
        className={`td-keyboard-capture ${active ? "is-capturing" : ""}`}
        role="group"
        aria-label="Keyboard test area"
        onPointerMove={() => {
          if (activeRef.current)
            deadline.current = Date.now() + KEYBOARD_IDLE_MS;
        }}
        onPointerDown={() => {
          if (activeRef.current)
            deadline.current = Date.now() + KEYBOARD_IDLE_MS;
        }}
        onWheel={() => {
          if (activeRef.current)
            deadline.current = Date.now() + KEYBOARD_IDLE_MS;
        }}
      >
        <div className="td-capture-top">
          <div>
            <span className="td-eyebrow">
              {active ? "TEST MODE IS ON" : "READY WHEN YOU ARE"}
            </span>
            <h3>
              {active
                ? "Press each key on your real keyboard"
                : "Click Start, then press your keys"}
            </h3>
          </div>
          {active && (
            <button
              className="td-capture-exit"
              onClick={() =>
                stop("Exited with the mouse. Your key results are kept.")
              }
            >
              <X size={18} />
              Exit keyboard test
            </button>
          )}
        </div>
        {(active || escapeCount === 3) && (
          <div
            className="td-escape-feedback"
            aria-label={`Escape progress: ${escapeCount} of 3`}
          >
            <span>
              {escapeCount === 3
                ? "Keyboard test exited"
                : "Press Esc 3 times to exit"}
            </span>
            <span className="td-escape-dots" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <i
                  key={n}
                  className="td-escape-dot"
                  data-filled={escapeCount >= n ? "true" : "false"}
                />
              ))}
            </span>
          </div>
        )}
        {active ? (
          <div className="td-capture-instructions">
            <LockKeyhole size={18} />
            <div>
              <strong>{capture}</strong>
              <p>
                Exit: press <kbd>Esc</kbd> three times quickly, click Exit, or
                wait 1 minute without input.
              </p>
            </div>
            <span className="td-idle-time">{secondsLeft}s idle exit</span>
          </div>
        ) : (
          <div className="td-capture-start">
            <Keyboard size={34} />
            <div>
              <strong>Your keyboard is waiting for you.</strong>
              <p>
                Press and release keys to turn them green. Clicking the drawing
                does not test a key.
              </p>
            </div>
            <button
              ref={startButton}
              className="primary"
              onClick={() => void start()}
            >
              <MousePointer2 size={18} />
              Start keyboard test
            </button>
          </div>
        )}
        {active && (
          <p className="td-capture-limit">
            Windows/Command and reserved OS shortcuts may still open. Fn and
            shaded keys are optional; try Fn + F1–F12 to send function-key
            events. Your browser may exit on the first Escape.
          </p>
        )}
        {keys.some((k) => k.code === "Copilot") && (
          <p className="td-copilot-note" role="status">
            {copilot.presses > 0
              ? "Copilot / AI shortcut recognized. Its Win + Shift events are kept separately; press those physical keys on their own to test them."
              : "Your AI key is tested as one Copilot shortcut. Windows may intercept it; if it stays unmarked, it remains unverified."}
          </p>
        )}
        <div
          className={`td-keyboard ${active ? "is-focused" : ""}`}
          aria-label={`${profile.name} keyboard reference`}
        >
          {profile.keyboard.rows.map((row, n) => (
            <div
              className={`td-key-row ${n === 0 ? "function-row" : ""}`}
              key={n}
            >
              {row.map(renderKey)}
            </div>
          ))}
        </div>
        {generic && extraCodes.length > 0 && (
          <div className="td-extra-keys" aria-label="Additional key responses">
            <strong>Additional key responses</strong>
            <div>
              {extraCodes.map((code) => {
                const state = held.has(code)
                  ? "pressed"
                  : keyReleased(code)
                    ? "released"
                    : "unseen";
                return (
                  <span
                    key={code}
                    className={`td-extra-key ${state}`}
                    data-code={code}
                    data-key-state={state}
                    title={code}
                  >
                    {state === "released" && <Check size={13} />}
                    {code.startsWith("Unidentified-") ? "Unmapped key" : code}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        <div className="td-keyboard-progress">
          <div>
            <strong>
              {generic ? responses : completed}{" "}
              {!generic && <span>/ {expected.length}</span>}
            </strong>
            <span>
              {generic
                ? "key responses pressed + released"
                : "core keys pressed + released"}
            </span>
          </div>
          {!generic && <progress value={completed} max={expected.length} />}
          <div className="td-key-legend">
            <span>
              <i />
              Not yet tested
            </span>
            <span>
              <i className="green" />
              Received
            </span>
            <span>
              <i className="gray" />
              Optional
            </span>
          </div>
        </div>
        <div className="td-live" aria-live="polite">
          {active
            ? escapeCount
              ? `Escape ${escapeCount} of 3 — press again to exit`
              : "Listening for keys"
            : "Keyboard capture is off"}{" "}
          · Last key: <strong>{lastKey}</strong>
          {held.size > 0 ? ` · ${held.size} held` : ""}
        </div>
        {complete && (
          <div className="td-keyboard-success">
            <Check size={19} />
            <span>
              All core keys responded. You can exit and save the automatic
              result.
            </span>
          </div>
        )}
        {!active && exitReason && (
          <p className="td-exit-reason" role="status">
            {exitReason}
          </p>
        )}
      </div>
      {!active && (
        <>
          {generic ? (
            <div className="td-generic-confirm">
              <div>
                <strong>Finished testing the keys you have?</strong>
                <p>
                  Confirm only after you pressed every physical key and saw each
                  respond. Unused positions in the reference can stay blank.
                </p>
              </div>
              <button
                className="primary"
                disabled={!canConfirmGeneric || genericConfirmed}
                onClick={() => {
                  setGenericConfirmed(true);
                  onConfirmAssessment?.("looks_good");
                }}
              >
                All my keys responded
              </button>
              {genericConfirmed && (
                <p role="status">
                  Your confirmation is ready. Save below to continue.
                </p>
              )}
            </div>
          ) : (
            <details className="td-keyboard-details">
              <summary>
                {remaining.length} core keys still need a press and release
              </summary>
              <p>
                {remaining.map((k) => k.label).join(", ") ||
                  "All core keys received."}
              </p>
              <p>
                {keys.filter((k) => k.optional).length} shaded keys are
                optional. A missing event may be intercepted by your browser or
                system.
              </p>
            </details>
          )}
          <p className="td-help">{profile.keyboard.note}</p>
        </>
      )}
    </div>
  );
}
