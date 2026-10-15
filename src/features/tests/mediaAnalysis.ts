export const MICROPHONE_PHRASE = "Testing my microphone, one two three.";
export const SIGNAL_THRESHOLD = 0.015;

/** UI observations, deliberately not a calibrated microphone quality score. */
export function analyzeAudioSamples(data: Uint8Array) {
  if (!data.length) return { rms: 0, clipped: false, signal: false };
  let sum = 0;
  let clipped = false;
  for (const n of data) {
    sum += ((n - 128) / 128) ** 2;
    if (n <= 1 || n >= 254) clipped = true;
  }
  const rms = Math.sqrt(sum / data.length);
  return { rms, clipped, signal: rms > SIGNAL_THRESHOLD };
}

/** Small local pixel samples are discarded; only these summaries become facts. */
export function analyzeFrame(
  data: Uint8ClampedArray,
  previous?: Uint8ClampedArray,
) {
  let brightness = 0;
  let change = 0;
  const pixels = Math.floor(data.length / 4);
  for (let i = 0; i < pixels * 4; i += 4) {
    const luma =
      (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    brightness += luma;
    if (previous?.length === data.length) {
      const before =
        (0.2126 * previous[i] +
          0.7152 * previous[i + 1] +
          0.0722 * previous[i + 2]) /
        255;
      change += Math.abs(luma - before);
    }
  }
  return {
    brightness: pixels ? brightness / pixels : 0,
    change: pixels && previous?.length === data.length ? change / pixels : 0,
  };
}

export function matchesMicrophonePhrase(transcript: string) {
  const normalized = transcript
    .toLowerCase()
    .replace(/123/g, "one two three")
    .replace(/\b1\b/g, "one")
    .replace(/\b2\b/g, "two")
    .replace(/\b3\b/g, "three")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.includes("testing my microphone one two three");
}

export interface LocalRecognition {
  processLocally: boolean;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
}
export interface LocalRecognitionConstructor {
  new (): LocalRecognition;
  available?: (options: {
    langs: string[];
    processLocally: true;
  }) => Promise<string>;
}

/** Never starts a remote/default engine or downloads a speech pack. */
export async function createLocalRecognition(
  ctor?: LocalRecognitionConstructor,
): Promise<LocalRecognition | null> {
  if (!ctor || typeof ctor.available !== "function") return null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const instance = new ctor();
    if (!("processLocally" in instance)) return null;
    instance.processLocally = true;
    if (instance.processLocally !== true) return null;
    const status = await Promise.race([
      ctor.available({ langs: ["en-US"], processLocally: true }),
      new Promise<string>((resolve) => {
        timeout = setTimeout(() => resolve("timeout"), 700);
      }),
    ]);
    return status === "available" ? instance : null;
  } catch {
    return null;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
