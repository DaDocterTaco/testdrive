import { useEffect, useRef, useState } from "react";
import { BatteryCharging, CheckCircle2, PlugZap } from "lucide-react";
import { fact, useEvidence } from "./shared";
import type { ModuleProps } from "./shared";

interface BatteryReading extends EventTarget {
  level: number;
  charging: boolean;
}
export function PowerTest({ onChange }: ModuleProps) {
  const [reading, setReading] = useState<{
    level: number;
    charging: boolean;
  }>();
  const [changes, setChanges] = useState(0);
  const [error, setError] = useState("");
  const [watching, setWatching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const battery = useRef<BatteryReading | undefined>(undefined);
  const previous = useRef<boolean | undefined>(undefined);
  const watchingRef = useRef(false);
  useEffect(() => {
    let active = true;
    let timedOut = false;
    const update = () => {
      const b = battery.current;
      if (!active || !b) return;
      if (
        !Number.isFinite(b.level) ||
        b.level < 0 ||
        b.level > 1 ||
        typeof b.charging !== "boolean"
      ) {
        setError(
          "This browser returned an unavailable battery reading. You can skip this check.",
        );
        return;
      }
      if (
        watchingRef.current &&
        previous.current !== undefined &&
        previous.current !== b.charging
      ) {
        setChanges((n) => n + 1);
      }
      previous.current = b.charging;
      setReading({ level: Math.round(b.level * 100), charging: b.charging });
    };
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryReading>;
    };
    const timeout = window.setTimeout(() => {
      timedOut = true;
      if (active)
        setError(
          "The battery reading did not arrive. Skip this check or reopen it to try again.",
        );
    }, 4000);
    if (!nav.getBattery) {
      clearTimeout(timeout);
      setError(
        "This browser does not share battery information. Try Chrome or Edge on your laptop, or skip this check.",
      );
    } else {
      void nav
        .getBattery()
        .then((b) => {
          clearTimeout(timeout);
          if (!active || timedOut) return;
          battery.current = b;
          update();
          b.addEventListener("levelchange", update);
          b.addEventListener("chargingchange", update);
        })
        .catch(() => {
          clearTimeout(timeout);
          if (active && !timedOut)
            setError(
              "Battery information is unavailable in this browser. This does not indicate a battery fault.",
            );
        });
    }
    return () => {
      active = false;
      watchingRef.current = false;
      clearTimeout(timeout);
      battery.current?.removeEventListener("levelchange", update);
      battery.current?.removeEventListener("chargingchange", update);
      battery.current = undefined;
    };
  }, []);
  useEffect(() => {
    if (!watching) return;
    const timer = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [watching]);
  useEffect(() => {
    if (elapsed >= 60 || changes > 0) {
      watchingRef.current = false;
      setWatching(false);
    }
  }, [elapsed, changes]);
  useEvidence(
    onChange,
    {
      ready: !!reading,
      ...(error
        ? { status: "unsupported" as const, reason: "battery_api_unavailable" }
        : {}),
      automatic: {
        complete: !!reading && !error,
        summary:
          changes > 0
            ? "Power change detected. The browser reported a charging-state change."
            : "Battery reading received. Charger response has not been checked yet.",
      },
      explanation:
        error ||
        (changes > 0
          ? "Battery charge was reported and a charging-state change was observed during the charger check. This does not measure battery wear, capacity, charger wattage, or runtime."
          : "The browser reported a battery reading. A charger transition, battery wear, capacity, and runtime have not been verified."),
      facts: reading
        ? [
            fact(
              "battery.level",
              "Reported battery charge",
              reading.level,
              "A browser reading; it may be rounded or a default on devices without a battery.",
              "browser_reported",
              "%",
            ),
            fact(
              "battery.charging",
              "Reported charging state",
              reading.charging,
              "A full battery or desktop may report a default state.",
              "browser_reported",
            ),
            fact(
              "battery.power_changes",
              "Charging-state changes observed",
              changes,
              "Counted only during the charger check. This is not a charger wattage or battery-health measurement.",
            ),
          ]
        : [],
    },
    [reading?.level, reading?.charging, changes, error],
  );
  return (
    <div className="power-check">
      <p className="td-instruction">
        We read the battery level automatically. If you have a charger nearby,
        try the optional connection check.
      </p>
      {error ? (
        <p className="td-alert" role="status">
          {error}
        </p>
      ) : !reading ? (
        <p role="status">Reading battery information…</p>
      ) : (
        <>
          <div className="power-reading">
            <BatteryCharging size={42} />
            <strong>{reading.level}%</strong>
            <span>
              {reading.charging
                ? "Browser reports charging"
                : "Browser reports battery power"}
            </span>
          </div>
          <div className="power-next" role="status">
            {changes > 0 ? (
              <>
                <CheckCircle2 size={23} />
                <div>
                  <strong>Power change detected</strong>
                  <p>Your browser registered a change in charging state.</p>
                </div>
              </>
            ) : (
              <>
                <PlugZap size={23} />
                <div>
                  <strong>
                    {watching
                      ? reading.charging
                        ? "Unplug the charger, then reconnect it."
                        : "Connect your charger."
                      : "Check your charger connection"}
                  </strong>
                  <p>
                    {watching
                      ? `Watching for a change · ${60 - elapsed}s remaining`
                      : elapsed >= 60
                        ? "No state change was reported in 60 seconds. A full battery or browser limits can cause this; it is not a failure verdict."
                        : "We’ll watch for up to one minute and record an actual change. You may save the current reading without this step."}
                  </p>
                </div>
              </>
            )}
          </div>
          {!changes && (
            <button
              disabled={watching}
              onClick={() => {
                previous.current = battery.current?.charging;
                watchingRef.current = true;
                setElapsed(0);
                setWatching(true);
              }}
            >
              {watching
                ? "Watching for power change…"
                : "Check charger connection"}
            </button>
          )}
          {watching && (
            <button
              onClick={() => {
                watchingRef.current = false;
                setWatching(false);
              }}
            >
              Stop watching
            </button>
          )}
        </>
      )}
      <p className="td-muted">
        A charge percentage does not reveal battery wear or how long the laptop
        will last. Some browsers return default readings, especially on
        desktops.
      </p>
    </div>
  );
}
