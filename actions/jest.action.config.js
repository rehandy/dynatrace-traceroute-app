

/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: '@dynatrace/runtime-simulator/lib/test-environment',
  clearMocks: true,
  displayName: 'actions',
  rootDir: '../',
  roots: ['<rootDir>/actions'],
  testMatch: ['**/*.?(stateful-)action.test.ts'],
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/actions/tsconfig.action.test.json',
        isolatedModules: true,
      },
    ],
  },
};
