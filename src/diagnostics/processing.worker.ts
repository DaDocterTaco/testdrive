import {
  BLOCK_CHECKSUM,
  BLOCK_ITERATIONS,
  SAMPLE_BLOCKS,
  computeBlock,
} from "./workload";

const scope = self as unknown as {
  onmessage: (() => void) | null;
  postMessage: (data: unknown) => void;
};
scope.onmessage = () => {
  const warmup = computeBlock();
  if (warmup !== BLOCK_CHECKSUM) {
    scope.postMessage({ error: "checksum" });
    return;
  }
  const start = performance.now();
  let checksum = 0;
  for (let block = 0; block < SAMPLE_BLOCKS; block++) {
    checksum = computeBlock();
    if (checksum !== BLOCK_CHECKSUM) {
      scope.postMessage({ error: "checksum" });
      return;
    }
    if (performance.now() - start > 2400) {
      scope.postMessage({ error: "budget" });
      return;
    }
  }
  scope.postMessage({
    checksum,
    iterations: BLOCK_ITERATIONS * SAMPLE_BLOCKS,
    duration: performance.now() - start,
    warmupIterations: BLOCK_ITERATIONS,
  });
};
