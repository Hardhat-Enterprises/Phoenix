module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  setupFiles: [
    "<rootDir>/test/setup.ts"
  ],

  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/test/tsconfig.json"
      }
    ]
  },

  moduleNameMapper: {
    "^@phoenix/common$":
      "<rootDir>/../libs/common/src/index.ts",

    "^@phoenix/common/(.*)$":
      "<rootDir>/../libs/common/src/$1"
  },
};
