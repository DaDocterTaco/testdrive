import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAutomatic } from "../../src/diagnostics";
import {
  BLOCK_CHECKSUM,
  BLOCK_ITERATIONS,
  SAMPLE_BLOCKS,
} from "../../src/diagnostics/workload";

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: { data: unknown }) => void) | undefined;
  onerror: (() => void) | undefined;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instances.push(this);
  }
}
let doc: EventTarget & {
  visibilityState: string;
  createElement: () => { getContext: () => null };
};
beforeEach(() => {
  FakeWorker.instances = [];
  doc = Object.assign(new EventTarget(), {
    visibilityState: "visible",
    createElement: () => ({ getContext: () => null }),
  });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("Worker", FakeWorker);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("automatic worker lifecycle", () => {
  it("terminates the worker on stop, keeping condition unassessed", async () => {
    const controller = new AbortController();
    const pending = runAutomatic("PERF-01", controller.signal);
    const worker = FakeWorker.instances[0];
    controller.abort();
    const result = await pending;
    expect(result.status).toBe("cancelled");
    expect(result.finding).toBe("not_assessed");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("terminates immediately when the document becomes hidden and discards measurement", async () => {
    const pending = runAutomatic("PERF-01", new AbortController().signal);
    const worker = FakeWorker.instances[0];
    doc.visibilityState = "hidden";
    doc.dispatchEvent(new Event("visibilitychange"));
    const result = await pending;
    expect(result.status).toBe("interrupted");
    expect(result.reasonCode).toBe("background_tab");
    expect(result.facts).toEqual([]);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("does not start timed work in a hidden tab", async () => {
    doc.visibilityState = "hidden";
    const result = await runAutomatic("PERF-01", new AbortController().signal);
    expect(result.status).toBe("interrupted");
    expect(FakeWorker.instances).toHaveLength(0);
  });
  it("bounds an unresponsive worker and removes it", async () => {
    vi.useFakeTimers();
    const pending = runAutomatic("PERF-01", new AbortController().signal);
    const worker = FakeWorker.instances[0];
    await vi.advanceTimersByTimeAsync(2801);
    const result = await pending;
    expect(result.status).toBe("interrupted");
    expect(result.reasonCode).toBe("time_budget");
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("rejects a bad checksum without recording throughput", async () => {
    const pending = runAutomatic("PERF-01", new AbortController().signal);
    const worker = FakeWorker.instances[0];
    worker.onmessage?.({
      data: {
        checksum: 42,
        iterations: BLOCK_ITERATIONS * SAMPLE_BLOCKS,
        duration: 100,
      },
    });
    const result = await pending;
    expect(result.status).toBe("error");
    expect(result.reasonCode).toBe("checksum_mismatch");
    expect(result.facts).toEqual([]);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("records measured iterations and duration only after a verified fixed workload", async () => {
    const pending = runAutomatic("PERF-01", new AbortController().signal);
    const worker = FakeWorker.instances[0];
    worker.onmessage?.({
      data: {
        checksum: BLOCK_CHECKSUM,
        iterations: BLOCK_ITERATIONS * SAMPLE_BLOCKS,
        duration: 100,
        warmupIterations: BLOCK_ITERATIONS,
      },
    });
    const result = await pending;
    expect(result.status).toBe("completed");
    expect(result.testVersion).toBe("xorshift32-v1");
    expect(result.finding).toBe("observed");
    expect(
      result.facts.find((f) => f.key === "processing_iterations")?.value,
    ).toBe(BLOCK_ITERATIONS * SAMPLE_BLOCKS);
    expect(
      result.facts.find((f) => f.key === "processing_throughput")?.value,
    ).toBe(335.54);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it("contains worker errors and does not call them CPU faults", async () => {
    const pending = runAutomatic("PERF-01", new AbortController().signal);
    FakeWorker.instances[0].onerror?.();
    const result = await pending;
    expect(result.status).toBe("error");
    expect(result.finding).toBe("not_assessed");
    expect(result.explanation).toContain("does not establish");
  });
});
