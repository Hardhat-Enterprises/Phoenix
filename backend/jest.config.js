/**
 * Shared Jest config for the Phoenix backend monorepo.
 *
 * Any service (user-service, notification-service, storage-service, etc.)
 * can add test files under its own src/** folder using the
 * *.test.ts or *.spec.ts naming convention and they will be picked
 * up automatically — no per-service Jest config needed.
 *
 * Path aliases (@phoenix/common, @phoenix/*) mirror the ones defined in
 * the root tsconfig.json so imports resolve the same way in tests as
 * they do at build time.
 */

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",

  testMatch: [
    "**/src/**/*.test.ts",
    "**/src/**/*.spec.ts",
  ],

  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ],

  moduleNameMapper: {
    "^@phoenix/common$": "<rootDir>/libs/common/src/index.ts",
    "^@phoenix/common/(.*)$": "<rootDir>/libs/common/src/$1",

    "^@phoenix/database$": "<rootDir>/libs/database/src",
    "^@phoenix/database/(.*)$": "<rootDir>/libs/database/src/$1",

    "^@phoenix/(.*)$": "<rootDir>/libs/$1/src",
  },

  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          moduleResolution: "node",
          skipLibCheck: true,
        },
      },
    ],
  },

  collectCoverageFrom: [
    "**/src/**/*.ts",
    "!**/src/**/*.test.ts",
    "!**/src/**/*.spec.ts",
  ],

  clearMocks: true,
};