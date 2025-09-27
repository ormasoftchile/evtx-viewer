"use strict";
/**
 * Performance Benchmarking Framework for EVTX Viewer
 *
 * Constitutional requirements:
 * - Parsing throughput: >10MB/sec
 * - Memory usage: <512MB for typical files
 * - UI response time: <100ms
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMeasurement = exports.PerformanceBenchmark = void 0;
const perf_hooks_1 = require("perf_hooks");
const fs = __importStar(require("fs"));
class PerformanceBenchmark {
    constructor() {
        this.metrics = [];
        this.memorySnapshots = [];
    }
    /**
     * Start performance monitoring for an operation
     */
    start(operation) {
        return new PerformanceMeasurement(operation, this);
    }
    /**
     * Record metrics from a completed measurement
     */
    recordMetrics(metrics) {
        this.metrics.push(metrics);
    }
    /**
     * Start continuous memory monitoring
     */
    startMemoryMonitoring(intervalMs = 100) {
        this.memorySnapshots.length = 0;
        this.memoryMonitorInterval = setInterval(() => {
            const memInfo = process.memoryUsage();
            this.memorySnapshots.push(memInfo.heapUsed);
        }, intervalMs);
    }
    /**
     * Stop memory monitoring and return peak usage
     */
    stopMemoryMonitoring() {
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = undefined;
        }
        return Math.max(...this.memorySnapshots, 0);
    }
    /**
     * Get all recorded metrics
     */
    getMetrics() {
        return this.metrics;
    }
    /**
     * Get metrics for parsing operations
     */
    getParseMetrics() {
        return this.metrics.filter((m) => 'throughputMBps' in m);
    }
    /**
     * Validate constitutional performance requirements
     */
    validateConstitutionalRequirements() {
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
    async exportMetrics(filePath) {
        const data = {
            timestamp: new Date().toISOString(),
            constitutionalValidation: this.validateConstitutionalRequirements(),
            metrics: this.metrics,
        };
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    }
}
exports.PerformanceBenchmark = PerformanceBenchmark;
class PerformanceMeasurement {
    constructor(operation, benchmark) {
        this.operation = operation;
        this.benchmark = benchmark;
        this.startTime = perf_hooks_1.performance.now();
        this.startMemory = process.memoryUsage();
        this.peakMemory = this.startMemory.heapUsed;
    }
    /**
     * Update peak memory usage (call periodically during operation)
     */
    updatePeakMemory() {
        const current = process.memoryUsage().heapUsed;
        if (current > this.peakMemory) {
            this.peakMemory = current;
        }
    }
    /**
     * End measurement and record metrics
     */
    end(additionalMetrics) {
        const endTime = perf_hooks_1.performance.now();
        const endMemory = process.memoryUsage();
        const metrics = {
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
    endParse(fileSize, recordCount) {
        const baseMetrics = this.end();
        const throughputMBps = fileSize / (1024 * 1024) / (baseMetrics.duration / 1000);
        const recordsPerSecond = recordCount / (baseMetrics.duration / 1000);
        const parseMetrics = {
            ...baseMetrics,
            fileSize,
            throughputMBps,
            recordCount,
            recordsPerSecond,
        };
        // Replace the base metrics with parse-specific metrics
        const allMetrics = this.benchmark.getMetrics();
        const lastIndex = allMetrics.length - 1;
        if (lastIndex >= 0) {
            allMetrics[lastIndex] = parseMetrics;
        }
        return parseMetrics;
    }
}
exports.PerformanceMeasurement = PerformanceMeasurement;
//# sourceMappingURL=benchmark.js.map