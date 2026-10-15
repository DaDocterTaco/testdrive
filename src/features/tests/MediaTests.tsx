import { useEffect, useRef, useState } from "react";
import { fact, mediaError, useEvidence } from "./shared";
import type { Evidence, ModuleProps } from "./shared";
import type { Fact } from "../../types";
import {
  analyzeAudioSamples,
  analyzeFrame,
  createLocalRecognition,
  matchesMicrophonePhrase,
  MICROPHONE_PHRASE,
} from "./mediaAnalysis";
import type {
  LocalRecognition,
  LocalRecognitionConstructor,
} from "./mediaAnalysis";
import "./automation.css";

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
  const [complete, setComplete] = useState(false);
  const [remaining, setRemaining] = useState(4);
  const [brightness, setBrightness] = useState<number | null>(null);
  const [change, setChange] = useState(0);
  const [pixelSamples, setPixelSamples] = useState(0);
  const [frozen, setFrozen] = useState("");
  const cameraSummary =
    frames > 0
      ? brightness !== null && brightness < 0.035
        ? "Video frames arrived, but the sample was very dark. Check the lens cover and lighting."
        : "Video frames received. The camera opened and delivered a local video sample."
      : "No changing video timestamps were received during this sample. Retry with the lens uncovered.";
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
    const previousStream = stream.current;
    stream.current = null;
    previousStream?.getTracks().forEach((t) => t.stop());
    if (video.current) video.current.srcObject = null;
  }
  useEffect(() => {
    mounted.current = true;
    const hide = () => {
      if (document.hidden && (stream.current || promptTimer.current)) {
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
      automatic: {
        complete,
        summary: cameraSummary,
        attention: frames === 0 || (brightness !== null && brightness < 0.035),
      },
      facts: [
        ...history,
        fact(
          "camera.sample_complete",
          "Four-second automatic camera sample completed",
          complete,
        ),
        fact(
          "camera.pixel_samples",
          "Local frame brightness samples",
          pixelSamples,
        ),
        fact(
          "camera.mean_brightness",
          "Mean normalized sampled image brightness",
          brightness === null ? "Not measured" : Number(brightness.toFixed(4)),
          "Lighting and lens covers affect this observation. This is not a quality score.",
        ),
        fact(
          "camera.frame_change",
          "Largest normalized difference between sampled frames",
          Number(change.toFixed(4)),
          "A still scene may have no change. Changes may be motion, lighting or sensor noise; this does not establish camera quality.",
        ),
        fact(
          "camera.frame_observations",
          "Current-source advancing video timestamp observations",
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
          ? `${cameraSummary} Clarity, spots, blur and focus require your judgement.`
          : "No moving camera frames have been observed yet. Camera condition remains unassessed.",
    },
    [
      failure,
      frames,
      settings,
      captures,
      sourceLabel,
      history,
      error,
      complete,
      brightness,
      change,
      pixelSamples,
    ],
  );
  async function start(choice = "") {
    if (frames > 0)
      setHistory((old) =>
        [
          ...old,
          fact(
            `camera.previous_source.${old.length + 1}`,
            "Previously observed camera stream",
            `${sourceLabel.slice(0, 180)}: ${settings.width ?? "?"} × ${settings.height ?? "?"}; ${frames} advancing timestamp observations; ${captures} temporary captures.`,
            "Recorded before switching or retrying; it does not establish the current source’s condition.",
          ),
        ].slice(-20),
      );
    dispose();
    setCapture("");
    setFrozen("");
    setComplete(false);
    setRemaining(4);
    setBrightness(null);
    setChange(0);
    setPixelSamples(0);
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
      if (!track) throw new DOMException("No camera track", "NotFoundError");
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
      const started = performance.now();
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 24;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let previous: Uint8ClampedArray | undefined;
      let brightnessTotal = 0;
      let samples = 0;
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
          setSettings({
            ...track.getSettings(),
            width: v.videoWidth,
            height: v.videoHeight,
          });
          if (ctx) {
            try {
              ctx.drawImage(v, 0, 0, 32, 24);
              const data = ctx.getImageData(0, 0, 32, 24).data;
              const sample = analyzeFrame(data, previous);
              previous = data;
              brightnessTotal += sample.brightness;
              samples++;
              setPixelSamples(samples);
              setBrightness(brightnessTotal / samples);
              setChange((n) => Math.max(n, sample.change));
            } catch {
              /* Pixel access may be restricted; arriving video remains observable. */
            }
          }
        }
        const elapsed = (performance.now() - started) / 1000;
        setRemaining(Math.max(0, Math.ceil(4 - elapsed)));
        if (elapsed >= 4) {
          if (v && v.readyState >= 2 && v.videoWidth) {
            try {
              const preview = document.createElement("canvas");
              preview.width = Math.min(960, v.videoWidth);
              preview.height = Math.round(
                (preview.width * v.videoHeight) / v.videoWidth,
              );
              preview
                .getContext("2d")
                ?.drawImage(v, 0, 0, preview.width, preview.height);
              setFrozen(preview.toDataURL("image/jpeg", 0.75));
            } catch {
              /* A still preview is optional. */
            }
          }
          setComplete(true);
          dispose();
          setRunning(false);
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
        Choose Start camera, allow access, then wave a hand for four seconds. We
        check that video arrives and sample light and changes automatically. The
        camera turns off when the sample finishes. Images stay on this page.
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
              setComplete(false);
            }}
          >
            Stop camera
          </button>
        )}
        {running && (
          <span className="td-sample-countdown">
            {remaining}s remaining · wave your hand
          </span>
        )}
      </div>
      <details>
        <summary>Use a different camera</summary>
        <div className="td-toolbar">
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
      </details>
      {complete && (
        <div className="td-auto-status is-complete" role="status">
          <span className="td-auto-step">✓</span>
          <div>
            <strong>
              {frames > 0
                ? "Video frames received"
                : "Sample finished · no video observed"}
            </strong>
            <p>
              {cameraSummary} The camera is now off. You can continue, or add
              your own image-quality assessment below.
            </p>
          </div>
        </div>
      )}
      {error && (
        <div className="td-notice" role="status">
          {error}
        </div>
      )}
      <div className="td-camera-view">
        <video ref={video} muted playsInline aria-label="Live camera preview" />
        {frozen && !running && (
          <img
            className="td-camera-frozen"
            src={frozen}
            alt="Last camera sample, held in memory for optional visual inspection"
          />
        )}
        <span className="td-focus-target" aria-hidden="true" />
        {!running && !frozen && (
          <div className="td-media-placeholder">
            {busy ? "Waiting for camera access" : "Camera preview appears here"}
          </div>
        )}
        <span className="td-media-badge">
          {running ? sourceLabel : "Camera off"}
        </span>
      </div>
      {complete && (
        <div className="td-auto-readings">
          <div>
            <strong>{frames} samples</strong>Video timestamps advanced
          </div>
          <div>
            <strong>
              {brightness === null
                ? "Unavailable"
                : brightness < 0.035
                  ? "Very dark"
                  : "Light received"}
            </strong>
            Local brightness observation
          </div>
          <div>
            <strong>
              {change > 0.01 ? "Image changed" : "Little / no change"}
            </strong>
            Movement, lighting or noise can change pixels
          </div>
        </div>
      )}
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
      {frozen && (
        <button onClick={() => setFrozen("")}>Discard sample preview</button>
      )}
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
  const [complete, setComplete] = useState(false);
  const [remaining, setRemaining] = useState(5);
  const [sampleSeconds, setSampleSeconds] = useState(0);
  const [soundSamples, setSoundSamples] = useState(0);
  const [totalSamples, setTotalSamples] = useState(0);
  const [speechState, setSpeechState] = useState("not_started");
  const recognition = useRef<LocalRecognition | null>(null);
  const countdown = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleStarted = useRef(0);
  const microphoneSummary =
    totalSamples === 0
      ? "Sample finished. The sound meter was unavailable; listen to the recording to check the input."
      : soundSamples < 3
        ? "The sample was mostly quiet. Check mute, input selection and your distance from the microphone, then retry."
        : clipSamples > 2
          ? "Sound was received, with some samples close to digital clipping. Speak a little farther away and listen back."
          : "Sound received automatically during the five-second sample.";
  function releaseUrl() {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = "";
  }
  function dispose(keepRecording = true) {
    epoch.current++;
    cancelAnimationFrame(frame.current);
    if (countdown.current) {
      clearInterval(countdown.current);
      countdown.current = null;
    }
    if (recognition.current) {
      recognition.current.onresult = null;
      recognition.current.onerror = null;
      recognition.current.onend = null;
      try {
        recognition.current.abort();
      } catch {
        /* Already ended. */
      }
      recognition.current = null;
    }
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
    const previousStream = stream.current;
    stream.current = null;
    previousStream?.getTracks().forEach((t) => t.stop());
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
      if (document.hidden && (stream.current || promptTimer.current)) {
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
      automatic: {
        complete,
        summary: microphoneSummary,
        attention: totalSamples === 0 || soundSamples < 3 || clipSamples > 2,
      },
      facts: [
        ...history,
        fact(
          "microphone.sample_complete",
          "Five-second automatic input sample completed",
          complete,
        ),
        fact(
          "microphone.sample_seconds",
          "Automatic input observation duration",
          Number(sampleSeconds.toFixed(2)),
          undefined,
          "measured",
          "seconds",
        ),
        fact(
          "microphone.sound_samples",
          "Level samples above the sound threshold",
          soundSamples,
          "Sound can be speech, ambient noise or another source; this alone does not verify words.",
        ),
        fact(
          "microphone.level_samples",
          "Audio level samples analyzed",
          totalSamples,
        ),
        fact(
          "microphone.phrase_prompt",
          "Prompt shown for the sample",
          MICROPHONE_PHRASE,
          "Prompt displayed by TESTDRIVE; does not prove these words were spoken.",
          "measured",
        ),
        fact(
          "microphone.phrase_check",
          "On-device phrase check",
          speechState,
          "Only an already-installed local English recognizer is used, with the default input. Other engines are never started. A phrase match does not certify clarity.",
        ),
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
        : complete
          ? `${microphoneSummary} ${speechState === "matched" ? "The requested words were matched on this device." : "The requested words were not verified; playback remains available when recording is supported."} Audio quality needs your listening confirmation.`
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
      complete,
      sampleSeconds,
      soundSamples,
      totalSamples,
      speechState,
    ],
  );
  function archiveSample() {
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
  }
  function resetSample(opening: boolean) {
    dispose(false);
    releaseUrl();
    setPlayback("");
    setPlayed(false);
    setBusy(opening);
    setRunning(false);
    setRecording(false);
    setNotice("");
    setFailure({});
    setDuration(0);
    setLevel(0);
    setPeak(0);
    setInputObserved(false);
    setClipSamples(0);
    setFormat("");
    setSourceLabel("");
    setComplete(false);
    setRemaining(5);
    setSampleSeconds(0);
    setSoundSamples(0);
    setTotalSamples(0);
    setSpeechState("not_started");
    sampleStarted.current = 0;
  }
  async function start() {
    archiveSample();
    resetSample(true);
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
      const microphoneTrack = input.getAudioTracks()[0];
      if (!microphoneTrack)
        throw new DOMException("No microphone track", "NotFoundError");
      setSourceLabel(microphoneTrack.label || "Default microphone");
      setRunning(true);
      setBusy(false);
      microphoneTrack.addEventListener("ended", () => {
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
            const { rms, clipped, signal } = analyzeAudioSamples(data);
            setLevel(rms);
            if (sampleStarted.current) {
              setPeak((v) => Math.max(v, rms));
              setTotalSamples((v) => v + 1);
              if (signal) {
                setInputObserved(true);
                setSoundSamples((v) => v + 1);
              }
              if (clipped) setClipSamples((v) => v + 1);
            }
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
      sampleStarted.current = performance.now();
      countdown.current = setInterval(() => {
        const elapsed = Math.min(
          5,
          (performance.now() - sampleStarted.current) / 1000,
        );
        setSampleSeconds(elapsed);
        setRemaining(Math.max(0, Math.ceil(5 - elapsed)));
      }, 100);
      const finish = () => {
        setSampleSeconds(
          Math.min(5, (performance.now() - sampleStarted.current) / 1000),
        );
        setRemaining(0);
        setComplete(true);
        setSpeechState((s) =>
          s === "listening" || s === "checking" ? "not_matched" : s,
        );
        dispose();
        setRunning(false);
        setRecording(false);
        setLevel(0);
      };
      stopTimer.current = setTimeout(finish, 5000);
      // Optional phrase checking stays strictly on device; older/default
      // SpeechRecognition implementations are never started.
      if (!selected) {
        setSpeechState("checking");
        const speechWindow = window as unknown as {
          SpeechRecognition?: LocalRecognitionConstructor;
          webkitSpeechRecognition?: LocalRecognitionConstructor;
        };
        void createLocalRecognition(
          speechWindow.SpeechRecognition ??
            speechWindow.webkitSpeechRecognition,
        ).then((local) => {
          if (!mounted.current || token !== epoch.current) {
            try {
              local?.abort();
            } catch {
              /* Never started. */
            }
            return;
          }
          if (!local) {
            setSpeechState("unavailable");
            return;
          }
          recognition.current = local;
          local.lang = "en-US";
          local.continuous = false;
          local.interimResults = true;
          local.onresult = (event) => {
            if (!mounted.current || token !== epoch.current) return;
            const words = Array.from(event.results)
              .map((result) => result[0]?.transcript ?? "")
              .join(" ");
            if (matchesMicrophonePhrase(words)) setSpeechState("matched");
          };
          local.onerror = () => {
            if (mounted.current && token === epoch.current)
              setSpeechState((s) => (s === "matched" ? s : "unavailable"));
          };
          local.onend = () => {
            if (mounted.current && token === epoch.current)
              setSpeechState((s) => (s === "listening" ? "not_matched" : s));
          };
          try {
            local.start();
            setSpeechState("listening");
          } catch {
            setSpeechState("unavailable");
          }
        });
      } else setSpeechState("selected_input_not_supported");
      if (typeof MediaRecorder === "undefined") {
        setNotice(
          "Recording playback is unavailable here. The live meter can still observe input. The microphone will stop after five seconds.",
        );
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
        Choose Start, allow access, and read the sentence aloud. We check for
        sound automatically for five seconds, then turn the microphone off. Your
        recording stays in memory and is discarded when you leave.
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
              : complete
                ? "Try another sample"
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
              setSampleSeconds(
                sampleStarted.current
                  ? Math.min(
                      5,
                      (performance.now() - sampleStarted.current) / 1000,
                    )
                  : 0,
              );
              setComplete(false);
              setSpeechState((s) =>
                s === "listening" || s === "checking" ? "not_matched" : s,
              );
              setNotice(
                "Sample stopped early. Your partial observations remain available; start again for the full automatic check.",
              );
            }}
          >
            Stop sample
          </button>
        )}
      </div>
      {complete && (
        <div
          className={`td-auto-status ${soundSamples >= 3 ? "is-complete" : ""}`}
          role="status"
        >
          <span className="td-auto-step">{soundSamples >= 3 ? "✓" : "!"}</span>
          <div>
            <strong>
              {soundSamples >= 3
                ? "Sound received automatically"
                : "Sample finished · check your input"}
            </strong>
            <p>
              {microphoneSummary} The microphone is now off. You can save the
              observation or try again.
            </p>
          </div>
        </div>
      )}
      {sources.length > 0 && (
        <details>
          <summary>Use a different microphone</summary>
          <label className="td-source">
            Microphone source{" "}
            <select
              value={selected}
              disabled={running || busy}
              onChange={(e) => {
                archiveSample();
                resetSample(false);
                setSelected(e.target.value);
                setNotice(
                  "New microphone selected. Choose Start microphone sample to test this input.",
                );
              }}
            >
              <option value="">Default microphone</option>
              {sources.map((s, i) => (
                <option key={s.deviceId || i} value={s.deviceId}>
                  {s.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
        </details>
      )}
      {notice && (
        <div className="td-notice" role="status">
          {notice}
        </div>
      )}
      <div className="td-audio-panel">
        <span className="td-sample-caption">
          {running ? "Say this out loud now" : "When the sample starts, say"}
        </span>
        <blockquote className="td-sample-phrase">
          “{MICROPHONE_PHRASE}”
        </blockquote>
        <div className={`td-record-indicator ${recording ? "recording" : ""}`}>
          {recording
            ? "Recording · speak now"
            : running
              ? "Listening to input"
              : playback
                ? "Sample ready to play"
                : "Ready when you are"}
        </div>
        {running && (
          <span className="td-sample-countdown">{remaining}s remaining</span>
        )}
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
      {(running || complete) && (
        <div className="td-auto-readings">
          <div>
            <strong>
              {soundSamples >= 3
                ? "Sound detected"
                : totalSamples
                  ? "Quiet so far"
                  : "Checking…"}
            </strong>
            {soundSamples} of {totalSamples} level samples above threshold
          </div>
          <div>
            <strong>
              {clipSamples > 2
                ? "Some peaks too loud"
                : "No repeated clipping observed"}
            </strong>
            Try a normal speaking distance
          </div>
          <div>
            <strong>
              {speechState === "matched"
                ? "Phrase matched on device"
                : speechState === "listening"
                  ? "Checking words on device"
                  : "Words not verified"}
            </strong>
            {speechState === "matched"
              ? "The local recognizer matched the requested sentence."
              : "Sound detection works without word recognition."}
          </div>
        </div>
      )}
      {playback && (
        <div className="td-playback">
          <label>Optional: listen back to check clarity</label>
          <audio
            controls
            src={playback}
            onPlay={() => setPlayed(true)}
            preload="metadata"
          />
        </div>
      )}
      <p className="td-help">
        Sound can include background noise, so receiving it does not prove the
        words were spoken clearly. Phrase matching runs only when an English
        speech model is already available on this device, using the default
        input. We never start cloud speech recognition or download a speech
        model. If words are not verified, listen back to confirm them yourself.
        Silence can mean mute, routing or distance; it is not a hardware
        verdict.
      </p>
    </div>
  );
}
