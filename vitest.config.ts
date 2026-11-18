import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/sim/**/*.test.ts"], testTimeout: 30_000 },
});
