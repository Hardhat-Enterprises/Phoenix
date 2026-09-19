module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/notification-service/src"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json"
      }
    ]
  },
  moduleNameMapper: {
    "^@phoenix/common$": "<rootDir>/libs/common/src/index.ts",
    "^@phoenix/common/(.*)$": "<rootDir>/libs/common/src/$1"
  }
};