import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeAudioSamples,
  analyzeFrame,
  createLocalRecognition,
  matchesMicrophonePhrase,
} from "../../src/features/tests/mediaAnalysis";
import type { LocalRecognition } from "../../src/features/tests/mediaAnalysis";

afterEach(() => vi.useRealTimers());
describe("local media observations", () => {
  it("distinguishes digital silence, a real varying signal and clipping", () => {
    expect(analyzeAudioSamples(new Uint8Array(1024).fill(128))).toEqual({
      rms: 0,
      clipped: false,
      signal: false,
    });
    const wave = Uint8Array.from({ length: 1024 }, (_, i) =>
      Math.round(128 + 30 * Math.sin(i / 10)),
    );
    expect(analyzeAudioSamples(wave)).toMatchObject({
      signal: true,
      clipped: false,
    });
    expect(analyzeAudioSamples(new Uint8Array([0, 255]))).toMatchObject({
      signal: true,
      clipped: true,
    });
    expect(analyzeAudioSamples(new Uint8Array())).toEqual({
      rms: 0,
      clipped: false,
      signal: false,
    });
  });
  it("records light and pixel change without claiming movement or quality", () => {
    const black = new Uint8ClampedArray([0, 0, 0, 255]);
    const white = new Uint8ClampedArray([255, 255, 255, 255]);
    expect(analyzeFrame(black)).toEqual({ brightness: 0, change: 0 });
    expect(analyzeFrame(white, black).brightness).toBeCloseTo(1);
    expect(analyzeFrame(white, black).change).toBeCloseTo(1);
    expect(analyzeFrame(white, white).change).toBe(0);
  });
  it("matches only the requested phrase, including spoken-number transcription", () => {
    expect(
      matchesMicrophonePhrase("Testing my microphone, one two three."),
    ).toBe(true);
    expect(matchesMicrophonePhrase("testing my microphone 1 2 3")).toBe(true);
    expect(matchesMicrophonePhrase("Testing my microphone 123")).toBe(true);
    expect(matchesMicrophonePhrase("This microphone is fine")).toBe(false);
    expect(matchesMicrophonePhrase("testing my microphone one two")).toBe(
      false,
    );
  });
});

class InstalledLocalRecognizer implements LocalRecognition {
  static available = vi.fn(async () => "available");
  processLocally = false;
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: LocalRecognition["onresult"] = null;
  onerror: LocalRecognition["onerror"] = null;
  onend: LocalRecognition["onend"] = null;
  start = vi.fn();
  abort = vi.fn();
}
describe("speech privacy gate", () => {
  it("falls back without an API and never starts a default remote recognizer", async () => {
    expect(await createLocalRecognition()).toBeNull();
    class LegacyRecognizer extends InstalledLocalRecognizer {
      constructor() {
        super();
        delete (this as Partial<LocalRecognition>).processLocally;
      }
    }
    expect(await createLocalRecognition(LegacyRecognizer)).toBeNull();
  });
  it("requires installed local support and sets processLocally before returning an instance", async () => {
    const local = await createLocalRecognition(InstalledLocalRecognizer);
    expect(local?.processLocally).toBe(true);
    expect(InstalledLocalRecognizer.available).toHaveBeenCalledWith({
      langs: ["en-US"],
      processLocally: true,
    });
    expect(local?.start).not.toHaveBeenCalled();
  });
  it("does not download a model or fall back to cloud for downloadable languages", async () => {
    class DownloadableRecognizer extends InstalledLocalRecognizer {
      static available = vi.fn(async () => "downloadable");
    }
    expect(await createLocalRecognition(DownloadableRecognizer)).toBeNull();
  });
  it("bounds a hanging local capability check and handles denied policy", async () => {
    vi.useFakeTimers();
    class HangingRecognizer extends InstalledLocalRecognizer {
      static available = vi.fn(() => new Promise<string>(() => {}));
    }
    const pending = createLocalRecognition(HangingRecognizer);
    await vi.advanceTimersByTimeAsync(701);
    expect(await pending).toBeNull();
    class DeniedRecognizer extends InstalledLocalRecognizer {
      static available = vi.fn(async (): Promise<string> => {
        throw new DOMException("Not permitted", "NotAllowedError");
      });
    }
    expect(await createLocalRecognition(DeniedRecognizer)).toBeNull();
  });
});
