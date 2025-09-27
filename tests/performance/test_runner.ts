/**
 * Performance Test Runner for EVTX Viewer
 * 
 * Executes comprehensive performance tests to validate constitutional requirements:
 * - Parsing throughput: >10MB/sec
 * - Memory usage: <512MB
 * - UI response time: <100ms
 */

import { PerformanceBenchmark, ParsePerformanceMetrics } from './benchmark';
import { MemoryManager } from '../../src/extension/services/memory_manager';
import { FileService } from '../../src/extension/services/file_service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

// Mock types for testing (replace with actual imports once available)
interface EventRecord {
  recordId: number;
  timeCreated: Date;
  level: string;
  eventId: number;
  source: string;
  message: string;
  data: Record<string, any>;
}

interface FilterCriteria {
  type: string;
  operator: string;
  value: any;
}

// Mock classes for testing (replace with actual imports once available)
class MockEvtxParser {
  async parseBuffer(buffer: Buffer): Promise<EventRecord[]> {
    // Simulate parsing by creating mock events based on buffer size
    const eventCount = Math.floor(buffer.length / 1000); // ~1000 bytes per event
    return Array.from({ length: eventCount }, (_, i) => this.createMockEvent(i));
  }

  private createMockEvent(id: number): EventRecord {
    return {
      recordId: id,
      timeCreated: new Date(Date.now() - (id * 1000)),
      level: (['Information', 'Warning', 'Error', 'Critical'][id % 4]) as string,
      eventId: 1000 + (id % 100),
      source: `ParsedSource${id % 20}`,
      message: `Parsed event message ${id}`,
      data: {
        processId: id % 2000,
        threadId: id % 200
      }
    };
  }
}

class MockFilterEngine {
  async applyFilters(events: EventRecord[], criteria: FilterCriteria[]): Promise<EventRecord[]> {
    // Simple mock filtering logic
    return events.filter(event => {
      return criteria.every(criterion => {
        switch (criterion.type) {
          case 'level':
            return criterion.operator === 'equals' ? event.level === criterion.value : true;
          case 'eventId':
            return criterion.operator === 'equals' ? event.eventId === criterion.value : true;
          case 'source':
            return criterion.operator === 'contains' ? event.source.includes(criterion.value) : true;
          default:
            return true;
        }
      });
    });
  }
}

export interface TestResult {
  readonly testName: string;
  readonly passed: boolean;
  readonly metrics: ParsePerformanceMetrics | any;
  readonly error?: Error;
  readonly description: string;
}

export class PerformanceTestRunner {
  private benchmark: PerformanceBenchmark;
  private parser: MockEvtxParser;
  private memoryManager: MemoryManager<EventRecord>;
  private fileService: FileService;
  private filterEngine: MockFilterEngine;
  private testResults: TestResult[] = [];

  constructor() {
    this.benchmark = new PerformanceBenchmark();
    this.parser = new MockEvtxParser();
    this.memoryManager = new MemoryManager({ maxSize: 512 * 1024 * 1024 }); // 512MB limit
    this.fileService = new FileService();
    this.filterEngine = new MockFilterEngine();
  }

  /**
   * Run all performance tests
   */
  public async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting EVTX Viewer Performance Test Suite...');
    console.log('===============================================\n');

    this.testResults = [];

    // Core performance tests
    await this.runParsingPerformanceTests();
    await this.runMemoryManagementTests();
    await this.runFilteringPerformanceTests();
    await this.runFileServiceTests();
    
    // System integration tests
    await this.runLargeFileTests();
    await this.runConcurrencyTests();
    
    // UI responsiveness tests
    await this.runUIResponseTests();
    
    // Stress tests
    await this.runStressTests();

    // Generate final report
    this.generateFinalReport();

    return this.testResults;
  }

  /**
   * Test EVTX parsing performance with various file sizes
   */
  private async runParsingPerformanceTests(): Promise<void> {
    console.log('📊 Running Parsing Performance Tests...');

    const testSizes = [
      { size: 1 * 1024 * 1024, name: '1MB' },
      { size: 10 * 1024 * 1024, name: '10MB' },
      { size: 50 * 1024 * 1024, name: '50MB' },
      { size: 100 * 1024 * 1024, name: '100MB' }
    ];

    for (const testSize of testSizes) {
      await this.runTest(
        `parsing-${testSize.name}`,
        `Parse ${testSize.name} EVTX file`,
        async () => {
          const testData = await this.generateMockEvtxFile(testSize.size);
          const measurement = this.benchmark.start(`parsing-${testSize.name}`);
          
          // Start memory monitoring
          this.benchmark.startMemoryMonitoring();
          
          try {
            const events = await this.parser.parseBuffer(testData);
            const peakMemory = this.benchmark.stopMemoryMonitoring();
            
            measurement.updatePeakMemory();
            return measurement.endParse(testSize.size, events.length);
          } catch (error) {
            this.benchmark.stopMemoryMonitoring();
            throw error;
          }
        }
      );
    }
  }

  /**
   * Test memory management performance
   */
  private async runMemoryManagementTests(): Promise<void> {
    console.log('🧠 Running Memory Management Tests...');

    // Test cache performance
    await this.runTest(
      'memory-cache-operations',
      'Memory manager cache operations',
      async () => {
        const measurement = this.benchmark.start('memory-cache-operations');
        const numOperations = 100000;
        
        this.benchmark.startMemoryMonitoring();
        
        // Fill cache
        for (let i = 0; i < numOperations; i++) {
          const event = this.createMockEvent(i);
          this.memoryManager.set(`event-${i}`, event, this.estimateEventSize(event));
          
          if (i % 10000 === 0) {
            measurement.updatePeakMemory();
          }
        }

        // Test retrieval
        for (let i = 0; i < numOperations / 2; i++) {
          this.memoryManager.get(`event-${i}`);
        }

        const peakMemory = this.benchmark.stopMemoryMonitoring();
        
        return measurement.end({
          operationsPerSecond: numOperations / (measurement.end().duration / 1000),
          cacheHitRate: 50, // 50% hit rate in this test
          peakMemoryMB: peakMemory / (1024 * 1024)
        });
      }
    );

    // Test memory limit enforcement
    await this.runTest(
      'memory-limit-enforcement',
      'Memory manager limit enforcement',
      async () => {
        const measurement = this.benchmark.start('memory-limit-enforcement');
        const limitedMemoryManager = new MemoryManager<EventRecord>({ maxSize: 10 * 1024 * 1024 }); // 10MB limit
        
        this.benchmark.startMemoryMonitoring();
        
        let evictedCount = 0;
        let addedCount = 0;
        
        // Fill beyond limit to test eviction
        for (let i = 0; i < 50000; i++) {
          const event = this.createMockEvent(i);
          const wasEvicted = limitedMemoryManager.set(`event-${i}`, event, this.estimateEventSize(event));
          addedCount++;
          
          if (!wasEvicted) {
            evictedCount++;
          }
          
          if (i % 5000 === 0) {
            measurement.updatePeakMemory();
          }
        }

        const peakMemory = this.benchmark.stopMemoryMonitoring();
        
        return measurement.end({
          evictionRate: evictedCount / addedCount,
          finalCacheSize: limitedMemoryManager.size,
          peakMemoryMB: peakMemory / (1024 * 1024)
        });
      }
    );
  }

  /**
   * Test filtering performance
   */
  private async runFilteringPerformanceTests(): Promise<void> {
    console.log('🔍 Running Filtering Performance Tests...');

    const eventCounts = [1000, 10000, 100000, 500000];

    for (const eventCount of eventCounts) {
      await this.runTest(
        `filtering-${eventCount}-events`,
        `Filter ${eventCount.toLocaleString()} events`,
        async () => {
          const events = Array.from({ length: eventCount }, (_, i) => this.createMockEvent(i));
          const measurement = this.benchmark.start(`filtering-${eventCount}-events`);
          
          this.benchmark.startMemoryMonitoring();
          
          const criteria: FilterCriteria[] = [
            { type: 'level', operator: 'equals', value: 'Error' },
            { type: 'eventId', operator: 'equals', value: 1001 },
            { type: 'source', operator: 'contains', value: 'System' }
          ];

          const filteredEvents = await this.filterEngine.applyFilters(events, criteria);
          const peakMemory = this.benchmark.stopMemoryMonitoring();

          return measurement.end({
            eventsPerSecond: eventCount / (measurement.end().duration / 1000),
            filteredCount: filteredEvents.length,
            filterRatio: filteredEvents.length / eventCount,
            peakMemoryMB: peakMemory / (1024 * 1024)
          });
        }
      );
    }
  }

  /**
   * Test file service performance
   */
  private async runFileServiceTests(): Promise<void> {
    console.log('📁 Running File Service Tests...');

    const testSizes = [5, 25, 50]; // MB

    for (const sizeMB of testSizes) {
      await this.runTest(
        `file-service-${sizeMB}MB`,
        `Load ${sizeMB}MB file via FileService`,
        async () => {
          const testFilePath = path.join(__dirname, `temp_test_${sizeMB}MB.evtx`);
          const testData = await this.generateMockEvtxFile(sizeMB * 1024 * 1024);
          await fs.writeFile(testFilePath, testData);

          try {
            const measurement = this.benchmark.start(`file-service-${sizeMB}MB`);
            this.benchmark.startMemoryMonitoring();
            let progressUpdateCount = 0;

            const events = await new Promise<EventRecord[]>((resolve, reject) => {
              const loadedEvents: EventRecord[] = [];

              this.fileService.on('progress', () => {
                progressUpdateCount++;
                measurement.updatePeakMemory();
              });

              this.fileService.on('data', (chunk) => {
                loadedEvents.push(...chunk);
              });

              this.fileService.on('complete', () => {
                resolve(loadedEvents);
              });

              this.fileService.on('error', reject);

              this.fileService.loadFile(testFilePath);
            });

            const peakMemory = this.benchmark.stopMemoryMonitoring();

            return measurement.end({
              eventsLoaded: events.length,
              progressUpdates: progressUpdateCount,
              peakMemoryMB: peakMemory / (1024 * 1024),
              throughputMBps: (sizeMB) / (measurement.end().duration / 1000)
            });

          } finally {
            // Clean up test file
            try {
              await fs.unlink(testFilePath);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      );
    }
  }

  /**
   * Test large file handling
   */
  private async runLargeFileTests(): Promise<void> {
    console.log('📈 Running Large File Tests...');

    await this.runTest(
      'large-file-200MB',
      'Handle 200MB file with memory streaming',
      async () => {
        const measurement = this.benchmark.start('large-file-200MB');
        const chunkSize = 1000;
        const totalEvents = 2000000; // ~200MB worth of events
        let processedEvents = 0;

        this.benchmark.startMemoryMonitoring();

        // Simulate streaming processing
        for (let i = 0; i < totalEvents; i += chunkSize) {
          const chunkEvents = Math.min(chunkSize, totalEvents - i);
          
          // Process chunk
          for (let j = 0; j < chunkEvents; j++) {
            const event = this.createMockEvent(i + j);
            this.memoryManager.set(`large-${i + j}`, event, this.estimateEventSize(event));
            processedEvents++;
          }

          // Update memory tracking periodically
          if (i % (chunkSize * 10) === 0) {
            measurement.updatePeakMemory();
            
            // Simulate garbage collection
            if (global.gc) {
              global.gc();
            }
          }
        }

        const peakMemory = this.benchmark.stopMemoryMonitoring();

        return measurement.end({
          eventsProcessed: processedEvents,
          chunksProcessed: Math.ceil(totalEvents / chunkSize),
          peakMemoryMB: peakMemory / (1024 * 1024),
          eventsPerSecond: processedEvents / (measurement.end().duration / 1000)
        });
      }
    );
  }

  /**
   * Test concurrent operations
   */
  private async runConcurrencyTests(): Promise<void> {
    console.log('⚡ Running Concurrency Tests...');

    await this.runTest(
      'concurrent-operations',
      'Handle multiple concurrent operations',
      async () => {
        const measurement = this.benchmark.start('concurrent-operations');
        const numConcurrentOps = 10;
        const eventsPerOp = 5000;

        this.benchmark.startMemoryMonitoring();

        const operations = Array.from({ length: numConcurrentOps }, async (_, i) => {
          const events = Array.from({ length: eventsPerOp }, (_, j) => 
            this.createMockEvent(i * eventsPerOp + j)
          );

          // Simulate concurrent parsing and filtering
          const filtered = await this.filterEngine.applyFilters(events, [
            { type: 'level', operator: 'equals', value: i % 2 === 0 ? 'Error' : 'Information' }
          ]);

          // Store in memory manager
          filtered.forEach(event => {
            this.memoryManager.set(`concurrent-${i}-${event.recordId}`, event, this.estimateEventSize(event));
          });

          return filtered;
        });

        const results = await Promise.all(operations);
        const peakMemory = this.benchmark.stopMemoryMonitoring();

        return measurement.end({
          totalEventsProcessed: results.reduce((sum, r) => sum + r.length, 0),
          concurrentOperations: numConcurrentOps,
          peakMemoryMB: peakMemory / (1024 * 1024),
          operationsPerSecond: numConcurrentOps / (measurement.end().duration / 1000)
        });
      }
    );
  }

  /**
   * Test UI response times
   */
  private async runUIResponseTests(): Promise<void> {
    console.log('🖥️ Running UI Response Tests...');

    const uiOperations = [
      {
        name: 'filter-update',
        description: 'Filter update response time',
        operation: () => this.simulateFilterUpdate()
      },
      {
        name: 'sort-events',
        description: 'Event sorting response time',
        operation: () => this.simulateEventSorting()
      },
      {
        name: 'pagination',
        description: 'Pagination response time',
        operation: () => this.simulatePagination()
      },
      {
        name: 'export-selection',
        description: 'Export selection response time',
        operation: () => this.simulateExport()
      }
    ];

    for (const uiOp of uiOperations) {
      await this.runTest(
        `ui-${uiOp.name}`,
        uiOp.description,
        async () => {
          const measurement = this.benchmark.start(`ui-${uiOp.name}`);
          this.benchmark.startMemoryMonitoring();

          const result = await uiOp.operation();
          const peakMemory = this.benchmark.stopMemoryMonitoring();

          return measurement.end({
            responseTimeMs: measurement.end().duration,
            resultSize: Array.isArray(result) ? result.length : 0,
            peakMemoryMB: peakMemory / (1024 * 1024)
          });
        }
      );
    }
  }

  /**
   * Run stress tests
   */
  private async runStressTests(): Promise<void> {
    console.log('💥 Running Stress Tests...');

    await this.runTest(
      'stress-memory-pressure',
      'Memory pressure stress test',
      async () => {
        const measurement = this.benchmark.start('stress-memory-pressure');
        this.benchmark.startMemoryMonitoring();

        let allocatedObjects = 0;
        const objects: any[] = [];

        try {
          // Allocate memory until we approach the limit
          while (process.memoryUsage().heapUsed < 400 * 1024 * 1024) { // 400MB threshold
            const batch = Array.from({ length: 1000 }, (_, i) => this.createMockEvent(allocatedObjects + i));
            objects.push(...batch);
            allocatedObjects += batch.length;
            
            if (allocatedObjects % 50000 === 0) {
              measurement.updatePeakMemory();
            }
          }

          const peakMemory = this.benchmark.stopMemoryMonitoring();

          return measurement.end({
            objectsAllocated: allocatedObjects,
            peakMemoryMB: peakMemory / (1024 * 1024),
            memoryEfficiency: allocatedObjects / (peakMemory / 1024 / 1024) // objects per MB
          });

        } catch (error) {
          this.benchmark.stopMemoryMonitoring();
          throw error;
        }
      }
    );
  }

  /**
   * Run a single test with error handling
   */
  private async runTest(
    testName: string,
    description: string,
    testFunction: () => Promise<any>
  ): Promise<void> {
    try {
      console.log(`  🔄 Running ${testName}...`);
      
      const startTime = Date.now();
      const metrics = await testFunction();
      const duration = Date.now() - startTime;

      // Validate constitutional requirements
      const passed = this.validateTest(testName, metrics);
      
      const result: TestResult = {
        testName,
        description,
        passed,
        metrics
      };

      this.testResults.push(result);

      const status = passed ? '✅' : '❌';
      console.log(`  ${status} ${testName}: ${duration}ms`);

    } catch (error) {
      const result: TestResult = {
        testName,
        description,
        passed: false,
        metrics: null,
        error: error as Error
      };

      this.testResults.push(result);
      console.log(`  ❌ ${testName}: FAILED - ${(error as Error).message}`);
    }
  }

  /**
   * Validate test against constitutional requirements
   */
  private validateTest(testName: string, metrics: any): boolean {
    if (!metrics) return false;

    // Parsing throughput requirement: >10MB/sec
    if (testName.includes('parsing') && metrics.throughputMBps < 10) {
      return false;
    }

    // Memory usage requirement: <512MB
    if (metrics.peakMemoryMB && metrics.peakMemoryMB > 512) {
      return false;
    }

    // UI response time requirement: <100ms
    if (testName.includes('ui-') && metrics.responseTimeMs > 100) {
      return false;
    }

    return true;
  }

  /**
   * Generate final performance report
   */
  private generateFinalReport(): void {
    console.log('\n📊 Performance Test Results Summary');
    console.log('=====================================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`\nOverall Results:
    Total Tests: ${totalTests}
    Passed: ${passedTests} ✅
    Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}
    Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    // Constitutional compliance summary
    const constitutionalValidation = this.benchmark.validateConstitutionalRequirements();
    console.log(`\n🏛️ Constitutional Compliance:
    Overall: ${constitutionalValidation.passing ? '✅ PASSING' : '❌ FAILING'}
    
    Parsing Throughput: ${constitutionalValidation.results.parsingThroughput.actual.toFixed(1)} MB/s ${constitutionalValidation.results.parsingThroughput.passing ? '✅' : '❌'} (required: >${constitutionalValidation.results.parsingThroughput.required} MB/s)
    Memory Usage: ${constitutionalValidation.results.memoryUsage.actual.toFixed(1)} MB ${constitutionalValidation.results.memoryUsage.passing ? '✅' : '❌'} (required: <${constitutionalValidation.results.memoryUsage.required} MB)
    UI Response Time: ${constitutionalValidation.results.uiResponseTime.actual.toFixed(1)} ms ${constitutionalValidation.results.uiResponseTime.passing ? '✅' : '❌'} (required: <${constitutionalValidation.results.uiResponseTime.required} ms)`);

    // Failed tests details
    const failedTestsDetails = this.testResults.filter(r => !r.passed);
    if (failedTestsDetails.length > 0) {
      console.log(`\n❌ Failed Tests:`);
      for (const test of failedTestsDetails) {
        console.log(`  • ${test.testName}: ${test.error?.message || 'Performance requirements not met'}`);
      }
    }

    console.log('\n✅ Performance testing complete!\n');
  }

  // Helper methods for generating test data

  private async generateMockEvtxFile(sizeBytes: number): Promise<Buffer> {
    const header = Buffer.from('ElfFile\0', 'ascii');
    const dataSize = sizeBytes - header.length;
    
    // Generate realistic EVTX-like data
    const chunks: Buffer[] = [header];
    let remainingSize = dataSize;
    
    while (remainingSize > 0) {
      const chunkSize = Math.min(4096, remainingSize);
      const chunk = crypto.randomBytes(chunkSize);
      chunks.push(chunk);
      remainingSize -= chunkSize;
    }
    
    return Buffer.concat(chunks);
  }

  private createMockEvent(id: number): EventRecord {
    return {
      recordId: id,
      timeCreated: new Date(Date.now() - (id * 1000)),
      level: (['Information', 'Warning', 'Error', 'Critical'][id % 4]) as string,
      eventId: 1000 + (id % 100),
      source: `TestSource${id % 20}`,
      message: `Test event message ${id} with realistic content that might appear in actual EVTX files`,
      data: {
        processId: id % 2000,
        threadId: id % 200,
        userId: `user-${id % 100}`,
        computerName: `computer-${id % 50}`,
        channel: `Channel${id % 10}`,
        keywords: `keyword1,keyword2,keyword${id % 5}`,
        additionalData: `Additional event data for ${id} with various properties`
      }
    };
  }

  private estimateEventSize(event: EventRecord): number {
    // Rough estimation of event memory usage
    const baseSize = 200; // Base object overhead
    const messageSize = event.message.length * 2; // Unicode characters
    const dataSize = JSON.stringify(event.data).length * 2;
    return baseSize + messageSize + dataSize;
  }

  // UI simulation methods

  private async simulateFilterUpdate(): Promise<EventRecord[]> {
    const events = Array.from({ length: 5000 }, (_, i) => this.createMockEvent(i));
    const criteria: FilterCriteria = { type: 'level', operator: 'equals', value: 'Error' };
    return this.filterEngine.applyFilters(events, [criteria]);
  }

  private async simulateEventSorting(): Promise<EventRecord[]> {
    const events = Array.from({ length: 10000 }, (_, i) => this.createMockEvent(i));
    return events.sort((a, b) => b.timeCreated.getTime() - a.timeCreated.getTime());
  }

  private async simulatePagination(): Promise<EventRecord[]> {
    const events = Array.from({ length: 50000 }, (_, i) => this.createMockEvent(i));
    const pageSize = 100;
    const pageNumber = 25;
    return events.slice(pageNumber * pageSize, (pageNumber + 1) * pageSize);
  }

  private async simulateExport(): Promise<string> {
    const events = Array.from({ length: 1000 }, (_, i) => this.createMockEvent(i));
    return JSON.stringify(events, null, 2);
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.memoryManager.clear();
    this.testResults = [];
  }
}

// Export for test runners
export { PerformanceTestRunner as default };