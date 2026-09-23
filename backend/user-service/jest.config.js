module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  setupFiles: [
    "<rootDir>/test/setup.ts"
  ],

  moduleNameMapper: {
    "^@phoenix/common$":
      "<rootDir>/../libs/common/src/index.ts",

    "^@phoenix/common/(.*)$":
      "<rootDir>/../libs/common/src/$1"
  }
};