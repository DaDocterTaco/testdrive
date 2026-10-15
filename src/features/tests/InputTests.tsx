import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { fact, useEvidence } from "./shared";
import type { ModuleProps } from "./shared";

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

export { KeyboardTest } from "./KeyboardTest";

export { PointerTest } from "./PointerTest";
