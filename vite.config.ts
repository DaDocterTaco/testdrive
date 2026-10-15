import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: { target: ["es2022", "safari16"] },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
