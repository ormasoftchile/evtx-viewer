/**
 * Performance Benchmarking Framework for EVTX Viewer
 * 
 * Constitutional requirements:
 * - Parsing throughput: >10MB/sec
 * - Memory usage: <512MB for typical files  
 * - UI response time: <100ms
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceMetrics {
  readonly operation: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly memoryUsage: {
    readonly before: NodeJS.MemoryUsage;
    readonly after: NodeJS.MemoryUsage;
    readonly peak: number;
  };
  readonly additionalMetrics: Record<string, number> | undefined;
}

export interface ParsePerformanceMetrics extends PerformanceMetrics {
  readonly fileSize: number;
  readonly throughputMBps: number;
  readonly recordCount: number;
  readonly recordsPerSecond: number;
}

export class PerformanceBenchmark {
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly memorySnapshots: number[] = [];
  private memoryMonitorInterval: NodeJS.Timeout | undefined;

  /**
   * Start performance monitoring for an operation
   */
  public start(operation: string): PerformanceMeasurement {
    return new PerformanceMeasurement(operation, this);
  }

  /**
   * Record metrics from a completed measurement
   */
  public recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
  }

  /**
   * Start continuous memory monitoring
   */
  public startMemoryMonitoring(intervalMs: number = 100): void {
    this.memorySnapshots.length = 0;
    this.memoryMonitorInterval = setInterval(() => {
      const memInfo = process.memoryUsage();
      this.memorySnapshots.push(memInfo.heapUsed);
    }, intervalMs);
  }

  /**
   * Stop memory monitoring and return peak usage
   */
  public stopMemoryMonitoring(): number {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = undefined;
    }
    return Math.max(...this.memorySnapshots, 0);
  }

  /**
   * Get all recorded metrics
   */
  public getMetrics(): readonly PerformanceMetrics[] {
    return this.metrics;
  }

  /**
   * Get metrics for parsing operations
   */
  public getParseMetrics(): readonly ParsePerformanceMetrics[] {
    return this.metrics.filter((m): m is ParsePerformanceMetrics => 
      'throughputMBps' in m
    );
  }

  /**
   * Validate constitutional performance requirements
   */
  public validateConstitutionalRequirements(): {
    readonly passing: boolean;
    readonly results: {
      readonly parsingThroughput: { passing: boolean; actual: number; required: number };
      readonly memoryUsage: { passing: boolean; actual: number; required: number };
      readonly uiResponseTime: { passing: boolean; actual: number; required: number };
    };
  } {
    const parseMetrics = this.getParseMetrics();
    const uiMetrics = this.metrics.filter(m => m.operation.startsWith('ui'));
    
    // Parse throughput requirement: >10MB/sec
    const avgThroughput = parseMetrics.length > 0 
      ? parseMetrics.reduce((sum, m) => sum + m.throughputMBps, 0) / parseMetrics.length
      : 0;
    
    // Memory usage requirement: <512MB
    const peakMemoryMB = Math.max(...this.metrics.map(m => m.memoryUsage.peak)) / (1024 * 1024);
    
    // UI response time requirement: <100ms
    const avgUiResponseTime = uiMetrics.length > 0
      ? uiMetrics.reduce((sum, m) => sum + m.duration, 0) / uiMetrics.length
      : 0;

    const results = {
      parsingThroughput: {
        passing: avgThroughput > 10,
        actual: avgThroughput,
        required: 10,
      },
      memoryUsage: {
        passing: peakMemoryMB < 512,
        actual: peakMemoryMB,
        required: 512,
      },
      uiResponseTime: {
        passing: avgUiResponseTime < 100,
        actual: avgUiResponseTime,
        required: 100,
      },
    };

    return {
      passing: results.parsingThroughput.passing && 
               results.memoryUsage.passing && 
               results.uiResponseTime.passing,
      results,
    };
  }

  /**
   * Export metrics to JSON file
   */
  public async exportMetrics(filePath: string): Promise<void> {
    const data = {
      timestamp: new Date().toISOString(),
      constitutionalValidation: this.validateConstitutionalRequirements(),
      metrics: this.metrics,
    };
    
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
  }
}

export class PerformanceMeasurement {
  private readonly startTime: number;
  private readonly startMemory: NodeJS.MemoryUsage;
  private peakMemory: number;

  constructor(
    private readonly operation: string,
    private readonly benchmark: PerformanceBenchmark
  ) {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.peakMemory = this.startMemory.heapUsed;
  }

  /**
   * Update peak memory usage (call periodically during operation)
   */
  public updatePeakMemory(): void {
    const current = process.memoryUsage().heapUsed;
    if (current > this.peakMemory) {
      this.peakMemory = current;
    }
  }

  /**
   * End measurement and record metrics
   */
  public end(additionalMetrics?: Record<string, number>): PerformanceMetrics {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const metrics: PerformanceMetrics = {
      operation: this.operation,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      memoryUsage: {
        before: this.startMemory,
        after: endMemory,
        peak: Math.max(this.peakMemory, endMemory.heapUsed),
      },
      additionalMetrics,
    };

    this.benchmark.recordMetrics(metrics);
    return metrics;
  }

  /**
   * End measurement for parsing operations with additional parse-specific metrics
   */
  public endParse(fileSize: number, recordCount: number): ParsePerformanceMetrics {
    const baseMetrics = this.end();
    const throughputMBps = fileSize / (1024 * 1024) / (baseMetrics.duration / 1000);
    const recordsPerSecond = recordCount / (baseMetrics.duration / 1000);

    const parseMetrics: ParsePerformanceMetrics = {
      ...baseMetrics,
      fileSize,
      throughputMBps,
      recordCount,
      recordsPerSecond,
    };

    // Replace the base metrics with parse-specific metrics
    const allMetrics = this.benchmark.getMetrics() as PerformanceMetrics[];
    const lastIndex = allMetrics.length - 1;
    if (lastIndex >= 0) {
      (allMetrics as any)[lastIndex] = parseMetrics;
    }

    return parseMetrics;
  }
}