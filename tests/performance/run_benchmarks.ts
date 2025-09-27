#!/usr/bin/env node

/**
 * Performance Benchmark Runner Script
 * 
 * Run this script to execute all performance benchmarks and generate a report.
 * Usage: npm run test:performance
 */

import PerformanceTestRunner from './test_runner';
import * as path from 'path';

async function main() {
  console.log('🚀 EVTX Viewer Performance Benchmark Suite');
  console.log('==========================================\n');

  const runner = new PerformanceTestRunner();
  
  try {
    const startTime = Date.now();
    const results = await runner.runAllTests();
    const totalTime = Date.now() - startTime;

    // Summary
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    console.log(`\n🎯 Final Summary:`);
    console.log(`   Total Runtime: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    
    if (passedTests === totalTests) {
      console.log('   ✅ All performance benchmarks PASSED!');
      process.exit(0);
    } else {
      console.log('   ❌ Some performance benchmarks FAILED!');
      console.log('\n   Failed tests:');
      results.filter(r => !r.passed).forEach(test => {
        console.log(`     • ${test.testName}: ${test.error?.message || 'Performance requirements not met'}`);
      });
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Performance benchmark failed:', error);
    process.exit(1);
  } finally {
    runner.dispose();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}