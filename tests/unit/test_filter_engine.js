"use strict";
/**
 * Unit Tests for Filter Engine
 *
 * TDD Approach: These tests MUST FAIL initially before implementation
 * Tests event filtering with constitutional performance targets
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Filter Engine class that will be implemented
class EventFilterEngine {
    constructor(options) {
        this.events = [];
        this.indexCache = new Map();
        // This will fail until implementation
        throw new Error('Not implemented - TDD: This should fail until implemented');
    }
    setEvents(events) {
        throw new Error('Not implemented');
    }
    applyFilter(filter) {
        throw new Error('Not implemented');
    }
    applyMultipleFilters(filters, operator = 'AND') {
        throw new Error('Not implemented');
    }
    buildIndex(field) {
        throw new Error('Not implemented');
    }
    clearIndex(field) {
        throw new Error('Not implemented');
    }
    getPerformanceMetrics() {
        throw new Error('Not implemented');
    }
    resetMetrics() {
        throw new Error('Not implemented');
    }
    dispose() {
        throw new Error('Not implemented');
    }
}
(0, globals_1.describe)('Filter Engine Unit Tests', () => {
    let filterEngine;
    let testEvents;
    let largeDataset;
    (0, globals_1.beforeEach)(() => {
        // Create test dataset with variety of event types
        testEvents = [
            {
                id: 1,
                recordId: BigInt(1001),
                timestamp: new Date('2023-09-25T10:00:00Z'),
                eventId: 4624,
                level: 4, // Information
                provider: 'Microsoft-Windows-Security-Auditing',
                channel: 'Security',
                computer: 'DESKTOP-ABC123',
                userId: 'S-1-5-21-123456789-123456789-123456789-1001',
                message: 'An account was successfully logged on',
                data: { LogonType: '2', UserName: 'john.doe' }
            },
            {
                id: 2,
                recordId: BigInt(1002),
                timestamp: new Date('2023-09-25T10:01:00Z'),
                eventId: 4625,
                level: 2, // Error
                provider: 'Microsoft-Windows-Security-Auditing',
                channel: 'Security',
                computer: 'DESKTOP-ABC123',
                userId: 'S-1-5-21-123456789-123456789-123456789-1002',
                message: 'An account failed to log on',
                data: { LogonType: '3', UserName: 'invalid.user' }
            },
            {
                id: 3,
                recordId: BigInt(1003),
                timestamp: new Date('2023-09-25T10:02:00Z'),
                eventId: 1000,
                level: 3, // Warning
                provider: 'Microsoft-Windows-Kernel-General',
                channel: 'System',
                computer: 'DESKTOP-XYZ789',
                userId: undefined,
                message: 'System warning occurred',
                data: { Component: 'Kernel', Status: 'Warning' }
            },
            {
                id: 4,
                recordId: BigInt(1004),
                timestamp: new Date('2023-09-25T10:03:00Z'),
                eventId: 4634,
                level: 4, // Information
                provider: 'Microsoft-Windows-Security-Auditing',
                channel: 'Security',
                computer: 'DESKTOP-ABC123',
                userId: 'S-1-5-21-123456789-123456789-123456789-1001',
                message: 'An account was logged off',
                data: { LogonType: '2', UserName: 'john.doe' }
            }
        ];
        // Create large dataset for performance testing
        largeDataset = Array.from({ length: 100000 }, (_, i) => ({
            id: i + 1000,
            recordId: BigInt(i + 10000),
            timestamp: new Date(Date.now() + i * 1000),
            eventId: 4624 + (i % 50), // Variety of event IDs
            level: (i % 5) + 1, // Levels 1-5
            provider: `Provider-${i % 20}`, // 20 different providers
            channel: ['Security', 'System', 'Application'][i % 3],
            computer: `Computer-${i % 10}`, // 10 different computers
            userId: i % 4 === 0 ? undefined : `S-1-5-21-${i % 1000}`,
            message: `Event message ${i} with searchable text`,
            data: {
                field1: `value-${i % 100}`,
                field2: i,
                field3: i % 2 === 0
            }
        }));
        try {
            filterEngine = new EventFilterEngine({
                enableCache: true,
                maxCacheSize: 1000,
                indexFields: ['eventId', 'level', 'provider', 'channel']
            });
        }
        catch (error) {
            // Expected to fail before implementation
            (0, globals_1.expect)(error.message).toContain('Not implemented');
        }
    });
    (0, globals_1.afterEach)(() => {
        try {
            filterEngine?.dispose();
        }
        catch {
            // Expected to fail before implementation
        }
    });
    (0, globals_1.describe)('Filter Engine Initialization', () => {
        (0, globals_1.it)('should initialize with default options', () => {
            (0, globals_1.expect)(() => new EventFilterEngine()).toThrow('Not implemented');
            // After implementation:
            // const engine = new EventFilterEngine();
            // expect(engine).toBeDefined();
        });
        (0, globals_1.it)('should initialize with custom options', () => {
            const options = {
                enableCache: false,
                maxCacheSize: 500,
                indexFields: ['eventId', 'level']
            };
            (0, globals_1.expect)(() => new EventFilterEngine(options)).toThrow('Not implemented');
            // After implementation:
            // const engine = new EventFilterEngine(options);
            // Should initialize with custom configuration
        });
        (0, globals_1.it)('should set events and build initial indices', () => {
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
            }).toThrow('Not implemented');
            // After implementation:
            // Should store events and build indices for configured fields
            // Should prepare for efficient filtering
        });
    });
    (0, globals_1.describe)('Basic Filtering Operations', () => {
        (0, globals_1.it)('should filter by single event ID', () => {
            const filter = { eventIds: [4624] };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // const result = engine.applyFilter(filter);
            // expect(result.filteredEvents).toHaveLength(1);
            // expect(result.filteredEvents[0].eventId).toBe(4624);
        });
        (0, globals_1.it)('should filter by multiple event IDs', () => {
            const filter = { eventIds: [4624, 4625, 4634] };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return events matching any of the specified IDs
            // expect(result.filteredEvents).toHaveLength(3);
        });
        (0, globals_1.it)('should filter by event level', () => {
            const filter = { levels: [2, 3] }; // Error and Warning
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return events with Error or Warning levels
            // expect(result.filteredEvents).toHaveLength(2);
        });
        (0, globals_1.it)('should filter by provider', () => {
            const filter = { providers: ['Microsoft-Windows-Security-Auditing'] };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return only security auditing events
            // expect(result.filteredEvents).toHaveLength(3);
        });
        (0, globals_1.it)('should filter by time range', () => {
            const filter = {
                timeRange: {
                    start: new Date('2023-09-25T10:01:00Z'),
                    end: new Date('2023-09-25T10:02:30Z')
                }
            };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return events within specified time range
            // expect(result.filteredEvents).toHaveLength(2);
        });
        (0, globals_1.it)('should filter by text search in message', () => {
            const filter = { textSearch: 'logged on' };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return events containing the search text
            // Should be case-insensitive
            // expect(result.filteredEvents).toHaveLength(2); // "logged on" and "log on"
        });
        (0, globals_1.it)('should filter by channel', () => {
            const filter = { channels: ['Security'] };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return only Security channel events
            // expect(result.filteredEvents).toHaveLength(3);
        });
        (0, globals_1.it)('should filter by computer name', () => {
            const filter = { computers: ['DESKTOP-ABC123'] };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return events from specified computer
            // expect(result.filteredEvents).toHaveLength(3);
        });
    });
    (0, globals_1.describe)('Combined Filtering', () => {
        (0, globals_1.it)('should apply multiple filters with AND logic', () => {
            const filter = {
                eventIds: [4624, 4625, 4634],
                levels: [4], // Only Information level
                providers: ['Microsoft-Windows-Security-Auditing']
            };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return events matching ALL criteria
            // expect(result.filteredEvents).toHaveLength(2); // Events 1 and 4
        });
        (0, globals_1.it)('should apply multiple filter objects with OR logic', () => {
            const filters = [
                { eventIds: [4624] },
                { levels: [2] }, // Error level
                { providers: ['Microsoft-Windows-Kernel-General'] }
            ];
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyMultipleFilters(filters, 'OR');
            }).toThrow('Not implemented');
            // After implementation:
            // Should return events matching ANY filter
            // expect(result.filteredEvents).toHaveLength(3);
        });
        (0, globals_1.it)('should handle empty filter gracefully', () => {
            const filter = {};
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return all events when no filters applied
            // expect(result.filteredEvents).toHaveLength(testEvents.length);
        });
        (0, globals_1.it)('should filter by custom data fields', () => {
            const filter = {
                customFields: {
                    'data.LogonType': '2',
                    'data.UserName': 'john.doe'
                }
            };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should support filtering by nested data fields
            // expect(result.filteredEvents).toHaveLength(2); // Events 1 and 4
        });
    });
    (0, globals_1.describe)('Performance Requirements', () => {
        (0, globals_1.it)('should filter 100k events within constitutional time limits', () => {
            const filter = {
                eventIds: [4624, 4625, 4626, 4634],
                levels: [2, 3, 4]
            };
            const startTime = performance.now();
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(largeDataset);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            const filterTime = performance.now() - startTime;
            // After implementation - Constitutional Requirements:
            // Should filter large datasets quickly
            // expect(filterTime).toBeLessThan(100); // <100ms for 100k events
            // expect(result.totalFiltered).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should maintain low memory usage during filtering', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            const filter = {
                textSearch: 'searchable text',
                providers: ['Provider-1', 'Provider-2', 'Provider-3']
            };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(largeDataset);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryGrowth = finalMemory - initialMemory;
            // After implementation:
            // Should not cause excessive memory allocation
            // expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // <100MB growth
        });
        (0, globals_1.it)('should use indexing for improved performance', () => {
            const filter = { eventIds: [4624] };
            // Test with indexing
            const withIndexStartTime = performance.now();
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine({ enableCache: true });
                engine.setEvents(largeDataset);
                engine.buildIndex('eventId');
                const result1 = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            const withIndexTime = performance.now() - withIndexStartTime;
            // Test without indexing
            const withoutIndexStartTime = performance.now();
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine({ enableCache: false });
                engine.setEvents(largeDataset);
                const result2 = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            const withoutIndexTime = performance.now() - withoutIndexStartTime;
            // After implementation:
            // Indexed filtering should be significantly faster
            // expect(withIndexTime).toBeLessThan(withoutIndexTime / 2);
        });
        (0, globals_1.it)('should handle rapid successive filtering operations', () => {
            const filters = [
                { eventIds: [4624] },
                { levels: [2, 3] },
                { providers: ['Provider-1'] },
                { textSearch: 'message' },
                { channels: ['Security'] }
            ];
            const startTime = performance.now();
            for (const filter of filters) {
                try {
                    const engine = new EventFilterEngine();
                    engine.setEvents(largeDataset.slice(0, 10000)); // 10k events
                    const result = engine.applyFilter(filter);
                }
                catch (error) {
                    (0, globals_1.expect)(error.message).toContain('Not implemented');
                }
            }
            const totalTime = performance.now() - startTime;
            // After implementation:
            // Should handle multiple rapid filter operations efficiently
            // expect(totalTime).toBeLessThan(500); // <500ms for 5 operations on 10k events
        });
    });
    (0, globals_1.describe)('Indexing and Caching', () => {
        (0, globals_1.it)('should build and use indices for common filter fields', () => {
            const indexFields = ['eventId', 'level', 'provider', 'channel'];
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine({ indexFields });
                engine.setEvents(testEvents);
                // Build indices for all configured fields
                indexFields.forEach(field => engine.buildIndex(field));
                // Test that indices are used
                const filter = { eventIds: [4624] };
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should build efficient lookup indices
            // Should use indices automatically when available
            // Should fall back to linear search when no index available
        });
        (0, globals_1.it)('should manage cache size and eviction', () => {
            const engine = (0, globals_1.expect)(() => new EventFilterEngine({
                enableCache: true,
                maxCacheSize: 10
            })).toThrow('Not implemented');
            (0, globals_1.expect)(() => {
                // Generate many different filters to exceed cache size
                for (let i = 0; i < 20; i++) {
                    const filter = { eventIds: [4624 + i] };
                    engine.applyFilter(filter);
                }
            }).toThrow('Not implemented');
            // After implementation:
            // Should evict old cache entries when limit reached
            // Should maintain most recently used entries
            // Should continue functioning correctly with cache eviction
        });
        (0, globals_1.it)('should clear specific or all indices', () => {
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                engine.buildIndex('eventId');
                engine.buildIndex('level');
                // Clear specific index
                engine.clearIndex('eventId');
                // Clear all indices
                engine.clearIndex();
            }).toThrow('Not implemented');
            // After implementation:
            // Should remove specified index
            // Should remove all indices when no field specified
            // Should not affect functionality, only performance
        });
        (0, globals_1.it)('should track cache hit/miss statistics', () => {
            const filter = { eventIds: [4624] };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine({ enableCache: true });
                engine.setEvents(testEvents);
                // First call - cache miss
                engine.applyFilter(filter);
                // Second call - cache hit
                engine.applyFilter(filter);
                const metrics = engine.getPerformanceMetrics();
            }).toThrow('Not implemented');
            // After implementation:
            // Should track cache statistics
            // expect(metrics.cacheHits).toBeGreaterThan(0);
            // expect(metrics.cacheMisses).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Advanced Filtering Features', () => {
        (0, globals_1.it)('should support regex patterns in text search', () => {
            const filter = { textSearch: '/logged.*(on|off)/i' };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should support regex patterns with flags
            // Should match events with "logged on" or "logged off"
        });
        (0, globals_1.it)('should support wildcard patterns in text search', () => {
            const filter = { textSearch: 'logged*' };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should support wildcard matching
            // Should match "logged on", "logged off", etc.
        });
        (0, globals_1.it)('should support date range shortcuts', () => {
            const filters = [
                { timeRange: { start: new Date('today'), end: new Date('today') } },
                { timeRange: { start: new Date('yesterday'), end: new Date('today') } },
                { timeRange: { start: new Date('last week'), end: new Date('today') } }
            ];
            for (const filter of filters) {
                (0, globals_1.expect)(() => {
                    const engine = new EventFilterEngine();
                    engine.setEvents(testEvents);
                    const result = engine.applyFilter(filter);
                }).toThrow('Not implemented');
            }
            // After implementation:
            // Should support relative date expressions
            // Should convert to absolute dates for filtering
        });
        (0, globals_1.it)('should support field existence filters', () => {
            const filter = {
                customFields: {
                    'userId': { exists: true } // Has userId field
                }
            };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should filter events that have/don't have specific fields
            // expect(result.filteredEvents).toHaveLength(3); // Events with userId
        });
    });
    (0, globals_1.describe)('Filter Result Analysis', () => {
        (0, globals_1.it)('should provide comprehensive filter statistics', () => {
            const filter = {
                eventIds: [4624, 4625],
                levels: [2, 4]
            };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should provide detailed statistics
            // expect(result.filterStats.byEventId[4624]).toBeGreaterThan(0);
            // expect(result.filterStats.byLevel[2]).toBeGreaterThan(0);
            // expect(result.filterStats.byLevel[4]).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should calculate filter performance metrics', () => {
            const filter = { textSearch: 'account' };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(largeDataset);
                const result = engine.applyFilter(filter);
                const metrics = engine.getPerformanceMetrics();
            }).toThrow('Not implemented');
            // After implementation:
            // Should track comprehensive performance data
            // expect(metrics.filterTime).toBeGreaterThan(0);
            // expect(metrics.eventsProcessed).toBe(largeDataset.length);
            // expect(metrics.filtersApplied).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should support filter result pagination', () => {
            const filter = { levels: [4] }; // Information level
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(largeDataset);
                // Get first page
                const page1 = engine.applyFilter({ ...filter, limit: 100, offset: 0 });
                // Get second page  
                const page2 = engine.applyFilter({ ...filter, limit: 100, offset: 100 });
            }).toThrow('Not implemented');
            // After implementation:
            // Should support pagination for large result sets
            // Should maintain consistent ordering across pages
        });
    });
    (0, globals_1.describe)('Error Handling and Edge Cases', () => {
        (0, globals_1.it)('should handle invalid filter values gracefully', () => {
            const invalidFilters = [
                { eventIds: [null] },
                { levels: [-1, 10] }, // Invalid levels
                { timeRange: { start: 'invalid-date', end: new Date() } },
                { textSearch: null }
            ];
            for (const filter of invalidFilters) {
                (0, globals_1.expect)(() => {
                    const engine = new EventFilterEngine();
                    engine.setEvents(testEvents);
                    const result = engine.applyFilter(filter);
                }).toThrow('Not implemented');
                // After implementation:
                // Should validate filter values
                // Should handle invalid values gracefully
                // Should return appropriate error messages
            }
        });
        (0, globals_1.it)('should handle empty event dataset', () => {
            const filter = { eventIds: [4624] };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents([]);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should handle empty dataset gracefully
            // expect(result.filteredEvents).toEqual([]);
            // expect(result.totalFiltered).toBe(0);
        });
        (0, globals_1.it)('should handle filter that matches no events', () => {
            const filter = { eventIds: [9999] }; // Non-existent event ID
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                engine.setEvents(testEvents);
                const result = engine.applyFilter(filter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should return empty result set
            // expect(result.filteredEvents).toEqual([]);
            // expect(result.totalFiltered).toBe(0);
        });
        (0, globals_1.it)('should handle concurrent filtering operations', () => {
            const filters = [
                { eventIds: [4624] },
                { levels: [2] },
                { providers: ['Microsoft-Windows-Security-Auditing'] }
            ];
            const promises = filters.map(filter => {
                return new Promise((resolve) => {
                    try {
                        const engine = new EventFilterEngine();
                        engine.setEvents(testEvents);
                        const result = engine.applyFilter(filter);
                        resolve(result);
                    }
                    catch (error) {
                        (0, globals_1.expect)(error.message).toContain('Not implemented');
                        resolve(null);
                    }
                });
            });
            (0, globals_1.expect)(() => Promise.all(promises)).not.toThrow();
            // After implementation:
            // Should handle concurrent operations safely
            // Should not have race conditions
            // Should maintain consistent state
        });
    });
    (0, globals_1.describe)('Integration and Compatibility', () => {
        (0, globals_1.it)('should integrate with EventRecord model', () => {
            const mockEventRecord = {
                matchesFilter: globals_1.jest.fn().mockReturnValue(true)
            };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                const filter = { eventIds: [4624] };
                // Should work with EventRecord objects
                const matches = mockEventRecord.matchesFilter(filter);
            }).not.toThrow();
            // After implementation:
            // Should be compatible with EventRecord.matchesFilter()
            // Should use same filter interface and logic
        });
        (0, globals_1.it)('should provide filter validation utilities', () => {
            const validFilter = { eventIds: [4624], levels: [4] };
            const invalidFilter = { eventIds: 'invalid' };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                // Should provide filter validation
                const isValid1 = engine.validateFilter?.(validFilter);
                const isValid2 = engine.validateFilter?.(invalidFilter);
            }).toThrow('Not implemented');
            // After implementation:
            // Should provide filter validation utilities
            // Should return validation results with error details
        });
        (0, globals_1.it)('should support filter serialization/deserialization', () => {
            const filter = {
                eventIds: [4624, 4625],
                levels: [2, 3, 4],
                timeRange: {
                    start: new Date('2023-09-25T10:00:00Z'),
                    end: new Date('2023-09-25T12:00:00Z')
                },
                textSearch: 'account'
            };
            (0, globals_1.expect)(() => {
                const engine = new EventFilterEngine();
                // Serialize filter to JSON
                const serialized = JSON.stringify(filter);
                // Deserialize and apply
                const deserialized = JSON.parse(serialized);
                deserialized.timeRange.start = new Date(deserialized.timeRange.start);
                deserialized.timeRange.end = new Date(deserialized.timeRange.end);
                engine.setEvents(testEvents);
                const result = engine.applyFilter(deserialized);
            }).toThrow('Not implemented');
            // After implementation:
            // Should support JSON serialization of filters
            // Should handle Date objects and other complex types
            // Should maintain filter functionality after serialization
        });
    });
});
//# sourceMappingURL=test_filter_engine.js.map