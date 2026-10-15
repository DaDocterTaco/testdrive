import { useEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { fact, useEvidence } from "./shared";
import type { ModuleProps } from "./shared";

const rows = [
  [
    "Escape",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "F10",
    "F11",
    "F12",
  ],
  [
    "Backquote",
    "Digit1",
    "Digit2",
    "Digit3",
    "Digit4",
    "Digit5",
    "Digit6",
    "Digit7",
    "Digit8",
    "Digit9",
    "Digit0",
    "Minus",
    "Equal",
    "Backspace",
  ],
  [
    "Tab",
    "KeyQ",
    "KeyW",
    "KeyE",
    "KeyR",
    "KeyT",
    "KeyY",
    "KeyU",
    "KeyI",
    "KeyO",
    "KeyP",
    "BracketLeft",
    "BracketRight",
    "Backslash",
  ],
  [
    "CapsLock",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyF",
    "KeyG",
    "KeyH",
    "KeyJ",
    "KeyK",
    "KeyL",
    "Semicolon",
    "Quote",
    "Enter",
  ],
  [
    "ShiftLeft",
    "KeyZ",
    "KeyX",
    "KeyC",
    "KeyV",
    "KeyB",
    "KeyN",
    "KeyM",
    "Comma",
    "Period",
    "Slash",
    "ShiftRight",
  ],
  [
    "ControlLeft",
    "MetaLeft",
    "AltLeft",
    "Space",
    "AltRight",
    "MetaRight",
    "ContextMenu",
    "ControlRight",
    "ArrowLeft",
    "ArrowDown",
    "ArrowUp",
    "ArrowRight",
  ],
];
const labels: Record<string, string> = {
  Escape: "Esc",
  Backquote: "`",
  Minus: "−",
  Equal: "=",
  Backspace: "⌫",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  CapsLock: "Caps",
  Semicolon: ";",
  Quote: "'",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  Comma: ",",
  Period: ".",
  Slash: "/",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl",
  MetaLeft: "Win/⌘",
  MetaRight: "Win/⌘",
  AltLeft: "Alt",
  AltRight: "Alt",
  ContextMenu: "Menu",
  ArrowLeft: "←",
  ArrowDown: "↓",
  ArrowUp: "↑",
  ArrowRight: "→",
  Space: "Space",
};
const expected = rows.flat();
function keyIdentifier(event: ReactKeyboardEvent) {
  if (event.code) return event.code;
  // Key values can contain punctuation or Unicode. Encode them into a bounded
  // schema-safe identifier without pretending they identify a physical key.
  return `Unidentified-${
    Array.from(event.key)
      .slice(0, 12)
      .map((c) => c.codePointAt(0)!.toString(16))
      .join("-") || "unknown"
  }`;
}

export function KeyboardTest({ onChange }: ModuleProps) {
  const [layout, setLayout] = useState("ansi");
  const [seen, setSeen] = useState<
    Record<string, { presses: number; released: boolean }>
  >({});
  const [held, setHeld] = useState<Set<string>>(new Set());
  const [character, setCharacter] = useState("—");
  const [focused, setFocused] = useState(false);
  const [blurs, setBlurs] = useState(0);
  const area = useRef<HTMLDivElement>(null);
  const tested = Object.keys(seen);
  useEvidence(
    onChange,
    {
      ready: tested.length > 0,
      facts: [
        fact(
          "keyboard.layout",
          "Selected layout",
          layout,
          undefined,
          "user_provided",
        ),
        fact(
          "keyboard.distinct",
          "Distinct physical key codes received",
          tested.filter((code) => !code.startsWith("Unidentified-")).length,
        ),
        fact(
          "keyboard.fallbacks",
          "Distinct key values without physical codes",
          tested.filter((code) => code.startsWith("Unidentified-")).length,
          "These events do not identify a physical key position.",
        ),
        fact(
          "keyboard.release_count",
          "Key codes with a release event",
          Object.values(seen).filter((k) => k.released).length,
        ),
        fact("keyboard.held", "Keys held at the last observation", held.size),
        fact("keyboard.focus_interruptions", "Focus interruptions", blurs),
        ...(layout === "ansi"
          ? [
              fact(
                "keyboard.untested",
                "Expected ANSI keys not yet received",
                expected.filter((c) => !seen[c]).length,
                "Unpressed or operating-system-intercepted keys are untested, not broken.",
              ),
            ]
          : []),
        ...tested.map((code) =>
          fact(
            `keyboard.key.${code}`,
            code,
            `${seen[code].presses} press${seen[code].presses === 1 ? "" : "es"}; ${seen[code].released ? "release received" : "release not received"}`,
          ),
        ),
      ],
      explanation:
        "Keyboard events were received inside the focused test area. System shortcuts, firmware keys and Fn behavior are not fully testable in a web page.",
    },
    [seen, held, layout, blurs],
  );
  function keyDown(event: ReactKeyboardEvent) {
    const code = keyIdentifier(event);
    setCharacter(event.key === " " ? "Space" : event.key);
    setHeld((old) => new Set(old).add(code));
    if (!event.repeat)
      setSeen((old) => ({
        ...old,
        [code]: {
          presses: (old[code]?.presses ?? 0) + 1,
          released: old[code]?.released ?? false,
        },
      }));
    if (event.key === "Escape") {
      area.current?.blur();
      return;
    }
    if (event.key !== "Tab" && !event.ctrlKey && !event.metaKey)
      event.preventDefault();
  }
  function keyUp(event: ReactKeyboardEvent) {
    const code = keyIdentifier(event);
    setHeld((old) => {
      const next = new Set(old);
      next.delete(code);
      return next;
    });
    setSeen((old) =>
      old[code] ? { ...old, [code]: { ...old[code], released: true } } : old,
    );
  }
  return (
    <div className="td-module">
      <div className="td-toolbar">
        <label>
          Keyboard layout{" "}
          <select value={layout} onChange={(e) => setLayout(e.target.value)}>
            <option value="ansi">ANSI baseline</option>
            <option value="other">Other layout / external keyboard</option>
          </select>
        </label>
        <span className="td-stat">{tested.length} keys received</span>
      </div>
      <p>
        Click the keyboard below, then press and release your keys. Green means
        a real key event arrived. Tab and Escape let you leave the test.
      </p>
      <div
        ref={area}
        className={`td-keyboard ${focused ? "is-focused" : ""}`}
        tabIndex={0}
        role="group"
        aria-label="Keyboard test area. Press keys here; Escape or Tab exits."
        onKeyDown={keyDown}
        onKeyUp={keyUp}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setHeld(new Set());
          setBlurs((v) => v + 1);
        }}
      >
        {rows.map((row, i) => (
          <div className="td-key-row" key={i}>
            {row.map((code) => (
              <span
                className={`td-key ${seen[code] ? "seen" : ""} ${held.has(code) ? "held" : ""} ${code === "Space" ? "space" : ""}`}
                key={code}
              >
                {labels[code] ?? code.replace("Key", "").replace("Digit", "")}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="td-live" aria-live="polite">
        {focused ? "Listening for keys" : "Click the keyboard to begin"} · Last
        character: <strong>{character}</strong>
      </div>
      {layout === "ansi" && (
        <details>
          <summary>
            {expected.filter((c) => !seen[c]).length} keys remain untested
          </summary>
          <p>
            {expected
              .filter((c) => !seen[c])
              .map(
                (c) => labels[c] ?? c.replace("Key", "").replace("Digit", ""),
              )
              .join(", ")}
          </p>
        </details>
      )}
      <p className="td-help">
        The layout is a reference. Browser and system shortcuts, Fn and some
        special keys may never reach this page. This check does not test key
        chatter.
      </p>
    </div>
  );
}

export function PointerTest({ onChange }: ModuleProps) {
  const [source, setSource] = useState("Trackpad");
  const [moves, setMoves] = useState(0);
  const [clicks, setClicks] = useState({
    left: 0,
    right: 0,
    double: 0,
    wheel: 0,
    drag: 0,
  });
  const [point, setPoint] = useState({ x: 50, y: 50 });
  const [dragging, setDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState({ x: 16, y: 50 });
  const area = useRef<HTMLDivElement>(null);
  const dragId = useRef<number | null>(null);
  useEvidence(
    onChange,
    {
      ready: moves > 0 || Object.values(clicks).some((v) => v > 0),
      facts: [
        fact(
          "pointer.source",
          "Selected input source",
          source,
          undefined,
          "user_provided",
        ),
        fact("pointer.moves", "Pointer movement samples", moves),
        fact("pointer.primary", "Primary clicks", clicks.left),
        fact("pointer.secondary", "Secondary clicks", clicks.right),
        fact("pointer.double", "Double clicks", clicks.double),
        fact("pointer.wheel", "Wheel events", clicks.wheel),
        fact("pointer.drag", "Completed target drags", clicks.drag),
      ],
      explanation:
        "These are browser input events. The selected source identifies what you intended to test; the page cannot independently distinguish a mouse from a trackpad.",
    },
    [moves, clicks, source],
  );
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setClicks((c) => ({ ...c, wheel: c.wheel + 1 }));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  return (
    <div className="td-module">
      <div className="td-toolbar">
        <label>
          Input being tested{" "}
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option>Trackpad</option>
            <option>Mouse</option>
            <option>Other pointer</option>
          </select>
        </label>
        <span className="td-stat">{moves} movement samples</span>
      </div>
      <p>
        Move around the surface, click and right-click, scroll, then drag the
        green handle into the dashed target.
      </p>
      <div
        className="td-pointer-area"
        ref={area}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          if (e.button === 2) setClicks((c) => ({ ...c, right: c.right + 1 }));
        }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const p = {
            x: Math.max(
              0,
              Math.min(100, ((e.clientX - r.left) / r.width) * 100),
            ),
            y: Math.max(
              0,
              Math.min(100, ((e.clientY - r.top) / r.height) * 100),
            ),
          };
          setMoves((v) => v + 1);
          setPoint(p);
          if (dragId.current === e.pointerId) setDragPoint(p);
        }}
        onPointerUp={(e) => {
          if (dragId.current === e.pointerId) {
            const r = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width) * 100;
            const y = ((e.clientY - r.top) / r.height) * 100;
            if (x >= 72 && x <= 94 && y >= 28 && y <= 72)
              setClicks((c) => ({ ...c, drag: c.drag + 1 }));
            dragId.current = null;
            setDragging(false);
            setDragPoint({ x: 16, y: 50 });
          }
        }}
        onPointerCancel={() => {
          dragId.current = null;
          setDragging(false);
          setDragPoint({ x: 16, y: 50 });
        }}
        onClick={() => setClicks((c) => ({ ...c, left: c.left + 1 }))}
        onDoubleClick={() => setClicks((c) => ({ ...c, double: c.double + 1 }))}
      >
        <span
          className="td-pointer-dot"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        />
        <span className="td-drop-target">Drop here</span>
        <button
          className={`td-drag-handle ${dragging ? "dragging" : ""}`}
          style={{ left: `${dragPoint.x}%`, top: `${dragPoint.y}%` }}
          aria-label="Draggable input test handle"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            dragId.current = e.pointerId;
            setDragging(true);
            area.current?.setPointerCapture(e.pointerId);
          }}
        >
          Drag me
        </button>
        <span className="td-surface-label">
          Move · click · right-click · scroll
        </span>
      </div>
      <div className="td-metrics">
        {[
          ["Primary", clicks.left],
          ["Secondary", clicks.right],
          ["Double-click", clicks.double],
          ["Scroll", clicks.wheel],
          ["Drag complete", clicks.drag],
        ].map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <p className="td-help">
        System gestures may be intercepted before they reach the browser. Scroll
        direction is a preference, not a defect.
      </p>
    </div>
  );
}

export function TouchTest({ onChange }: ModuleProps) {
  const area = useRef<HTMLDivElement>(null);
  const active = useRef(new Set<number>());
  const [cells, setCells] = useState<Set<number>>(new Set());
  const [maxTouches, setMaxTouches] = useState(0);
  const [samples, setSamples] = useState(0);
  const [priorCoverage, setPriorCoverage] = useState<number[]>([]);
  const coverage = useRef(0);
  const [cancelled, setCancelled] = useState(0);
  const [resizes, setResizes] = useState(0);
  const [paused, setPaused] = useState(false);
  const size = useRef("");
  useEffect(() => {
    if (!area.current) return;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      const next = `${Math.round(r.width)}:${Math.round(r.height)}`;
      if (size.current && size.current !== next) {
        const previous = coverage.current;
        setPaused(true);
        setPriorCoverage((p) => [...p, previous].slice(-20));
        setCells(new Set());
        coverage.current = 0;
        active.current.clear();
        setResizes((n) => n + 1);
      }
      size.current = next;
    });
    observer.observe(area.current);
    const hide = () => {
      if (document.hidden) {
        setPaused(true);
        active.current.clear();
        setCancelled((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", hide);
      active.current.clear();
    };
  }, []);
  useEvidence(
    onChange,
    {
      ready: samples > 0,
      facts: [
        fact(
          "touch.coverage",
          "Touched areas in the current grid",
          cells.size,
          "60 cells cover only the visible test area.",
        ),
        fact("touch.total", "Areas in test grid", 60),
        fact("touch.samples", "Actual touch samples received", samples),
        fact(
          "touch.max",
          "Maximum simultaneous touches observed",
          maxTouches,
          "Observed from active touch pointer IDs, not a reported hardware capability.",
        ),
        fact(
          "touch.cancelled",
          "Touch interruptions or cancellations",
          cancelled,
        ),
        fact("touch.rebuilds", "Grid resets after size changes", resizes),
        fact(
          "touch.previous_grids",
          "Coverage counts before grid resets",
          priorCoverage.join(", ") || "No previous grid",
          "Each count belongs to a separate grid; counts cannot be combined.",
        ),
        fact(
          "touch.uncovered",
          "Areas remaining in the current grid",
          60 - cells.size,
          "Uncovered areas are untested, not automatically defective.",
        ),
      ],
      explanation:
        "Coverage is based on actual touch samples without interpolation. Browser chrome and system UI are outside this test.",
    },
    [cells, maxTouches, samples, cancelled, resizes, priorCoverage],
  );
  function sample(e: ReactPointerEvent<HTMLDivElement>) {
    if (paused || e.pointerType !== "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const native = e.nativeEvent;
    const events =
      typeof native.getCoalescedEvents === "function"
        ? native.getCoalescedEvents()
        : [];
    const actual = events.length ? events : [native];
    const hits = actual
      .filter(
        (p) =>
          p.clientX >= r.left &&
          p.clientX < r.right &&
          p.clientY >= r.top &&
          p.clientY < r.bottom,
      )
      .map(
        (p) =>
          Math.floor(((p.clientY - r.top) / r.height) * 10) * 6 +
          Math.floor(((p.clientX - r.left) / r.width) * 6),
      );
    if (hits.length) {
      setCells((old) => {
        const next = new Set([...old, ...hits]);
        coverage.current = next.size;
        return next;
      });
      setSamples((n) => n + hits.length);
    }
  }
  return (
    <div className="td-module">
      <div className="td-toolbar">
        <span className="td-stat">{cells.size} / 60 areas touched</span>
        <span className="td-stat">
          {maxTouches} simultaneous {maxTouches === 1 ? "touch" : "touches"}
        </span>
        <button
          onClick={() => {
            setPriorCoverage((p) => [...p, cells.size].slice(-20));
            setCells(new Set());
            coverage.current = 0;
            active.current.clear();
            setPaused(false);
          }}
        >
          Reset grid
        </button>
      </div>
      <p>
        Sweep your finger across every area. Then place several fingers on the
        grid at once. Only real touch input fills a cell.
      </p>
      {paused && (
        <div className="td-notice">
          The test paused after a size change or interruption. Coverage resets
          when the grid changes.{" "}
          <button onClick={() => setPaused(false)}>Continue test</button>
        </div>
      )}
      <div
        ref={area}
        className={`td-touch-grid ${paused ? "paused" : ""}`}
        aria-label="Touch test grid with 60 areas"
        onPointerDown={(e) => {
          if (paused || e.pointerType !== "touch") return;
          e.currentTarget.setPointerCapture(e.pointerId);
          active.current.add(e.pointerId);
          setMaxTouches((n) => Math.max(n, active.current.size));
          sample(e);
        }}
        onPointerMove={(e) => {
          if (active.current.has(e.pointerId)) sample(e);
        }}
        onPointerUp={(e) => {
          sample(e);
          active.current.delete(e.pointerId);
        }}
        onPointerCancel={(e) => {
          active.current.delete(e.pointerId);
          setCancelled((n) => n + 1);
        }}
      >
        {Array.from({ length: 60 }, (_, i) => (
          <span key={i} className={cells.has(i) ? "touched" : ""}>
            {cells.has(i) ? "✓" : ""}
          </span>
        ))}
      </div>
      <p className="td-help">
        Test area only. Untouched areas may simply need another sweep. Mouse
        input does not count. Rotation or resizing clears coverage for the newly
        positioned grid.
      </p>
    </div>
  );
}
