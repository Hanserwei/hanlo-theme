import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/markmap-runtime.test.ts"],
    testTimeout: 10_000,
  },
});
