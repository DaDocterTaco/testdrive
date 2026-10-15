import { useEffect, useRef, useState } from "react";
import { fact, mediaError, useEvidence } from "./shared";
import type { Evidence, ModuleProps } from "./shared";
import type { Fact } from "../../types";

const available = () =>
  !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
async function enumerateInputs() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.mediaDevices.enumerateDevices().catch(() => []),
      new Promise<MediaDeviceInfo[]>((resolve) => {
        timeout = setTimeout(() => resolve([]), 1500);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function CameraTest({ onChange }: ModuleProps) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const epoch = useRef(0);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failure, setFailure] = useState<Partial<Evidence>>({});
  const [sources, setSources] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Default camera");
  const [frames, setFrames] = useState(0);
  const [settings, setSettings] = useState<MediaTrackSettings>({});
  const [capture, setCapture] = useState("");
  const [captures, setCaptures] = useState(0);
  const [history, setHistory] = useState<Fact[]>([]);
  function dispose() {
    epoch.current++;
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    if (promptTimer.current) {
      clearTimeout(promptTimer.current);
      promptTimer.current = null;
    }
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }
  useEffect(() => {
    mounted.current = true;
    const hide = () => {
      if (document.hidden) {
        dispose();
        setRunning(false);
        setBusy(false);
        setCapture("");
        setFailure({ status: "interrupted", reason: "tab_hidden" });
        setError(
          "The camera stopped when this page went into the background. Choose Start camera to resume.",
        );
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      dispose();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEvidence(
    onChange,
    {
      ...failure,
      ready: frames > 0,
      facts: [
        ...history,
        fact(
          "camera.frame_observations",
          "Current-source distinct moving video frame observations",
          frames,
          "This is evidence of arriving video, not a sensor quality assessment.",
        ),
        ...(frames > 0
          ? [
              fact(
                "camera.source",
                "Current tested camera source",
                sourceLabel,
                undefined,
                "browser_reported",
              ),
              fact(
                "camera.width",
                "Current stream width",
                settings.width ?? "Not reported",
                undefined,
                "browser_reported",
                "px",
              ),
              fact(
                "camera.height",
                "Current stream height",
                settings.height ?? "Not reported",
                undefined,
                "browser_reported",
                "px",
              ),
              fact(
                "camera.frame_rate",
                "Current stream frame rate setting",
                settings.frameRate ?? "Not reported",
                "A stream setting, not the camera’s maximum capability.",
                "browser_reported",
                "fps",
              ),
            ]
          : []),
        fact(
          "camera.captures",
          "Current-source temporary previews captured",
          captures,
          "Image content is not saved in the report.",
        ),
      ],
      explanation: failure.status
        ? error || "The camera check stopped before a final assessment."
        : frames > 0
          ? "The preview received a real local camera stream. Clarity, spots, blur and lighting require your judgement."
          : "No moving camera frames have been observed yet. Camera condition remains unassessed.",
    },
    [failure, frames, settings, captures, sourceLabel, history, error],
  );
  async function start(choice = "") {
    if (frames > 0)
      setHistory((old) =>
        [
          ...old,
          fact(
            `camera.previous_source.${old.length + 1}`,
            "Previously observed camera stream",
            `${sourceLabel.slice(0, 180)}: ${settings.width ?? "?"} × ${settings.height ?? "?"}; ${frames} moving-frame observations; ${captures} temporary captures.`,
            "Recorded before switching or retrying; it does not establish the current source’s condition.",
          ),
        ].slice(-20),
      );
    dispose();
    setCapture("");
    setFrames(0);
    setSettings({});
    setCaptures(0);
    setBusy(true);
    setRunning(false);
    setError("");
    setFailure({});
    if (!available()) {
      setBusy(false);
      setError(
        "Camera access is unavailable. Use a supported browser on HTTPS or localhost.",
      );
      setFailure({ status: "unsupported", reason: "media_api_unavailable" });
      return;
    }
    const token = epoch.current;
    promptTimer.current = setTimeout(() => {
      if (token !== epoch.current || !mounted.current) return;
      dispose();
      setBusy(false);
      setRunning(false);
      setError(
        "Camera access did not finish within 20 seconds. The browser’s permission dialog may remain open. You can retry or skip; any late camera stream will be stopped.",
      );
      setFailure({ status: "interrupted", reason: "permission_wait_timeout" });
    }, 20000);
    try {
      const constraints: MediaTrackConstraints =
        choice === "user" || choice === "environment"
          ? { facingMode: { ideal: choice } }
          : choice
            ? { deviceId: { exact: choice } }
            : {};
      const input = await navigator.mediaDevices.getUserMedia({
        video: constraints,
        audio: false,
      });
      if (!mounted.current || token !== epoch.current) {
        input.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = input;
      const track = input.getVideoTracks()[0];
      setSettings(track.getSettings());
      setSourceLabel(track.label || "Camera label not exposed");
      track.addEventListener("ended", () => {
        if (mounted.current && stream.current === input) {
          dispose();
          setRunning(false);
          setError(
            "The camera disconnected or stopped. Reconnect it, then retry.",
          );
          setFailure({ status: "error", reason: "stream_ended" });
        }
      });
      if (video.current) {
        video.current.srcObject = input;
        await video.current.play();
      }
      if (token !== epoch.current) return;
      if (promptTimer.current) {
        clearTimeout(promptTimer.current);
        promptTimer.current = null;
      }
      setRunning(true);
      setBusy(false);
      const devices = await enumerateInputs();
      if (token !== epoch.current) return;
      setSources(devices.filter((d) => d.kind === "videoinput"));
      let lastTime = -1;
      timer.current = setInterval(() => {
        const v = video.current;
        if (
          v &&
          v.readyState >= 2 &&
          v.videoWidth > 0 &&
          v.currentTime !== lastTime
        ) {
          lastTime = v.currentTime;
          setFrames((n) => n + 1);
          setSettings(track.getSettings());
        }
      }, 250);
    } catch (err) {
      if (token !== epoch.current || !mounted.current) return;
      dispose();
      const info = mediaError(err);
      setError(info.message);
      setFailure({ status: info.status, reason: info.reason });
      setBusy(false);
      setRunning(false);
    }
  }
  function takeCapture() {
    const v = video.current;
    if (!v || v.readyState < 2 || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / v.videoWidth);
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
    setCapture(canvas.toDataURL("image/jpeg", 0.8));
    setCaptures((n) => n + 1);
  }
  return (
    <div className="td-module">
      <p>
        Your camera opens only when you choose Start. Preview and captures stay
        in memory and are discarded when you leave.
      </p>
      <div className="td-toolbar">
        <button
          className="primary"
          onClick={() => void start(selected)}
          disabled={busy}
        >
          {busy
            ? "Opening camera…"
            : running
              ? "Restart camera"
              : "Start camera"}
        </button>
        {busy && (
          <button
            onClick={() => {
              dispose();
              setBusy(false);
              setFailure({
                status: "cancelled",
                reason: "user_cancelled_permission_wait",
              });
              setError(
                "Opening was cancelled. Your browser’s permission dialog may remain open; any late stream will be stopped.",
              );
            }}
          >
            Cancel opening
          </button>
        )}
        {running && (
          <button
            onClick={() => {
              dispose();
              setRunning(false);
              setCapture("");
            }}
          >
            Stop camera
          </button>
        )}
        <button onClick={() => void start("user")} disabled={busy}>
          Front camera
        </button>
        <button onClick={() => void start("environment")} disabled={busy}>
          Rear camera
        </button>
      </div>
      {sources.length > 0 && (
        <label className="td-source">
          Camera source{" "}
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              void start(e.target.value);
            }}
          >
            <option value="">Default camera</option>
            {sources.map((s, i) => (
              <option key={s.deviceId || i} value={s.deviceId}>
                {s.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <div className="td-notice" role="status">
          {error}
        </div>
      )}
      <div className="td-camera-view">
        <video ref={video} muted playsInline aria-label="Live camera preview" />
        <span className="td-focus-target" aria-hidden="true" />
        {!running && (
          <div className="td-media-placeholder">
            {busy ? "Waiting for camera access" : "Camera preview appears here"}
          </div>
        )}
        <span className="td-media-badge">
          {running ? sourceLabel : "Camera off"}
        </span>
      </div>
      <div className="td-toolbar">
        <span className="td-stat">
          {frames > 0
            ? `${settings.width ?? "—"} × ${settings.height ?? "—"} · video received`
            : "No video observed yet"}
        </span>
        <button disabled={!running || !frames} onClick={takeCapture}>
          Capture preview
        </button>
      </div>
      {capture && (
        <div className="td-capture">
          <img
            src={capture}
            alt="Temporary camera capture for visual inspection"
          />
          <button onClick={() => setCapture("")}>Discard capture</button>
        </div>
      )}
      <p className="td-help">
        Inspect clarity, focus, spots and blur. A dark picture may be caused by
        lighting or a covered lens. Front/rear requests may open the same source
        when the browser exposes only one.
      </p>
    </div>
  );
}

export function MicrophoneTest({ onChange }: ModuleProps) {
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const frame = useRef(0);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = useRef("");
  const epoch = useRef(0);
  const recordingGeneration = useRef(0);
  const mounted = useRef(true);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [inputObserved, setInputObserved] = useState(false);
  const [clipSamples, setClipSamples] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playback, setPlayback] = useState("");
  const [played, setPlayed] = useState(false);
  const [format, setFormat] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState<Partial<Evidence>>({});
  const [sources, setSources] = useState<MediaDeviceInfo[]>([]);
  const [selected, setSelected] = useState("");
  const [history, setHistory] = useState<Fact[]>([]);
  function releaseUrl() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
  }
  function dispose(keepRecording = true) {
    epoch.current++;
    cancelAnimationFrame(frame.current);
    if (!keepRecording) recordingGeneration.current++;
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
    if (promptTimer.current) {
      clearTimeout(promptTimer.current);
      promptTimer.current = null;
    }
    if (recorder.current && recorder.current.state !== "inactive") {
      if (!keepRecording) {
        recorder.current.ondataavailable = null;
        recorder.current.onstop = null;
      }
      recorder.current.stop();
    }
    recorder.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    source.current?.disconnect();
    source.current = null;
    analyser.current?.disconnect();
    analyser.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
  }
  useEffect(() => {
    mounted.current = true;
    const hide = () => {
      if (document.hidden) {
        dispose(false);
        releaseUrl();
        setPlayback("");
        setRunning(false);
        setRecording(false);
        setBusy(false);
        setLevel(0);
        setFailure({ status: "interrupted", reason: "tab_hidden" });
        setNotice(
          "The microphone stopped when this page went into the background. Start a new sample to continue.",
        );
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      mounted.current = false;
      dispose(false);
      releaseUrl();
      document.removeEventListener("visibilitychange", hide);
    };
  }, []);
  useEvidence(
    onChange,
    {
      ...failure,
      ready: played,
      facts: [
        ...history,
        fact(
          "microphone.input",
          "Current-source input above the UI signal threshold was observed",
          inputObserved,
          "The normalized 0.015 RMS threshold is a UI aid, not a calibrated quality standard.",
        ),
        fact(
          "microphone.peak",
          "Current-source peak normalized RMS input",
          Number(peak.toFixed(4)),
          "Browser gain control and routing affect amplitude.",
        ),
        fact(
          "microphone.clipping_samples",
          "Current-source level observations near digital clipping",
          clipSamples,
          "Not a diagnosis of physical microphone failure.",
        ),
        fact(
          "microphone.recorded_seconds",
          "Current sample recording duration",
          Number(duration.toFixed(2)),
          undefined,
          "measured",
          "seconds",
        ),
        fact(
          "microphone.playback",
          "Current recording playback was started",
          played,
        ),
        ...(format
          ? [
              fact(
                "microphone.codec",
                "Current recording format",
                format,
                undefined,
                "browser_reported",
              ),
            ]
          : []),
        ...(sourceLabel
          ? [
              fact(
                "microphone.source",
                "Current microphone label",
                sourceLabel,
                undefined,
                "browser_reported",
              ),
            ]
          : []),
      ],
      explanation: failure.status
        ? notice || "The microphone check stopped before a final assessment."
        : duration > 0 || inputObserved
          ? "Input was observed from a local audio stream. Playback quality needs your listening confirmation; silence alone does not establish a hardware issue."
          : "No completed microphone sample has been assessed. Silence, mute settings and routing need to be checked before drawing conclusions.",
    },
    [
      failure,
      inputObserved,
      peak,
      clipSamples,
      duration,
      played,
      format,
      sourceLabel,
      history,
      notice,
    ],
  );
  async function start() {
    if (inputObserved || duration > 0 || peak > 0)
      setHistory((old) =>
        [
          ...old,
          fact(
            `microphone.previous_source.${old.length + 1}`,
            "Previously observed microphone sample",
            `${(sourceLabel || "Default microphone").slice(0, 180)}: peak RMS ${peak.toFixed(4)}; ${clipSamples} near-clipping observations; ${duration.toFixed(2)} seconds recorded; playback ${played ? "started" : "not started"}.`,
            "Recorded before retrying; this does not establish the current source’s condition.",
          ),
        ].slice(-20),
      );
    dispose(false);
    releaseUrl();
    setPlayback("");
    setPlayed(false);
    setBusy(true);
    setNotice("");
    setFailure({});
    setDuration(0);
    setLevel(0);
    setPeak(0);
    setInputObserved(false);
    setClipSamples(0);
    setFormat("");
    setSourceLabel("");
    if (!available()) {
      setBusy(false);
      setNotice(
        "Microphone access requires a supported browser on HTTPS or localhost.",
      );
      setFailure({ status: "unsupported", reason: "media_api_unavailable" });
      return;
    }
    const token = epoch.current;
    promptTimer.current = setTimeout(() => {
      if (token !== epoch.current || !mounted.current) return;
      dispose(false);
      setBusy(false);
      setRunning(false);
      setRecording(false);
      setLevel(0);
      setFailure({ status: "interrupted", reason: "permission_wait_timeout" });
      setNotice(
        "Microphone access did not finish within 20 seconds. The browser’s permission dialog may remain open. Retry or skip; any late microphone stream will be stopped.",
      );
    }, 20000);
    try {
      const input = await navigator.mediaDevices.getUserMedia({
        audio: selected ? { deviceId: { exact: selected } } : true,
        video: false,
      });
      if (!mounted.current || token !== epoch.current) {
        input.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = input;
      setSourceLabel(input.getAudioTracks()[0]?.label || "Default microphone");
      setRunning(true);
      setBusy(false);
      input.getAudioTracks()[0]?.addEventListener("ended", () => {
        if (mounted.current && stream.current === input) {
          dispose();
          setRunning(false);
          setRecording(false);
          setNotice(
            "The microphone disconnected. Reconnect it and start a new sample.",
          );
          setFailure({ status: "error", reason: "stream_ended" });
        }
      });
      try {
        const ctx = new AudioContext();
        context.current = ctx;
        await ctx.resume();
        if (token !== epoch.current) {
          void ctx.close().catch(() => {});
          return;
        }
        const node = ctx.createAnalyser();
        node.fftSize = 1024;
        analyser.current = node;
        source.current = ctx.createMediaStreamSource(input);
        source.current.connect(node);
        const data = new Uint8Array(node.fftSize);
        let previous = 0;
        const tick = (time: number) => {
          if (token !== epoch.current) return;
          if (time - previous >= 100) {
            previous = time;
            node.getByteTimeDomainData(data);
            let sum = 0,
              clipped = false;
            for (const n of data) {
              sum += ((n - 128) / 128) ** 2;
              if (n <= 1 || n >= 254) clipped = true;
            }
            const rms = Math.sqrt(sum / data.length);
            setLevel(rms);
            setPeak((v) => Math.max(v, rms));
            if (rms > 0.015) setInputObserved(true);
            if (clipped) setClipSamples((v) => v + 1);
          }
          frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
      } catch {
        setNotice(
          "The live level meter is unavailable in this browser. You can still listen to the recording if recording is supported.",
        );
      }
      const devices = await enumerateInputs();
      if (token !== epoch.current) return;
      setSources(devices.filter((d) => d.kind === "audioinput"));
      if (promptTimer.current) {
        clearTimeout(promptTimer.current);
        promptTimer.current = null;
      }
      if (typeof MediaRecorder === "undefined") {
        setNotice(
          "Recording playback is unavailable here. The live meter can still observe input. The microphone will stop after five seconds.",
        );
        stopTimer.current = setTimeout(() => {
          dispose();
          setRunning(false);
          setLevel(0);
        }, 5000);
        return;
      }
      const codec = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/webm",
        "audio/ogg;codecs=opus",
      ].find((c) => MediaRecorder.isTypeSupported(c));
      let rec: MediaRecorder;
      try {
        rec = codec
          ? new MediaRecorder(input, { mimeType: codec })
          : new MediaRecorder(input);
      } catch {
        setNotice(
          "Recording is unavailable with this browser’s codecs. The live meter remains usable for five seconds.",
        );
        stopTimer.current = setTimeout(() => {
          dispose();
          setRunning(false);
          setLevel(0);
        }, 5000);
        return;
      }
      recorder.current = rec;
      setFormat(rec.mimeType || codec || "Browser default");
      const chunks: BlobPart[] = [];
      const started = performance.now();
      const generation = recordingGeneration.current;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        if (!mounted.current || generation !== recordingGeneration.current)
          return;
        const blob = new Blob(chunks, {
          type: rec.mimeType || codec || "audio/webm",
        });
        setDuration(Math.min(5, (performance.now() - started) / 1000));
        setRecording(false);
        if (blob.size) {
          releaseUrl();
          url.current = URL.createObjectURL(blob);
          setPlayback(url.current);
        }
      };
      rec.start();
      setRecording(true);
      stopTimer.current = setTimeout(() => {
        dispose();
        setRunning(false);
        setRecording(false);
        setLevel(0);
      }, 5000);
    } catch (err) {
      if (token !== epoch.current || !mounted.current) return;
      dispose(false);
      const info = mediaError(err);
      setFailure({ status: info.status, reason: info.reason });
      setNotice(info.message);
      setBusy(false);
      setRunning(false);
      setRecording(false);
    }
  }
  return (
    <div className="td-module">
      <p>
        Choose Start and speak for up to five seconds. Audio stays in memory.
        Listen to your sample, then tell us whether it sounds clear.
      </p>
      <div className="td-toolbar">
        <button
          className="primary"
          onClick={() => void start()}
          disabled={busy || running}
        >
          {busy
            ? "Opening microphone…"
            : playback
              ? "Record another sample"
              : "Start microphone sample"}
        </button>
        {busy && (
          <button
            onClick={() => {
              dispose(false);
              setBusy(false);
              setFailure({
                status: "cancelled",
                reason: "user_cancelled_permission_wait",
              });
              setNotice(
                "Opening was cancelled. Your browser’s permission dialog may remain open; any late microphone stream will be stopped.",
              );
            }}
          >
            Cancel opening
          </button>
        )}
        {running && (
          <button
            onClick={() => {
              dispose();
              setRunning(false);
              setRecording(false);
              setLevel(0);
            }}
          >
            Stop sample
          </button>
        )}
      </div>
      {sources.length > 0 && (
        <label className="td-source">
          Microphone source{" "}
          <select
            value={selected}
            disabled={running}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Default microphone</option>
            {sources.map((s, i) => (
              <option key={s.deviceId || i} value={s.deviceId}>
                {s.label || `Microphone ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      {notice && (
        <div className="td-notice" role="status">
          {notice}
        </div>
      )}
      <div className="td-audio-panel">
        <div className={`td-record-indicator ${recording ? "recording" : ""}`}>
          {recording
            ? "Recording · speak now"
            : running
              ? "Listening to input"
              : playback
                ? "Sample ready to play"
                : "Ready when you are"}
        </div>
        <div
          className="td-meter"
          role="meter"
          aria-label="Live microphone level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, Math.round(level * 300))}
        >
          <span style={{ width: `${Math.min(100, level * 300)}%` }} />
        </div>
        <span>
          {inputObserved
            ? "Sound input received"
            : "Speak normally to observe input"}{" "}
          · {Math.round(peak * 100)}% peak normalized RMS
        </span>
      </div>
      {playback && (
        <div className="td-playback">
          <label>Listen to your local sample</label>
          <audio
            controls
            src={playback}
            onPlay={() => setPlayed(true)}
            preload="metadata"
          />
        </div>
      )}
      <p className="td-help">
        If you hear silence, check mute, input selection and Bluetooth routing.
        Noise suppression and automatic gain may change the recording. Playback
        scheduling alone does not confirm clarity.
      </p>
    </div>
  );
}
