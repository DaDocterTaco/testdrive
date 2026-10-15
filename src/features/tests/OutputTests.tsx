import { useEffect, useRef, useState } from "react";
import { fact, useEvidence } from "./shared";
import type { ModuleProps } from "./shared";

type Channel = "left" | "right" | "both";
export function SpeakerTest({ onChange }: ModuleProps) {
  const context = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const epoch = useRef(0);
  const [playing, setPlaying] = useState("");
  const [played, setPlayed] = useState<Record<Channel, number>>({
    left: 0,
    right: 0,
    both: 0,
  });
  const [heard, setHeard] = useState<Record<Channel, boolean>>({
    left: false,
    right: false,
    both: false,
  });
  const [speechCount, setSpeechCount] = useState(0);
  const [output, setOutput] = useState("Not sure");
  const [error, setError] = useState("");
  function stop() {
    epoch.current++;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    try {
      oscillator.current?.stop();
    } catch {
      /* already stopped */
    }
    oscillator.current?.disconnect();
    oscillator.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
    window.speechSynthesis?.cancel();
  }
  useEffect(() => {
    mounted.current = true;
    const hide = () => {
      if (document.hidden) {
        stop();
        setPlaying("");
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      stop();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEvidence(
    onChange,
    {
      ready: Object.values(played).some((v) => v > 0) || speechCount > 0,
      facts: [
        fact(
          "speakers.output",
          "User-selected intended output",
          output,
          "The browser has not independently identified the physical output.",
          "user_provided",
        ),
        ...(["left", "right", "both"] as const).map((c) =>
          fact(
            `speakers.scheduled.${c}`,
            `${c[0].toUpperCase() + c.slice(1)} tone schedules`,
            played[c],
            "Successful Web Audio scheduling does not prove physical sound output.",
          ),
        ),
        ...(["left", "right", "both"] as const)
          .filter((c) => heard[c])
          .map((c) =>
            fact(
              `speakers.heard.${c}`,
              `Person heard the ${c} test as intended`,
              true,
              "Only explicitly checked channel confirmations are recorded.",
              "user_confirmed",
            ),
          ),
        fact("speakers.speech", "Spoken samples scheduled", speechCount),
      ],
      explanation:
        Object.values(played).some((v) => v > 0) || speechCount > 0
          ? "Short sounds were scheduled after your Play actions. Audibility, distortion and the output channels require your confirmation. Mono or Bluetooth routing can affect channel tests."
          : "No test sounds have been scheduled. Speaker condition remains unassessed.",
    },
    [played, heard, speechCount, output],
  );
  async function tone(channel: Channel) {
    stop();
    setError("");
    setPlaying(channel);
    const token = epoch.current;
    try {
      const ctx = new AudioContext();
      context.current = ctx;
      await ctx.resume();
      if (!mounted.current || token !== epoch.current) {
        void ctx.close().catch(() => {});
        return;
      }
      if (ctx.state !== "running")
        throw new Error("Audio context did not start");
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);
      oscillator.current = osc;
      osc.frequency.value = 440;
      osc.type = "sine";
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.035, ctx.currentTime + 0.75);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.9);
      osc.connect(gain);
      if (channel === "left" || channel === "both") gain.connect(merger, 0, 0);
      if (channel === "right" || channel === "both") gain.connect(merger, 0, 1);
      merger.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.95);
      setPlayed((p) => ({ ...p, [channel]: p[channel] + 1 }));
      timer.current = setTimeout(() => {
        stop();
        if (mounted.current) setPlaying("");
      }, 1100);
    } catch {
      if (token !== epoch.current || !mounted.current) return;
      stop();
      setPlaying("");
      setError(
        "Sound could not start. Check your browser’s audio restrictions, then press Play again.",
      );
    }
  }
  function speak() {
    stop();
    setError("");
    if (!("speechSynthesis" in window)) {
      setError(
        "The browser’s spoken sample is unavailable. Use the tone checks instead.",
      );
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      "This is Test Drive. Listen for clear, even sound from your selected speakers.",
    );
    const local = window.speechSynthesis
      .getVoices()
      .find((v) => v.localService && v.lang.startsWith("en"));
    if (local) utterance.voice = local;
    utterance.volume = 0.3;
    utterance.rate = 0.9;
    utterance.onend = () => {
      if (mounted.current) setPlaying("");
    };
    utterance.onerror = () => {
      if (mounted.current) {
        setPlaying("");
        setError(
          "The spoken sample could not play. Use the tone checks or retry.",
        );
      }
    };
    setPlaying("speech");
    window.speechSynthesis.speak(utterance);
    setSpeechCount((n) => n + 1);
    timer.current = setTimeout(() => {
      stop();
      if (mounted.current) setPlaying("");
    }, 12000);
  }
  return (
    <div className="td-module">
      <p>
        Set your device volume low before playing. Check whether headphones or
        Bluetooth are connected. This test never requests microphone access.
      </p>
      <label className="td-source">
        Output you intend to check{" "}
        <select value={output} onChange={(e) => setOutput(e.target.value)}>
          <option>Built-in speakers</option>
          <option>Headphones</option>
          <option>Bluetooth / external speakers</option>
          <option>Not sure</option>
        </select>
      </label>
      <div className="td-speaker-tests">
        {(["left", "right", "both"] as const).map((channel) => (
          <div className="td-tone-card" key={channel}>
            <div className="td-sound-symbol" aria-hidden="true">
              {channel === "left" ? "◀" : channel === "right" ? "▶" : "◀ ▶"}
            </div>
            <strong>
              {channel === "both"
                ? "Both channels"
                : `${channel[0].toUpperCase() + channel.slice(1)} channel`}
            </strong>
            <button className="primary" onClick={() => void tone(channel)}>
              Play {channel}
            </button>
            <label className="td-heard">
              <input
                type="checkbox"
                disabled={!played[channel]}
                checked={heard[channel]}
                onChange={(e) =>
                  setHeard((h) => ({ ...h, [channel]: e.target.checked }))
                }
              />{" "}
              I heard this as intended
            </label>
          </div>
        ))}
      </div>
      <div className="td-toolbar">
        <button onClick={speak}>Play spoken sample</button>
        <button
          className="td-stop"
          onClick={() => {
            stop();
            setPlaying("");
          }}
        >
          Stop all sound
        </button>
        <span className="td-live" role="status">
          {playing ? `Playing ${playing}` : "Sound stopped"}
        </span>
      </div>
      {error && (
        <div className="td-notice" role="status">
          {error}
        </div>
      )}
      <p className="td-help">
        Listen for missing sound or distortion. The browser can schedule a sound
        but cannot hear your speakers. A mono output or selected audio route may
        combine the channels.
      </p>
    </div>
  );
}

const patterns = [
  { name: "Red", background: "#ed2024" },
  { name: "Green", background: "#00b957" },
  { name: "Blue", background: "#165af4" },
  { name: "Black", background: "#000" },
  { name: "White", background: "#fff" },
  { name: "Gray", background: "#888" },
  { name: "Gradient", background: "linear-gradient(90deg,#000,#fff)" },
  {
    name: "Checkerboard",
    background:
      "conic-gradient(#fff 25%,#222 0 50%,#fff 0 75%,#222 0) 0 0 / 32px 32px",
  },
];
export function DisplayTest({ onChange }: ModuleProps) {
  const surface = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [full, setFull] = useState(false);
  const [fullUsed, setFullUsed] = useState(false);
  const [notice, setNotice] = useState("");
  const [started, setStarted] = useState(false);
  const [tour, setTour] = useState(false);
  useEffect(() => {
    if (!tour) return;
    const timer = window.setTimeout(() => {
      if (index === patterns.length - 1) {
        setTour(false);
        setNotice(
          "All eight patterns have been shown. Record whether you noticed any dots, lines, or uneven colors below.",
        );
      } else setIndex((value) => value + 1);
    }, 4000);
    const pause = () => {
      if (document.hidden) setTour(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", pause);
    };
  }, [tour, index]);
  useEffect(() => {
    const change = () => {
      const active = document.fullscreenElement === surface.current;
      setFull(active);
      if (active) setFullUsed(true);
    };
    document.addEventListener("fullscreenchange", change);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      if (document.fullscreenElement === surface.current)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (started) setSeen((old) => new Set(old).add(patterns[index].name));
  }, [index, started]);
  useEvidence(
    onChange,
    {
      ready: started,
      facts: [
        fact(
          "display.patterns",
          "Static patterns shown",
          Array.from(seen).join(", ") || "None",
          "Rendering a pattern does not automatically detect panel defects.",
        ),
        fact("display.pattern_count", "Different patterns shown", seen.size),
        fact(
          "display.fullscreen",
          "Fullscreen was used",
          fullUsed,
          "Fullscreen is optional; browser support varies.",
        ),
      ],
      explanation:
        "The app rendered static test patterns. Only your visual answer can assess persistent dots, discoloration, image retention or unevenness.",
    },
    [seen, started, fullUsed],
  );
  async function fullscreen() {
    if (!surface.current?.requestFullscreen) {
      setNotice(
        "Fullscreen is unavailable here. Use the enlarged test area below.",
      );
      return;
    }
    try {
      await surface.current.requestFullscreen();
      setNotice("");
    } catch {
      setNotice(
        "Fullscreen was not allowed. The enlarged test area remains available.",
      );
    }
  }
  function next() {
    setTour(false);
    setStarted(true);
    setIndex((i) => (i + 1) % patterns.length);
  }
  return (
    <div className="td-module">
      <p>
        Look for dots that stay in the same place, lines, or uneven color. Use
        the guided tour to show each pattern for four seconds, or change them
        yourself. You decide how the screen looks.
      </p>
      <div className="td-toolbar">
        <button
          className="primary"
          onClick={() => {
            if (tour) {
              setTour(false);
              return;
            }
            setStarted(true);
            setIndex(0);
            setNotice("");
            setTour(true);
          }}
        >
          {tour ? "Pause color tour" : "Start guided color tour"}
        </button>
        <button className="primary" onClick={() => setStarted(true)}>
          {started ? "Pattern test active" : "Show first pattern"}
        </button>
        <button
          onClick={() => {
            setStarted(true);
            void fullscreen();
          }}
        >
          Enter fullscreen
        </button>
        <span className="td-stat">
          {seen.size} / {patterns.length} patterns shown
        </span>
      </div>
      {notice && (
        <div className="td-notice" role="status">
          {notice}
        </div>
      )}
      <div
        ref={surface}
        className={`td-display-surface ${full ? "fullscreen" : ""}`}
        style={{ background: started ? patterns[index].background : "#edf0ec" }}
      >
        {!started && (
          <span className="td-pattern-placeholder">
            Start the guided tour, or show a single pattern
          </span>
        )}
        <div className="td-pattern-controls">
          <button
            onClick={() => {
              setTour(false);
              setStarted(true);
              setIndex((i) => (i + patterns.length - 1) % patterns.length);
            }}
          >
            Previous
          </button>
          <span>{started ? patterns[index].name : "Ready"}</span>
          <button onClick={next}>Next pattern</button>
          {tour && <button onClick={() => setTour(false)}>Pause tour</button>}
          {full && (
            <button onClick={() => void document.exitFullscreen()}>
              Exit fullscreen
            </button>
          )}
        </div>
      </div>
      <div className="td-pattern-list">
        {patterns.map((p, i) => (
          <button
            key={p.name}
            className={started && index === i ? "active" : ""}
            onClick={() => {
              setTour(false);
              setStarted(true);
              setIndex(i);
            }}
          >
            <span style={{ background: p.background }} />
            {p.name}
            {seen.has(p.name) ? " ✓" : ""}
          </button>
        ))}
      </div>
      <p className="td-help">
        The optional tour changes color once every four seconds and can be
        paused at any time. The test covers the area the browser renders; hidden
        browser and system UI are outside it. Use Escape or the visible Exit
        fullscreen control to leave fullscreen.
      </p>
    </div>
  );
}
