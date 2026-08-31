/** @type {import('jest').Config} */
module.exports = {
preset: "ts-jest",
testEnvironment: "node",

globals: {
  "ts-jest": {
    tsconfig: "<rootDir>/tsconfig.json",
  },
},

  roots: ["<rootDir>/notification-service"],

  testMatch: [
    "**/tests/**/*.test.ts",
    "**/tests/**/*.spec.ts"
  ],

  moduleNameMapper: {
    "^@phoenix/common$": "<rootDir>/libs/common/src/index.ts",
    "^@phoenix/common/(.*)$": "<rootDir>/libs/common/src/$1",

    "^@phoenix/database$": "<rootDir>/libs/database/src",
    "^@phoenix/database/(.*)$": "<rootDir>/libs/database/src/$1",

    "^@phoenix/(.*)$": "<rootDir>/libs/$1/src"
  },

  moduleFileExtensions: ["ts", "js", "json"],

  collectCoverageFrom: [
    "notification-service/src/**/*.ts",
    "!notification-service/src/**/*.d.ts"
  ]
};