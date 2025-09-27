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

  const runner = new PerformanceTestRunner();
  
  try {
    const startTime = Date.now();
    const results = await runner.runAllTests();
    const totalTime = Date.now() - startTime;

    // Summary
    const passedTests = results.filter(r => r.passed).length;
    const totalTests = results.length;
    
    
    if (passedTests === totalTests) {
      process.exit(0);
    } else {
      results.filter(r => !r.passed).forEach(test => {
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