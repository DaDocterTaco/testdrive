/** xorshift32-v1: fixed seed and shifts; this is a browser workload, not CPU certification. */
export const WORKLOAD_VERSION = "xorshift32-v1";
export const BLOCK_ITERATIONS = 131072;
export const BLOCK_CHECKSUM = 934658367;
export const SAMPLE_BLOCKS = 256;
export function computeBlock(): number {
  let state = 0x12345678;
  for (let i = 0; i < BLOCK_ITERATIONS; i++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
  }
  return state;
}
