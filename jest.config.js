module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ["**/__tests__/**/*.test.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
    testPathIgnorePatterns: ["/node_modules/", "/__tests__/fixtures/"],
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  };
  
