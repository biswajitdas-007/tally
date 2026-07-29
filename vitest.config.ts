import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // lcov for Sonar, text for the terminal.
      reporter: ["text-summary", "lcov"],
      // Only the logic layer. Components need a DOM and a renderer we don't
      // have set up, so measuring them here would report a number that means
      // nothing rather than a gap anyone can close.
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts", "src/lib/types.ts"],
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
