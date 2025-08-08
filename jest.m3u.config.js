module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/m3u'],
  testMatch: [
    '<rootDir>/tests/m3u/**/*.spec.ts',
    '<rootDir>/tests/m3u/**/*.test.ts',
    '<rootDir>/tests/m3u/**/*.bench.spec.ts'
  ],
  transform: {
    '^.+\\.(ts|tsx|js|mjs)$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'json'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  collectCoverage: false,
  verbose: true,
};


