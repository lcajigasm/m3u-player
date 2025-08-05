/**
 * Jest Global Teardown
 * Runs once after all tests
 */

module.exports = async () => {
  const duration = Date.now() - global.__TEST_CONFIG__.startTime;
  console.log(`🧪 Test suite completed in ${duration}ms`);
  
  // Cleanup global resources
  delete global.__TEST_CONFIG__;
};