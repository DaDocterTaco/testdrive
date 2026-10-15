import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Expand, Fingerprint, MoveVertical, X } from "lucide-react";
import { fact, useEvidence } from "./shared";
import type { ModuleProps } from "./shared";

export function TouchTest({ onChange }: ModuleProps) {
  const stage = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const active = useRef(new Set<number>());
  const [cells, setCells] = useState<Set<number>>(new Set());
  const [maxTouches, setMaxTouches] = useState(0);
  const [samples, setSamples] = useState(0);
  const [priorCoverage, setPriorCoverage] = useState<number[]>([]);
  const coverage = useRef(0);
  const [cancelled, setCancelled] = useState(0);
  const [resizes, setResizes] = useState(0);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const transitioning = useRef(false);
  const retained = useRef(false);
  const nativeEntered = useRef(false);
  const mounted = useRef(true);
  const [mode, setMode] = useState("inline");
  const [hudBottom, setHudBottom] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const size = useRef("");
  const requestEpoch = useRef(0);
  function resetGrid() {
    if (coverage.current > 0)
      setPriorCoverage((p) => [...p, coverage.current].slice(-20));
    setCells(new Set());
    coverage.current = 0;
    active.current.clear();
    setPaused(false);
    retained.current = false;
    const r = area.current?.getBoundingClientRect();
    if (r) {
      size.current = `${Math.round(r.width)}:${Math.round(r.height)}`;
      setDimensions({
        width: Math.round(r.width),
        height: Math.round(r.height),
      });
    }
  }
  function leaveExpanded() {
    const token = ++requestEpoch.current;
    expandedRef.current = false;
    transitioning.current = false;
    retained.current = true;
    nativeEntered.current = false;
    active.current.clear();
    setExpanded(false);
    setPaused(true);
    const restoreFocus = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (
            mounted.current &&
            token === requestEpoch.current &&
            !expandedRef.current
          )
            launch.current?.focus({ preventScroll: true });
        }),
      );
    // Native fullscreen performs its own focus restoration on exit. Restore
    // our launcher after that transition and the inline layout have settled.
    if (document.fullscreenElement === stage.current)
      void document
        .exitFullscreen()
        .catch(() => {})
        .then(restoreFocus);
    else restoreFocus();
  }
  function enterExpanded() {
    resetGrid();
    retained.current = false;
    transitioning.current = true;
    expandedRef.current = true;
    setExpanded(true);
    setMode("viewport");
    setHudBottom(false);
    size.current = "";
    const token = ++requestEpoch.current;
    const settle = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!mounted.current || token !== requestEpoch.current) return;
          transitioning.current = false;
          exitButton.current?.focus({ preventScroll: true });
        }),
      );
    // Called directly from this click so transient user activation is retained.
    if (stage.current?.requestFullscreen) {
      void stage.current
        .requestFullscreen({ navigationUI: "hide" })
        .then(() => {
          if (!mounted.current || token !== requestEpoch.current) {
            if (document.fullscreenElement === stage.current)
              void document.exitFullscreen().catch(() => {});
            return;
          }
          nativeEntered.current = true;
          setMode("native_fullscreen");
          settle();
        })
        .catch(() => {
          if (mounted.current && token === requestEpoch.current) settle();
        });
    } else settle();
  }
  useEffect(() => {
    mounted.current = true;
    const element = stage.current;
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      const next = `${Math.round(r.width)}:${Math.round(r.height)}`;
      if (retained.current) return;
      if (size.current && size.current !== next) {
        if (coverage.current > 0)
          setPriorCoverage((p) => [...p, coverage.current].slice(-20));
        setCells(new Set());
        coverage.current = 0;
        active.current.clear();
        setResizes((n) => n + 1);
        setPaused(!transitioning.current);
      }
      size.current = next;
      setDimensions({
        width: Math.round(r.width),
        height: Math.round(r.height),
      });
    });
    if (area.current) observer.observe(area.current);
    const fullscreen = () => {
      if (document.fullscreenElement === element) {
        nativeEntered.current = true;
        setMode("native_fullscreen");
      } else if (nativeEntered.current) leaveExpanded();
    };
    const hide = () => {
      if (!document.hidden) return;
      active.current.clear();
      setCancelled((n) => n + 1);
      setPaused(true);
      if (expandedRef.current) leaveExpanded();
    };
    const escape = (e: KeyboardEvent) => {
      if (!expandedRef.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        leaveExpanded();
      }
      if (e.key === "Tab") {
        const buttons = [
          ...(element?.querySelectorAll<HTMLButtonElement>("button") ?? []),
        ];
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("visibilitychange", hide);
    document.addEventListener("keydown", escape);
    return () => {
      mounted.current = false;
      requestEpoch.current++;
      observer.disconnect();
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("visibilitychange", hide);
      document.removeEventListener("keydown", escape);
      active.current.clear();
      if (document.fullscreenElement === element)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!expanded) return;
    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    const overscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overscrollBehavior = overscroll;
    };
  }, [expanded]);
  useEvidence(
    onChange,
    {
      ready: cells.size > 0,
      facts: [
        fact(
          "touch.coverage",
          "Touched areas in the current grid",
          cells.size,
          "60 cells cover only the test surface. Browser controls and system areas outside it are not tested.",
        ),
        fact("touch.total", "Areas in test grid", 60),
        fact(
          "touch.samples",
          "Actual touch samples received across this test",
          samples,
        ),
        fact(
          "touch.max",
          "Maximum simultaneous touches observed",
          maxTouches,
          "Observed from active touch pointer IDs, not a reported hardware capability.",
        ),
        fact(
          "touch.presentation",
          "Presentation of the latest tested grid",
          mode,
        ),
        fact(
          "touch.width",
          "Latest tested grid width",
          dimensions.width,
          undefined,
          "measured",
          "CSS px",
        ),
        fact(
          "touch.height",
          "Latest tested grid height",
          dimensions.height,
          undefined,
          "measured",
          "CSS px",
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
          "Separate grid counts cannot be combined.",
        ),
        fact(
          "touch.uncovered",
          "Areas remaining in the current grid",
          60 - cells.size,
          "Untouched areas are untested, not automatically defective.",
        ),
      ],
      explanation:
        "Coverage uses actual touch samples without interpolation. Fullscreen uses the browser’s fullscreen API when available, otherwise the visible page viewport. Exit preserves the last grid; a new size starts a separate grid.",
    },
    [
      cells,
      maxTouches,
      samples,
      cancelled,
      resizes,
      priorCoverage,
      mode,
      dimensions.width,
      dimensions.height,
    ],
  );
  function sample(e: ReactPointerEvent<HTMLDivElement>) {
    if (paused || e.pointerType !== "touch") return;
    e.preventDefault();
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
    <div className="td-module td-touch-module">
      <div className="td-touch-intro">
        <div className="td-test-symbol">
          <Fingerprint size={25} />
        </div>
        <div>
          <strong>Reach every corner of your screen.</strong>
          <p>
            Fill the squares with your finger, then try two or more fingers
            together. Green means your touch arrived.
          </p>
        </div>
      </div>
      <div className="td-toolbar td-touch-launch">
        <button className="primary" ref={launch} onClick={enterExpanded}>
          <Expand size={17} /> Start fullscreen touch test
        </button>
        <span className="td-touch-launch-note">
          Exit any time. Your results stay here.
        </span>
      </div>
      <div className="td-toolbar">
        <span className="td-stat">{cells.size} / 60 areas touched</span>
        <span className="td-stat">
          {maxTouches} simultaneous {maxTouches === 1 ? "touch" : "touches"}
        </span>
        <button
          onClick={() => {
            resetGrid();
            setMode("inline");
          }}
        >
          Reset grid
        </button>
      </div>
      {paused && !expanded && (
        <div className="td-notice" role="status">
          {retained.current
            ? "Your last touch grid is saved below. Start fullscreen again or reset the grid for another pass."
            : "The screen size changed or the check was interrupted. Your previous coverage was saved separately."}
          <button
            onClick={() => {
              resetGrid();
              setMode("inline");
            }}
          >
            Continue test
          </button>
        </div>
      )}
      <div
        ref={stage}
        className={`td-touch-stage ${expanded ? "is-expanded" : ""}`}
        role={expanded ? "dialog" : undefined}
        aria-modal={expanded ? true : undefined}
        aria-label={expanded ? "Fullscreen touchscreen test" : undefined}
      >
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
            if (active.current.has(e.pointerId)) sample(e);
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
        {expanded && (
          <div className={`td-touch-hud ${hudBottom ? "at-bottom" : ""}`}>
            <div className="td-touch-hud-top">
              <div>
                <strong>
                  {cells.size === 60
                    ? "Every area reached"
                    : "Swipe to fill every square"}
                </strong>
                <span aria-live="polite">
                  {cells.size} / 60 areas · {maxTouches} fingers observed
                </span>
              </div>
              <button
                ref={exitButton}
                className="td-touch-exit"
                onClick={leaveExpanded}
                aria-label="Exit touch test"
              >
                <X size={18} /> Exit
              </button>
            </div>
            <div
              className="td-touch-progress"
              role="progressbar"
              aria-label="Touch coverage"
              aria-valuenow={cells.size}
              aria-valuemin={0}
              aria-valuemax={60}
            >
              <span style={{ width: `${(cells.size / 60) * 100}%` }} />
            </div>
            <div className="td-touch-hud-bottom">
              <span>
                {mode === "native_fullscreen"
                  ? "Fullscreen · Esc exits"
                  : "Full viewport · browser controls stay visible"}
              </span>
              <button onClick={() => setHudBottom((v) => !v)}>
                <MoveVertical size={14} /> Move controls
              </button>
            </div>
            {paused && (
              <div className="td-touch-paused">
                <span>Screen changed. Start a fresh grid to continue.</span>
                <button onClick={resetGrid}>Continue test</button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="td-help">
        Only touch input counts. Move the floating controls to reach the squares
        beneath them. Fullscreen availability depends on your browser; system
        bars and browser controls outside the grid cannot be tested.
      </p>
    </div>
  );
}
export { KeyboardTest } from "./KeyboardTest";
export { PointerTest } from "./PointerTest";
