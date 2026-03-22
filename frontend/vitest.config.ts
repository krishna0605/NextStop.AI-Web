import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/vitest.setup.tsx"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/lib/env.ts",
        "src/lib/google-workspace.ts",
        "src/lib/notion-workspace.ts",
        "src/lib/workspace-runtime.ts",
        "src/app/api/**/*.ts",
        "src/components/workspace/**/*.tsx",
      ],
    },
  },
});
