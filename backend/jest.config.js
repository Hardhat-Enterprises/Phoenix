/**
 * Shared Jest config for the Phoenix backend monorepo.
 *
 * Any service (user-service, notification-service, storage-service, etc.)
 * can add test files under its own src/** folder using the
 * *.test.ts or *.spec.ts naming convention.
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",

  testMatch: [
    "**/src/**/*.test.ts",
    "**/src/**/*.spec.ts",
  ],

  testPathIgnorePatterns: ["/node_modules/", "/dist/"],

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
        tsconfig: "<rootDir>/tsconfig.jest.json",
        diagnostics: {
          warnOnly: true,
        },
        compilerOptions: {
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