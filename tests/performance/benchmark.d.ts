/**
 * Performance Benchmarking Framework for EVTX Viewer
 *
 * Constitutional requirements:
 * - Parsing throughput: >10MB/sec
 * - Memory usage: <512MB for typical files
 * - UI response time: <100ms
 */
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
export declare class PerformanceBenchmark {
    private readonly metrics;
    private readonly memorySnapshots;
    private memoryMonitorInterval;
    /**
     * Start performance monitoring for an operation
     */
    start(operation: string): PerformanceMeasurement;
    /**
     * Record metrics from a completed measurement
     */
    recordMetrics(metrics: PerformanceMetrics): void;
    /**
     * Start continuous memory monitoring
     */
    startMemoryMonitoring(intervalMs?: number): void;
    /**
     * Stop memory monitoring and return peak usage
     */
    stopMemoryMonitoring(): number;
    /**
     * Get all recorded metrics
     */
    getMetrics(): readonly PerformanceMetrics[];
    /**
     * Get metrics for parsing operations
     */
    getParseMetrics(): readonly ParsePerformanceMetrics[];
    /**
     * Validate constitutional performance requirements
     */
    validateConstitutionalRequirements(): {
        readonly passing: boolean;
        readonly results: {
            readonly parsingThroughput: {
                passing: boolean;
                actual: number;
                required: number;
            };
            readonly memoryUsage: {
                passing: boolean;
                actual: number;
                required: number;
            };
            readonly uiResponseTime: {
                passing: boolean;
                actual: number;
                required: number;
            };
        };
    };
    /**
     * Export metrics to JSON file
     */
    exportMetrics(filePath: string): Promise<void>;
}
export declare class PerformanceMeasurement {
    private readonly operation;
    private readonly benchmark;
    private readonly startTime;
    private readonly startMemory;
    private peakMemory;
    constructor(operation: string, benchmark: PerformanceBenchmark);
    /**
     * Update peak memory usage (call periodically during operation)
     */
    updatePeakMemory(): void;
    /**
     * End measurement and record metrics
     */
    end(additionalMetrics?: Record<string, number>): PerformanceMetrics;
    /**
     * End measurement for parsing operations with additional parse-specific metrics
     */
    endParse(fileSize: number, recordCount: number): ParsePerformanceMetrics;
}
//# sourceMappingURL=benchmark.d.ts.map