/**
 * Jest Global Setup
 * Runs once before all tests
 */

module.exports = async () => {
  console.log('🧪 Starting M3U Player test suite...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.TEST_TIMEOUT = '10000';
  
  // Global test configuration
  global.__TEST_CONFIG__ = {
    startTime: Date.now(),
    testEnvironment: 'jsdom',
    version: '2.0.0'
  };
};