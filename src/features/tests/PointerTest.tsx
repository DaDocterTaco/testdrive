import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { fact, useEvidence } from "./shared";
import type { ModuleProps } from "./shared";
import "./automation.css";

const steps = [
  {
    id: "move-one",
    title: "Move onto the first circle",
    help: "Move your pointer to the green circle. No click needed.",
    x: 22,
    y: 32,
  },
  {
    id: "move-two",
    title: "Now move onto the second circle",
    help: "Follow the circle across the surface.",
    x: 78,
    y: 66,
  },
  {
    id: "primary",
    title: "Click the circle once",
    help: "Use your main mouse button, or tap / click your trackpad.",
    x: 50,
    y: 50,
  },
  {
    id: "double",
    title: "Double-click the circle",
    help: "Click the main button twice, quickly, on the circle.",
    x: 50,
    y: 50,
  },
  {
    id: "secondary",
    title: "Right-click the circle",
    help: "Use the right button, or a two-finger click on your trackpad.",
    x: 50,
    y: 50,
  },
  {
    id: "scroll-down",
    title: "Scroll down over the surface",
    help: "Use the wheel or a two-finger scroll until the arrow changes.",
    x: 50,
    y: 50,
  },
  {
    id: "scroll-up",
    title: "Now scroll up",
    help: "Reverse your scroll direction. Your natural-scroll preference is fine.",
    x: 50,
    y: 50,
  },
  {
    id: "drag",
    title: "Drag the handle into the target",
    help: "Hold the main button, move to the dashed target, then release.",
    x: 80,
    y: 50,
  },
] as const;
const initialCounts = {
  left: 0,
  right: 0,
  double: 0,
  wheel: 0,
  down: 0,
  up: 0,
  drag: 0,
  middle: 0,
};

export function PointerTest({ onChange }: ModuleProps) {
  const [source, setSource] = useState("Trackpad");
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [started, setStarted] = useState(false);
  const [moves, setMoves] = useState(0);
  const [clicks, setClicks] = useState(initialCounts);
  const [point, setPoint] = useState({ x: 50, y: 50 });
  const [dragPoint, setDragPoint] = useState({ x: 18, y: 50 });
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState("");
  const area = useRef<HTMLDivElement>(null);
  const dragId = useRef<number | null>(null);
  const down = useRef<{ button: number; target: boolean } | null>(null);
  const doubleUps = useRef<number[]>([]);
  const state = useRef({ active, step });
  state.current = { active, step };
  const complete = step === steps.length;
  const current = steps[Math.min(step, steps.length - 1)];
  const summary =
    "Movement, main click, double-click, right-click, both scroll directions and drag were received.";
  useEvidence(
    onChange,
    {
      ready: moves > 0 || Object.values(clicks).some((n) => n > 0),
      automatic: { complete, summary },
      facts: [
        fact(
          "pointer.source",
          "Selected input source",
          source,
          undefined,
          "user_provided",
        ),
        fact(
          "pointer.challenge_complete",
          "Guided pointer challenge completed",
          complete,
        ),
        fact("pointer.challenge_steps", "Challenge steps completed", step),
        fact("pointer.moves", "Pointer movement samples", moves),
        fact("pointer.primary", "Primary clicks", clicks.left),
        fact("pointer.secondary", "Secondary clicks", clicks.right),
        fact("pointer.double", "Double clicks", clicks.double),
        fact("pointer.wheel", "Wheel events", clicks.wheel),
        fact("pointer.scroll_down", "Downward scroll events", clicks.down),
        fact("pointer.scroll_up", "Upward scroll events", clicks.up),
        fact("pointer.drag", "Completed target drags", clicks.drag),
        fact(
          "pointer.middle",
          "Optional middle-button events",
          clicks.middle,
          "Not required for trackpads; an untested middle button is not a failure.",
        ),
      ],
      explanation: complete
        ? `${summary} These observations do not establish long-term reliability. Mouse and trackpad events look alike to a browser.`
        : "Follow the highlighted task. Each completed stage is based on input received in the test surface; unfinished stages are untested.",
    },
    [step, moves, clicks, source],
  );
  function advance(expected: number) {
    setStep((s) => (s === expected ? s + 1 : s));
    setHint("");
    if (expected === steps.length - 1) setActive(false);
  }
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!state.current.active || e.ctrlKey) return;
      e.preventDefault();
      // Wheel values can be pixels, text lines (notably Firefox), or pages.
      // Convert to a comparable UI distance before applying the jitter gate.
      const delta =
        e.deltaY *
        (e.deltaMode === 1
          ? 16
          : e.deltaMode === 2
            ? Math.max(1, el.clientHeight)
            : 1);
      if (Math.abs(delta) < 8) return;
      setClicks((c) => ({
        ...c,
        wheel: c.wheel + 1,
        down: c.down + (e.deltaY > 0 ? 1 : 0),
        up: c.up + (e.deltaY < 0 ? 1 : 0),
      }));
      if (state.current.step === 5 && e.deltaY > 0) advance(5);
      if (state.current.step === 6 && e.deltaY < 0) advance(6);
    };
    const pause = () => {
      if (document.hidden) {
        setActive(false);
        setDragging(false);
        dragId.current = null;
        setHint(
          "Paused while this page was in the background. Continue when you are ready.",
        );
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    document.addEventListener("visibilitychange", pause);
    return () => {
      el.removeEventListener("wheel", wheel);
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);
  function position(e: ReactPointerEvent) {
    const r = area.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
    };
  }
  function onTarget(e: ReactPointerEvent) {
    const r = area.current!.getBoundingClientRect();
    return (
      Math.hypot(
        e.clientX - (r.left + (r.width * current.x) / 100),
        e.clientY - (r.top + (r.height * current.y) / 100),
      ) < 42
    );
  }
  function reset() {
    setStep(0);
    setMoves(0);
    setClicks(initialCounts);
    setStarted(true);
    setActive(true);
    setHint("");
    setDragging(false);
    dragId.current = null;
    down.current = null;
    doubleUps.current = [];
    requestAnimationFrame(() =>
      area.current?.scrollIntoView({ block: "center", behavior: "instant" }),
    );
  }
  return (
    <div className="td-module">
      <div className="td-toolbar">
        <label>
          Input being tested{" "}
          <select
            value={source}
            disabled={started && !complete}
            onChange={(e) => {
              setSource(e.target.value);
              setStarted(false);
              setStep(0);
              setMoves(0);
              setClicks(initialCounts);
            }}
          >
            <option>Trackpad</option>
            <option>Mouse</option>
            <option>Other pointer</option>
          </select>
        </label>
        {!started ? (
          <button className="primary" onClick={reset}>
            Start pointer challenge
          </button>
        ) : complete ? (
          <button onClick={reset}>Try challenge again</button>
        ) : (
          <button
            onClick={() => {
              setActive((v) => !v);
              setDragging(false);
              dragId.current = null;
              down.current = null;
            }}
          >
            {active ? "Pause challenge" : "Continue challenge"}
          </button>
        )}
      </div>
      <div
        className={`td-auto-status ${complete ? "is-complete" : ""}`}
        aria-live="polite"
      >
        <span className="td-auto-step">
          {complete ? "✓" : `${step + 1} / ${steps.length}`}
        </span>
        <div>
          <strong>
            {complete
              ? "Pointer challenge complete"
              : !started
                ? "A short follow-the-target challenge"
                : current.title}
          </strong>
          <p>
            {complete
              ? "All eight actions were received. Your observations are ready to save."
              : !started
                ? "We guide you one step at a time and check each action automatically."
                : active
                  ? current.help
                  : "Challenge paused. Choose Continue challenge when you are ready."}
          </p>
        </div>
      </div>
      <div
        className="td-challenge-progress"
        aria-label={`${step} of ${steps.length} pointer steps complete`}
      >
        {steps.map((s, i) => (
          <span
            key={s.id}
            className={
              i < step ? "done" : i === step && active ? "current" : ""
            }
          />
        ))}
      </div>
      <div
        className={`td-pointer-area td-pointer-game ${!active ? "is-paused" : ""}`}
        ref={area}
        data-step={complete ? "complete" : current.id}
        aria-label="Pointer challenge surface"
        onContextMenu={(e) => {
          if (active) e.preventDefault();
        }}
        onPointerMove={(e) => {
          if (!active || e.pointerType === "touch") return;
          const p = position(e);
          setMoves((v) => v + 1);
          setPoint(p);
          if (dragId.current === e.pointerId) setDragPoint(p);
          if (step < 2 && onTarget(e)) advance(step);
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") {
            doubleUps.current = [];
            return;
          }
          if (!active) return;
          down.current = { button: e.button, target: onTarget(e) };
          if (e.button === 2) {
            setClicks((c) => ({ ...c, right: c.right + 1 }));
            if (step === 4 && onTarget(e)) advance(4);
          }
          if (e.button === 1) {
            e.preventDefault();
            setClicks((c) => ({ ...c, middle: c.middle + 1 }));
          }
        }}
        onPointerUp={(e) => {
          if (!active || e.pointerType === "touch") return;
          if (e.button === 0 && down.current?.button === 0) {
            setClicks((c) => ({ ...c, left: c.left + 1 }));
            if (step === 3 && down.current.target && onTarget(e))
              doubleUps.current = [
                ...doubleUps.current,
                performance.now(),
              ].slice(-2);
            if (step === 2 && down.current.target && onTarget(e)) advance(2);
          }
          down.current = null;
          if (dragId.current === e.pointerId) {
            const p = position(e);
            if (p.x >= 69 && p.x <= 93 && p.y >= 28 && p.y <= 72) {
              setClicks((c) => ({ ...c, drag: c.drag + 1 }));
              advance(7);
            } else
              setHint(
                "Nearly there. Keep holding the handle until it is inside the dashed target, then let go.",
              );
            dragId.current = null;
            setDragging(false);
            setDragPoint({ x: 18, y: 50 });
            if (area.current?.hasPointerCapture(e.pointerId))
              area.current.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={() => {
          dragId.current = null;
          down.current = null;
          setDragging(false);
          setDragPoint({ x: 18, y: 50 });
        }}
        onDoubleClick={(e) => {
          if (
            !active ||
            step !== 3 ||
            e.detail < 2 ||
            e.button !== 0 ||
            doubleUps.current.length !== 2 ||
            performance.now() - doubleUps.current[1] > 150 ||
            doubleUps.current[1] - doubleUps.current[0] > 1500
          )
            return;
          const r = area.current!.getBoundingClientRect();
          if (
            Math.hypot(
              e.clientX - (r.left + r.width / 2),
              e.clientY - (r.top + r.height / 2),
            ) < 42
          ) {
            setClicks((c) => ({ ...c, double: c.double + 1 }));
            advance(3);
          }
        }}
      >
        {active && (
          <>
            <span
              className="td-pointer-dot"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            />
            {step < 7 ? (
              <span
                className="td-game-target"
                role="img"
                aria-label="Pointer target"
                style={{ left: `${current.x}%`, top: `${current.y}%` }}
              >
                {step === 5
                  ? "↓"
                  : step === 6
                    ? "↑"
                    : step < 2
                      ? step + 1
                      : step === 3
                        ? "2×"
                        : step === 4
                          ? "R"
                          : "1×"}
              </span>
            ) : (
              <>
                <span className="td-drop-target">Drop here</span>
                <button
                  className={`td-drag-handle ${dragging ? "dragging" : ""}`}
                  style={{ left: `${dragPoint.x}%`, top: `${dragPoint.y}%` }}
                  aria-label="Draggable input test handle"
                  onPointerDown={(e) => {
                    if (e.button !== 0 || e.pointerType === "touch") return;
                    e.preventDefault();
                    dragId.current = e.pointerId;
                    setDragging(true);
                    area.current?.setPointerCapture(e.pointerId);
                  }}
                >
                  Drag me
                </button>
              </>
            )}
          </>
        )}
        {!active && (
          <div className="td-game-overlay">
            <strong>
              {complete
                ? "✓ Nicely done"
                : started
                  ? "Paused"
                  : "Ready to test your pointer?"}
            </strong>
            <span>
              {complete
                ? "Use Save below to keep these observations."
                : "Choose the button above to begin."}
            </span>
          </div>
        )}
        {active && <span className="td-surface-label">{current.title}</span>}
      </div>
      {hint && (
        <p className="td-live" role="status">
          {hint}
        </p>
      )}
      <details>
        <summary>What this checks</summary>
        <p>
          Movement, left and right click, double-click, both vertical scroll
          directions, and a complete drag. Mouse / trackpad events count; touch
          input does not. Scroll direction names follow the browser’s content
          direction. Middle clicks are recorded if you try one while the
          challenge is active. System gestures and hardware quality still need
          your judgement.
        </p>
      </details>
    </div>
  );
}
