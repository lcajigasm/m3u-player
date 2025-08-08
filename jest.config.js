/**
 * Jest Configuration for M3U Player
 * Testing framework setup with comprehensive coverage
 * 
 * @version 2.0.0
 * @author M3U Player Team
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Module paths
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.[jt]s',
    '<rootDir>/tests/**/*.spec.[jt]s',
    '<rootDir>/src/**/__tests__/**/*.test.[jt]s',
    '<rootDir>/src/**/__tests__/**/*.spec.[jt]s'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'src/js/**/*.js',
    'src/lib/**/*.ts',
    '!src/js/**/*.test.js',
    '!src/lib/**/*.test.ts',
    '!src/js/epg/__tests__/**',
    '!node_modules/**',
    '!dist/**'
  ],
  
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/js/core/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/js/modules/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Module name mapping for ES6 imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/js/core/$1',
    '^@modules/(.*)$': '<rootDir>/src/js/modules/$1',
    '^@epg/(.*)$': '<rootDir>/src/js/epg/$1'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx|js|mjs)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: ['js', 'mjs', 'json', 'ts', 'tsx'],
  
  // Global setup/teardown
  globalSetup: '<rootDir>/tests/globalSetup.js',
  globalTeardown: '<rootDir>/tests/globalTeardown.js',
  
  // Test timeout
  testTimeout: 10000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance monitoring
  detectOpenHandles: true,
  detectLeaks: false,
  
  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '.*\\.bench\\..*',
    '<rootDir>/tests/e2e/'
  ],
  
  // Mock configuration
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'M3U Player Test Report'
      }
    ]
  ],
  
  // Snapshot configuration
  snapshotSerializers: [
    'jest-serializer-html'
  ],
  
  // Additional Jest configuration for Electron
  testEnvironmentOptions: {
    url: 'http://localhost',
    userAgent: 'M3U Player Test/2.0.0'
  }
};