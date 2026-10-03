import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@phoenix\/common$/,
        replacement: path.resolve(
          import.meta.dirname,
          "libs/common/src/index.ts",
        ),
      },
      {
        find: /^@phoenix\/common\/(.+)$/,
        replacement: path.resolve(
          import.meta.dirname,
          "libs/common/src/$1",
        ),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["api-gateway/src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
});