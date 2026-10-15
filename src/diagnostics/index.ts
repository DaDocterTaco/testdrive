import type {
  Capabilities,
  DeviceClass,
  Fact,
  SourceKind,
  TestAttempt,
  TestDefinition,
  TestId,
} from "../types";
import {
  BLOCK_CHECKSUM,
  BLOCK_ITERATIONS,
  SAMPLE_BLOCKS,
  WORKLOAD_VERSION,
} from "./workload";

export function makeFact(
  key: string,
  label: string,
  value: string | number | boolean,
  source: SourceKind,
  qualification?: string,
): Fact {
  return {
    id: crypto.randomUUID(),
    key,
    label,
    value,
    source,
    observedAt: new Date().toISOString(),
    ...(qualification ? { qualification } : {}),
  };
}
export const TESTS: TestDefinition[] = [
  {
    id: "SYS-01",
    title: "Device profile",
    description:
      "Collect the information this browser makes available, with its limitations.",
    mode: "automatic",
    group: "performance",
    duration: "A moment",
  },
  {
    id: "PERF-01",
    title: "Processing sample",
    description:
      "Run a small, fixed and verified computation in one background worker.",
    mode: "automatic",
    group: "performance",
    duration: "Up to 3 seconds",
  },
  {
    id: "GFX-01",
    title: "Graphics rendering",
    description: "Draw a known WebGL scene and read back its actual pixels.",
    mode: "automatic",
    group: "performance",
    duration: "Up to 3 seconds",
  },
  {
    id: "KEY-01",
    title: "Keyboard",
    description: "Press physical keys and see which ones the browser receives.",
    mode: "guided",
    group: "input",
    duration: "1–2 minutes",
  },
  {
    id: "PTR-01",
    title: "Mouse & trackpad",
    description: "Move, click, drag, and scroll within a bounded test surface.",
    mode: "guided",
    group: "input",
    duration: "30–60 seconds",
  },
  {
    id: "TOUCH-01",
    title: "Touchscreen",
    description:
      "Sweep the actual touch area and try multiple fingers together.",
    mode: "guided",
    group: "input",
    duration: "30–60 seconds",
  },
  {
    id: "CAM-01",
    title: "Camera",
    description: "Open a live preview, check frames, and inspect clarity.",
    mode: "guided",
    group: "media",
    duration: "30–60 seconds",
  },
  {
    id: "MIC-01",
    title: "Microphone",
    description: "Record a short local sample and listen back to it.",
    mode: "guided",
    group: "media",
    duration: "30–60 seconds",
  },
  {
    id: "SPK-01",
    title: "Speakers",
    description: "Play a quiet test sample and confirm what you hear.",
    mode: "guided",
    group: "media",
    duration: "30–60 seconds",
  },
  {
    id: "PWR-01",
    title: "Battery & charger",
    description: "See reported charge and check whether connecting power changes the charging state.",
    mode: "guided",
    group: "performance",
    duration: "30–60 seconds",
  },
  {
    id: "DISP-01",
    title: "Display",
    description: "Inspect static colors for visible spots or unevenness.",
    mode: "guided",
    group: "display",
    duration: "30–60 seconds",
  },
];
function graphicsContext(
  canvas: HTMLCanvasElement,
): WebGLRenderingContext | null {
  try {
    return canvas.getContext("webgl", {
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
}
function releaseContext(gl: WebGLRenderingContext): void {
  gl.getExtension("WEBGL_lose_context")?.loseContext();
}
export function detectDevice(): {
  deviceClass: DeviceClass;
  facts: Fact[];
  capabilities: Capabilities;
} {
  const nav = typeof navigator === "undefined" ? undefined : navigator;
  const win = typeof window === "undefined" ? undefined : window;
  const ua = nav?.userAgent ?? "";
  const touchCount = nav?.maxTouchPoints ?? 0;
  let deviceClass: DeviceClass = "unknown";
  if (
    /iPad|Tablet/i.test(ua) ||
    (/Macintosh/.test(ua) && touchCount > 1) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua))
  )
    deviceClass = "tablet";
  else if (/iPhone|iPod|Android.*Mobile/i.test(ua)) deviceClass = "phone";
  else if (/Windows|Macintosh|Linux|CrOS/i.test(ua)) deviceClass = "computer";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Android/i.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && touchCount > 1)
        ? "iOS / iPadOS"
        : /Macintosh/i.test(ua)
          ? "macOS"
          : /CrOS/i.test(ua)
            ? "ChromeOS"
            : /Linux/i.test(ua)
              ? "Linux"
              : "Unknown";
  const browser = /Edg(?:e|A|iOS)?\//.test(ua)
    ? "Microsoft Edge"
    : /Firefox\/|FxiOS\//.test(ua)
      ? "Firefox"
      : /CriOS|Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Unknown";
  const facts: Fact[] = [
    makeFact(
      "os",
      "Operating system",
      os,
      "browser_reported",
      "Reported family only; browser information may be reduced or generalized.",
    ),
    makeFact(
      "browser",
      "Browser",
      browser,
      "browser_reported",
      "Reported family only; privacy settings may change this information.",
    ),
    makeFact(
      "device_class",
      "Suggested device type",
      deviceClass,
      "browser_reported",
      "A convenience suggestion; you can correct this in setup.",
    ),
    makeFact(
      "secure_context",
      "Secure browser context",
      globalThis.isSecureContext === true,
      "browser_reported",
    ),
    makeFact(
      "touch_points_hint",
      "Reported touch points",
      touchCount,
      "browser_reported",
      "Capability hint; this is not a tested simultaneous-touch count.",
    ),
  ];
  if (nav?.hardwareConcurrency)
    facts.push(
      makeFact(
        "logical_processors",
        "Available logical processors",
        nav.hardwareConcurrency,
        "browser_reported",
        "The browser may limit this hint. This is not a physical-core count or exact CPU model.",
      ),
    );
  const memory = (nav as (Navigator & { deviceMemory?: number }) | undefined)
    ?.deviceMemory;
  if (memory && Number.isFinite(memory))
    facts.push({
      ...makeFact(
        "memory_hint",
        "Approximate browser memory hint",
        memory,
        "browser_reported",
        "A coarse, privacy-limited hint; this is not installed RAM and is not used for listing comparisons.",
      ),
      unit: "GiB",
    });
  if (win) {
    facts.push(
      makeFact(
        "display_css",
        "Display size in CSS pixels",
        `${win.screen.width} × ${win.screen.height}`,
        "browser_reported",
        "CSS screen dimensions, not native physical panel resolution.",
      ),
    );
    facts.push(
      makeFact(
        "viewport_css",
        "Browser viewport",
        `${win.innerWidth} × ${win.innerHeight}`,
        "browser_reported",
        "Only the page area available to this browser.",
      ),
    );
    facts.push(
      makeFact(
        "pixel_ratio",
        "Device pixel ratio",
        win.devicePixelRatio || 1,
        "browser_reported",
      ),
    );
  }
  let webgl = false;
  if (typeof document !== "undefined") {
    const gl = graphicsContext(document.createElement("canvas"));
    if (gl) {
      webgl = true;
      try {
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const renderer = gl.getParameter(
          ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER,
        ) as unknown;
        if (typeof renderer === "string" && renderer)
          facts.push(
            makeFact(
              "graphics_renderer",
              "Browser graphics renderer",
              renderer.slice(0, 500),
              "browser_reported",
              "May be masked, generalized, or software-backed. This does not independently identify the installed GPU.",
            ),
          );
      } finally {
        releaseContext(gl);
      }
    }
  }
  const secureContext = globalThis.isSecureContext === true;
  const media =
    secureContext && typeof nav?.mediaDevices?.getUserMedia === "function";
  return {
    deviceClass,
    facts,
    capabilities: {
      touch: touchCount > 0 || (!!win && "ontouchstart" in win),
      camera: media,
      microphone: media,
      webgl,
      worker: typeof Worker !== "undefined",
      secureContext,
    },
  };
}
function attempt(
  testId: TestId,
  startedAt: string,
  details: Partial<TestAttempt>,
): TestAttempt {
  return {
    id: crypto.randomUUID(),
    testId,
    testVersion: testId === "PERF-01" ? WORKLOAD_VERSION : "1.0.0",
    status: "completed",
    startedAt,
    endedAt: new Date().toISOString(),
    facts: [],
    finding: "observed",
    explanation: "Browser observation recorded.",
    ...details,
  };
}
function unfinished(
  testId: TestId,
  startedAt: string,
  status: TestAttempt["status"],
  reasonCode: string,
  explanation: string,
): TestAttempt {
  return attempt(testId, startedAt, {
    status,
    reasonCode,
    explanation,
    finding: "not_assessed",
    nextStep:
      "Keep this tab visible and retry, or continue with the remaining checks.",
  });
}
async function processing(
  signal: AbortSignal,
  startedAt: string,
): Promise<TestAttempt> {
  if (typeof Worker === "undefined")
    return unfinished(
      "PERF-01",
      startedAt,
      "unsupported",
      "worker_unavailable",
      "This browser does not expose a background worker. Processing remains unchecked.",
    );
  if (document.visibilityState === "hidden")
    return unfinished(
      "PERF-01",
      startedAt,
      "interrupted",
      "background_tab",
      "The tab was hidden. A timing sample would not be reliable.",
    );
  return new Promise((resolve) => {
    let worker: Worker | undefined;
    let done = false;
    const began = performance.now();
    const finish = (result: TestAttempt) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      worker?.terminate();
      signal.removeEventListener("abort", cancel);
      document.removeEventListener("visibilitychange", visibility);
      resolve(result);
    };
    const cancel = () =>
      finish(
        unfinished(
          "PERF-01",
          startedAt,
          "cancelled",
          "user_stopped",
          "You stopped the processing sample. No completed measurement was recorded.",
        ),
      );
    const visibility = () => {
      if (document.visibilityState === "hidden")
        finish(
          unfinished(
            "PERF-01",
            startedAt,
            "interrupted",
            "background_tab",
            "The tab became hidden. The worker was stopped and the timing sample discarded.",
          ),
        );
    };
    const timeout = setTimeout(
      () =>
        finish(
          unfinished(
            "PERF-01",
            startedAt,
            "interrupted",
            "time_budget",
            "The fixed workload exceeded its 3-second budget or the device slept. Retry with this tab visible.",
          ),
        ),
      2800,
    );
    signal.addEventListener("abort", cancel, { once: true });
    document.addEventListener("visibilitychange", visibility);
    if (signal.aborted) {
      cancel();
      return;
    }
    try {
      worker = new Worker(new URL("./processing.worker.ts", import.meta.url), {
        type: "module",
      });
      worker.onerror = () =>
        finish(
          unfinished(
            "PERF-01",
            startedAt,
            "error",
            "worker_error",
            "The browser could not complete the worker. This does not establish a CPU hardware fault.",
          ),
        );
      worker.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data as {
          checksum?: number;
          iterations?: number;
          duration?: number;
          warmupIterations?: number;
          error?: string;
        };
        if (data.error === "budget" || performance.now() - began > 3000) {
          finish(
            unfinished(
              "PERF-01",
              startedAt,
              "interrupted",
              "time_budget",
              "The workload exceeded its time budget or the timer environment changed. The sample was discarded.",
            ),
          );
          return;
        }
        if (
          data.error ||
          data.checksum !== BLOCK_CHECKSUM ||
          data.iterations !== BLOCK_ITERATIONS * SAMPLE_BLOCKS ||
          !data.duration ||
          data.duration <= 0 ||
          data.duration > 2500
        ) {
          finish(
            unfinished(
              "PERF-01",
              startedAt,
              "error",
              "checksum_mismatch",
              "The deterministic workload could not be verified. No throughput result was recorded.",
            ),
          );
          return;
        }
        const facts = [
          makeFact(
            "processing_iterations",
            "Verified computation iterations",
            data.iterations,
            "measured",
          ),
          {
            ...makeFact(
              "processing_duration",
              "Active computation duration",
              Number(data.duration.toFixed(2)),
              "measured",
            ),
            unit: "ms",
          },
          {
            ...makeFact(
              "processing_throughput",
              "Browser processing sample",
              Number((data.iterations / data.duration / 1000).toFixed(2)),
              "measured",
              "Millions of xorshift32 iterations per second in this session. No cross-device score or hardware-health judgement.",
            ),
            unit: "million iterations/s",
          },
          makeFact(
            "processing_checksum",
            "Verified checksum",
            data.checksum,
            "measured",
          ),
          makeFact(
            "processing_warmup",
            "Warmup policy",
            `One unmeasured block of ${BLOCK_ITERATIONS} iterations; one worker`,
            "measured",
          ),
          makeFact(
            "processing_visibility",
            "Tab visibility during sample",
            "visible",
            "measured",
          ),
          ...detectDevice().facts.filter((f) =>
            ["browser", "logical_processors", "memory_hint"].includes(f.key),
          ),
        ];
        finish(
          attempt("PERF-01", startedAt, {
            facts,
            explanation:
              "The fixed browser workload completed and its checksum matched. This measures this session only; background load and power settings affect timing.",
          }),
        );
      };
      worker.postMessage({ run: true });
    } catch {
      finish(
        unfinished(
          "PERF-01",
          startedAt,
          "unsupported",
          "worker_blocked",
          "A browser policy blocked the background worker. Processing remains unchecked.",
        ),
      );
    }
  });
}
async function graphics(
  signal: AbortSignal,
  startedAt: string,
): Promise<TestAttempt> {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 144;
  const gl = graphicsContext(canvas);
  if (!gl)
    return unfinished(
      "GFX-01",
      startedAt,
      "unsupported",
      "webgl_unavailable",
      "WebGL is unavailable in this browser/environment. This does not mean the GPU is broken.",
    );
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  const shaders: WebGLShader[] = [];
  try {
    const compile = (kind: number, source: string) => {
      const shader = gl.createShader(kind);
      if (!shader) throw new Error("shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error("shader");
      return shader;
    };
    program = gl.createProgram();
    if (!program) throw new Error("program");
    gl.attachShader(
      program,
      compile(
        gl.VERTEX_SHADER,
        "attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}",
      ),
    );
    gl.attachShader(
      program,
      compile(
        gl.FRAGMENT_SHADER,
        "precision mediump float; void main(){gl_FragColor=vec4(0.25,0.5,0.75,1.0);}",
      ),
    );
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("link");
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error("buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.DITHER);
    const intervals: number[] = [];
    let frames = 0;
    const begin = performance.now();
    let previous = begin;
    while (frames < 30 && performance.now() - begin < 900) {
      if (signal.aborted)
        return unfinished(
          "GFX-01",
          startedAt,
          "cancelled",
          "user_stopped",
          "You stopped the graphics check.",
        );
      if (document.visibilityState === "hidden")
        return unfinished(
          "GFX-01",
          startedAt,
          "interrupted",
          "background_tab",
          "The tab became hidden. The graphics timing sample was discarded.",
        );
      const timestamp = await new Promise<number>((resolve) => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            cancelAnimationFrame(frame);
            resolve(performance.now());
          }
        }, 250);
        const frame = requestAnimationFrame((now) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve(now);
          }
        });
      });
      if (timestamp - previous > 250 || performance.now() - begin > 2800)
        return unfinished(
          "GFX-01",
          startedAt,
          "interrupted",
          "timer_interruption",
          "Rendering was interrupted or the device slept. Retry with this tab visible.",
        );
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (frames > 0) intervals.push(timestamp - previous);
      previous = timestamp;
      frames++;
    }
    if (signal.aborted)
      return unfinished(
        "GFX-01",
        startedAt,
        "cancelled",
        "user_stopped",
        "You stopped the graphics check.",
      );
    if (gl.isContextLost())
      return unfinished(
        "GFX-01",
        startedAt,
        "error",
        "context_lost",
        "The graphics context was lost. Close demanding tabs and retry; this alone does not diagnose GPU hardware.",
      );
    const pixel = new Uint8Array(4);
    gl.readPixels(128, 72, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const correct = [64, 128, 191, 255].every(
      (value, i) => Math.abs(pixel[i] - value) <= 1,
    );
    if (gl.getError() !== gl.NO_ERROR || !correct)
      return unfinished(
        "GFX-01",
        startedAt,
        "error",
        "render_verification",
        "The known graphics scene did not read back as expected. Retry in a different browser before drawing a hardware conclusion.",
      );
    const facts = [
      makeFact(
        "graphics_scene",
        "Verified graphics scene",
        "WebGL 1 · 256 × 144 · solid-color triangle",
        "measured",
      ),
      makeFact(
        "graphics_pixel",
        "Read-back pixel (RGBA)",
        [...pixel].join(", "),
        "measured",
      ),
      makeFact("graphics_frames", "Frames drawn", frames, "measured"),
    ];
    const positive = intervals.filter((n) => n > 0).sort((a, b) => a - b);
    if (positive.length)
      facts.push({
        ...makeFact(
          "graphics_frame_interval",
          "Median browser frame interval",
          Number(positive[Math.floor(positive.length / 2)].toFixed(2)),
          "measured",
          "Browser scheduling behavior, not a certified panel refresh rate.",
        ),
        unit: "ms",
      });
    return attempt("GFX-01", startedAt, {
      facts,
      explanation:
        "A real WebGL scene rendered and its read-back pixel matched the known color. This is a small rendering check, not a full GPU stress test.",
    });
  } catch {
    return unfinished(
      "GFX-01",
      startedAt,
      "error",
      "render_error",
      "The browser reported an error preparing the graphics scene. Retry; this is not proof of a physical GPU defect.",
    );
  } finally {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((s) => gl.deleteShader(s));
    releaseContext(gl);
    canvas.width = 1;
    canvas.height = 1;
  }
}
export async function runAutomatic(
  testId: TestId,
  signal: AbortSignal,
): Promise<TestAttempt> {
  const startedAt = new Date().toISOString();
  if (signal.aborted)
    return unfinished(
      testId,
      startedAt,
      "cancelled",
      "user_stopped",
      "You stopped this check before it started.",
    );
  try {
    if (testId === "SYS-01")
      return attempt(testId, startedAt, {
        facts: detectDevice().facts,
        explanation:
          "Collected the information available without permission. Missing exact specifications remain unknown; this profile is not a hardware-health pass.",
      });
    if (testId === "PERF-01") return await processing(signal, startedAt);
    if (testId === "GFX-01") return await graphics(signal, startedAt);
    return unfinished(
      testId,
      startedAt,
      "unsupported",
      "guided_test",
      "This check needs your participation. Open its guided test to continue.",
    );
  } catch {
    return unfinished(
      testId,
      startedAt,
      "error",
      "browser_error",
      "The browser could not complete this check. Earlier observations are preserved; you can retry or continue.",
    );
  }
}
