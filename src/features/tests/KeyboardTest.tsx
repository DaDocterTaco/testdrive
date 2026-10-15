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
}: ModuleProps) {
  const [localProfile, setLocalProfile] = useState(
    profileId ?? GENERIC_KEYBOARD_PROFILE.id,
  );
  const profile =
    getDeviceProfile(profileId ?? localProfile) ?? GENERIC_KEYBOARD_PROFILE;
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
  const completed = expected.filter((k) => seen[k.code]?.released).length;
  const remaining = expected.filter((k) => !seen[k.code]?.released);
  const complete = completed === expected.length;

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
    (reason: string, interrupted = false) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      generation.current += 1;
      releaseCapture();
      heldRef.current.clear();
      setHeld(new Set());
      setActive(false);
      setCapture("Keyboard capture is off");
      setExitReason(reason);
      setEscapeCount(0);
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
    stop("Keyboard changed. Start again to test this layout.");
    setSeen({});
    setHeld(new Set());
    heldRef.current.clear();
    setPeakHeld(0);
    setLastKey("—");
  }, [profile.id, stop]);
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
      setLastKey(event.key === " " ? "Space" : event.key.slice(0, 32));
      heldRef.current.add(code);
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
        stop("Exited after three Escape presses. Your key results are kept.");
    };
    const up = (event: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (event.cancelable) event.preventDefault();
      event.stopPropagation();
      refresh();
      const code = keyIdentifier(event);
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
      ready: tested.length > 0,
      automatic: {
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
        fact("keyboard.held", "Keys held at the last observation", held.size),
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
    [seen, held, profile.id, interruptions, peakHeld],
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
    const state = held.has(k.code)
      ? "pressed"
      : seen[k.code]?.released
        ? "released"
        : "unseen";
    return (
      <span
        key={k.code}
        data-code={k.code}
        data-key-state={state}
        title={`${k.label}${k.optional ? " · optional/system key" : ""}${state === "released" ? " · press and release received" : ""}`}
        className={`td-key ${k.optional ? "optional" : ""} ${k.half ? "half" : ""} ${state === "released" ? "seen" : ""} ${state === "pressed" ? "held" : ""}`}
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
      {profile.id === GENERIC_KEYBOARD_PROFILE.id && (
        <p className="td-help">
          Choose your laptop above for matching key positions, or use this US
          reference for another keyboard.
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
        <div className="td-keyboard-progress">
          <div>
            <strong>
              {completed} <span>/ {expected.length}</span>
            </strong>
            <span>core keys pressed + released</span>
          </div>
          <progress value={completed} max={expected.length} />
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
          <details className="td-keyboard-details">
            <summary>
              {remaining.length} core keys still need a press and release
            </summary>
            <p>
              {remaining.map((k) => k.label).join(", ") ||
                "All core keys received."}
            </p>
            <p>
              {keys.filter((k) => k.optional).length} shaded keys are optional.
              A missing event may be intercepted by your browser or system.
            </p>
          </details>
          <p className="td-help">{profile.keyboard.note}</p>
        </>
      )}
    </div>
  );
}
