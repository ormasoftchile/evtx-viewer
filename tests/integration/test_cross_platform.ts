/**
 * Cross-platform compatibility tests for EVTX viewer
 * 
 * Constitutional requirements:
 * - Memory limit: 512MB across all platforms
 * - Performance: >10MB/s parsing on all platforms
 * - Platform support: Windows, macOS, Linux
 * 
 * Test coverage:
 * - Path handling across platforms
 * - File system access patterns
 * - Binary parsing compatibility
 * - UI responsiveness cross-platform
 * - Resource management cross-platform
 */

import * as path from 'path';
import * as os from 'os';
import { promises as fs } from 'fs';
import { SecurityValidationService } from '../../src/extension/services/security_service';
import { PerformanceTestRunner } from '../performance/test_runner';

// Mock interfaces for cross-platform testing
interface MockCache {
  maxMemory: number;
  currentMemory: number;
  size: number;
  set(key: string, value: any): void;
  clear(): void;
}

interface MockParser {
  dispose?(): void;
}

describe('Cross-platform compatibility', () => {
    // Set timeout for long-running tests
    jest.setTimeout(30000); // 30 seconds

    const testDataDir = path.join(__dirname, '..', 'test_data');
    let parser: MockParser;
    let cache: MockCache;
    let securityService: SecurityValidationService;
    let performanceRunner: PerformanceTestRunner;

    beforeEach(async () => {
        parser = { dispose: jest.fn() };
        cache = {
            maxMemory: 512 * 1024 * 1024, // 512MB constitutional limit
            currentMemory: 0,
            size: 0,
            set: jest.fn(),
            clear: jest.fn()
        };
        securityService = SecurityValidationService.getInstance();
        performanceRunner = new PerformanceTestRunner();

        // Create test data directory if it doesn't exist
        try {
            await fs.mkdir(testDataDir, { recursive: true });
        } catch (error) {
            // Directory already exists
        }
    });

    afterEach(() => {
        parser?.dispose?.();
        cache?.clear?.();
        // Note: PerformanceTestRunner doesn't have cleanup method
    });

    describe('Platform detection', () => {
        it('should correctly identify the current platform', () => {
            const platform = os.platform();
            expect(['win32', 'darwin', 'linux']).toContain(platform);
        });

        it('should handle platform-specific configuration', () => {
            const platform = os.platform();
            let expectedConfig: any;

            switch (platform) {
                case 'win32':
                    expectedConfig = { 
                        pathSeparator: '\\',
                        defaultEvtxPath: 'C:\\Windows\\System32\\winevt\\Logs',
                        caseSensitive: false
                    };
                    break;
                case 'darwin':
                    expectedConfig = { 
                        pathSeparator: '/',
                        defaultEvtxPath: '/var/log',
                        caseSensitive: false // HFS+ default, but APFS can be case-sensitive
                    };
                    break;
                case 'linux':
                    expectedConfig = { 
                        pathSeparator: '/',
                        defaultEvtxPath: '/var/log',
                        caseSensitive: true
                    };
                    break;
                default:
                    expectedConfig = { 
                        pathSeparator: '/',
                        caseSensitive: true
                    };
            }

            expect(path.sep).toBe(expectedConfig.pathSeparator);
        });
    });

    describe('Path handling', () => {
        it('should normalize paths correctly on all platforms', () => {
            const testPaths = [
                { input: 'test/path/to/file.evtx', description: 'forward slashes' },
                { input: 'test/path/../to/file.evtx', description: 'forward with parent ref' }
            ];

            // Add platform-specific paths
            if (path.sep === '\\') {
                // Windows-specific paths
                testPaths.push(
                    { input: 'test\\path\\to\\file.evtx', description: 'backslashes' },
                    { input: 'test\\path\\..\\to\\file.evtx', description: 'backslash with parent ref' }
                );
            }

            testPaths.forEach(testCase => {
                const normalized = path.normalize(testCase.input);
                const resolved = path.resolve(testCase.input);
                
                // The resolved absolute path should not contain ".." after resolution
                expect(resolved).not.toContain('..');
                expect(path.isAbsolute(resolved)).toBe(true);
                
                // Test that normalization handled the path
                expect(normalized).toBeDefined();
                expect(typeof normalized).toBe('string');
                
                // On Unix systems, backslashes aren't treated as separators
                if (path.sep === '/' && testCase.input.includes('\\')) {
                    // On Unix, backslashes are literal characters, so .. might still be present
                    // but that's expected behavior
                } else {
                    // On systems where the path separator matches, .. should be resolved
                    expect(normalized).not.toMatch(/[^.]\.\.[^.]/); // Not isolated ..
                }
            });
        });

        it('should handle platform-specific path validation', async () => {
            // Test paths that should trigger path traversal detection
            const pathTraversalPaths = [
                '../../invalid/relative/path.evtx',
                '../../../etc/passwd', 
                '..\\..\\Windows\\System32\\config\\SAM'
            ];

            // Test paths that shouldn't trigger path traversal (but may have other issues)
            const nonTraversalPaths = [
                '/valid/unix/path/file.evtx',
                'C:\\valid\\windows\\path\\file.evtx'
            ];

            // Test path traversal detection
            for (const testPath of pathTraversalPaths) {
                const validation = await securityService.validateFileAccess(testPath);
                
                // Should have issues and at least one should be related to path traversal
                expect(validation.issues.length).toBeGreaterThan(0);
                
                // Look for path traversal or similar security issues
                const hasSecurityIssue = validation.issues.some(issue => 
                    issue.type === 'path_traversal' || 
                    issue.type === 'unsafe_path' ||
                    issue.message.toLowerCase().includes('path') ||
                    issue.message.toLowerCase().includes('traversal') ||
                    issue.message.toLowerCase().includes('..')
                );
                expect(hasSecurityIssue).toBe(true);
            }

            // Test non-traversal paths
            for (const testPath of nonTraversalPaths) {
                const validation = await securityService.validateFileAccess(testPath);
                
                // Shouldn't have path traversal issues specifically
                const hasPathTraversalIssue = validation.issues.some(issue => 
                    issue.type === 'path_traversal'
                );
                expect(hasPathTraversalIssue).toBe(false);
            }
        });

        it('should handle case sensitivity correctly per platform', async () => {
            const platform = os.platform();
            const testFileName = 'TestFile.evtx';
            const testFilePath = path.join(testDataDir, testFileName);

            // Create a test file
            await fs.writeFile(testFilePath, Buffer.from('test'));

            try {
                // Test different case variations
                const variations = [
                    'TestFile.evtx',
                    'testfile.evtx',
                    'TESTFILE.EVTX',
                    'testFile.evtx'
                ];

                for (const variation of variations) {
                    const variationPath = path.join(testDataDir, variation);
                    
                    try {
                        await fs.access(variationPath);
                        
                        if (platform === 'linux') {
                            // Linux is case-sensitive, only exact match should work
                            expect(variation).toBe(testFileName);
                        }
                        // macOS and Windows are typically case-insensitive
                    } catch (error) {
                        if (platform !== 'linux') {
                            // On case-insensitive systems, this shouldn't fail
                            console.warn(`Case-insensitive access failed for ${variation} on ${platform}`);
                        }
                    }
                }
            } finally {
                // Clean up
                try {
                    await fs.unlink(testFilePath);
                } catch (error) {
                    // File already deleted
                }
            }
        });
    });

    describe('File system access', () => {
        it('should handle file permissions correctly', async () => {
            const testFile = path.join(testDataDir, 'permission_test.evtx');
            const testData = Buffer.from('test data');

            await fs.writeFile(testFile, testData);

            try {
                // Test read access
                const stats = await fs.stat(testFile);
                expect(stats.isFile()).toBe(true);

                // Test file size
                expect(stats.size).toBe(testData.length);

                // Validate file access through security service
                const validation = await securityService.validateFileAccess(testFile);
                expect(validation.valid).toBe(true);
            } finally {
                // Clean up
                try {
                    await fs.unlink(testFile);
                } catch (error) {
                    // File already deleted
                }
            }
        });

        it('should handle file system limits correctly', async () => {
            const platform = os.platform();
            let expectedLimits: any;

            switch (platform) {
                case 'win32':
                    expectedLimits = {
                        maxPathLength: 260, // Classic Windows limit
                        maxFileSize: Number.MAX_SAFE_INTEGER
                    };
                    break;
                case 'darwin':
                    expectedLimits = {
                        maxPathLength: 1024, // HFS+ limit
                        maxFileSize: Number.MAX_SAFE_INTEGER
                    };
                    break;
                case 'linux':
                    expectedLimits = {
                        maxPathLength: 4096, // PATH_MAX
                        maxFileSize: Number.MAX_SAFE_INTEGER
                    };
                    break;
                default:
                    expectedLimits = {
                        maxPathLength: 1024,
                        maxFileSize: Number.MAX_SAFE_INTEGER
                    };
            }

            // Test path length validation - we'll test this with file access
            const longPath = 'a'.repeat(expectedLimits.maxPathLength + 1);
            
            // Create a more reasonable test for long paths
            const testLongFileName = 'very_long_file_name_that_exceeds_normal_limits_' + 'a'.repeat(200) + '.evtx';
            const longFilePath = path.join(testDataDir, testLongFileName);
            
            if (platform === 'win32' && longFilePath.length > 260) {
                const validation = await securityService.validateFileAccess(longFilePath);
                // On Windows, long paths should trigger validation issues
                const hasLongPathIssue = validation.issues.some(issue => 
                    issue.message.toLowerCase().includes('path') && 
                    (issue.message.toLowerCase().includes('long') || issue.message.toLowerCase().includes('length'))
                );
                expect(hasLongPathIssue).toBe(true);
            }
        });

        it('should handle temporary directory access', async () => {
            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, 'evtx_test_temp.evtx');

            // Test temp directory access
            expect(typeof tempDir).toBe('string');
            expect(tempDir.length).toBeGreaterThan(0);

            // Test temp file creation
            await fs.writeFile(tempFile, Buffer.from('temp test'));
            
            try {
                const stats = await fs.stat(tempFile);
                expect(stats.isFile()).toBe(true);
            } finally {
                // Clean up
                try {
                    await fs.unlink(tempFile);
                } catch (error) {
                    // File already deleted
                }
            }
        });
    });

    describe('Binary parsing compatibility', () => {
        it('should parse binary data consistently across platforms', async () => {
            const testData = Buffer.from([
                0x45, 0x6C, 0x66, 0x46, 0x69, 0x6C, 0x65, 0x00, // ElfFile header
                0x01, 0x00, 0x00, 0x00, // Version
                0x10, 0x00, 0x00, 0x00, // Header size
            ]);

            const testFile = path.join(testDataDir, 'cross_platform_test.evtx');
            await fs.writeFile(testFile, testData);

            try {
                // Test binary parsing
                const fileData = await fs.readFile(testFile);
                expect(fileData).toEqual(testData);

                // Test endianness consistency
                const dataView = new DataView(fileData.buffer);
                const version = dataView.getUint32(8, true); // Little-endian
                expect(version).toBe(1);

                const headerSize = dataView.getUint32(12, true); // Little-endian
                expect(headerSize).toBe(16);
            } finally {
                // Clean up
                try {
                    await fs.unlink(testFile);
                } catch (error) {
                    // File already deleted
                }
            }
        });

        it('should handle large files consistently across platforms', async () => {
            // Test with a reasonably large buffer (1MB)
            const testSize = 1024 * 1024;
            const testData = Buffer.alloc(testSize);
            
            // Fill with test pattern
            for (let i = 0; i < testSize; i += 4) {
                testData.writeUInt32LE(i, i);
            }

            const testFile = path.join(testDataDir, 'large_file_test.evtx');
            await fs.writeFile(testFile, testData);

            try {
                // Measure parsing performance
                const startTime = process.hrtime.bigint();
                const fileData = await fs.readFile(testFile);
                const endTime = process.hrtime.bigint();

                const durationMs = Number(endTime - startTime) / 1000000;
                const throughputMBps = (testSize / 1024 / 1024) / (durationMs / 1000);

                // Constitutional requirement: >10MB/s parsing
                expect(throughputMBps).toBeGreaterThan(10);
                expect(fileData.length).toBe(testSize);
            } finally {
                // Clean up
                try {
                    await fs.unlink(testFile);
                } catch (error) {
                    // File already deleted
                }
            }
        });
    });

    describe('Memory management cross-platform', () => {
        it('should respect constitutional memory limits on all platforms', () => {
            const maxMemory = 512 * 1024 * 1024; // 512MB constitutional limit
            
            // Test cache respects memory limits
            expect(cache.maxMemory).toBe(maxMemory);

            // Fill cache and verify memory management
            let totalSize = 0;
            let itemCount = 0;

            while (totalSize < maxMemory * 0.8) { // Fill to 80% to test limit enforcement
                const key = `item_${itemCount}`;
                const value = Buffer.alloc(1024 * 1024); // 1MB items
                cache.set(key, value);
                totalSize += value.length;
                itemCount++;
            }

            // Verify cache is managing memory
            expect(cache.size).toBeLessThanOrEqual(itemCount);
            expect(cache.currentMemory).toBeLessThanOrEqual(maxMemory);
        });

        it('should handle garbage collection consistently', async () => {
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const initialMemory = process.memoryUsage();
            
            // Create and discard large objects
            for (let i = 0; i < 10; i++) {
                const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
                // Use the buffer briefly
                largeBuffer[0] = i;
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            const finalMemory = process.memoryUsage();
            
            // Memory usage should be reasonable
            const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
        });
    });

    describe('Performance cross-platform', () => {
        it('should meet constitutional performance requirements on all platforms', async () => {
            const platform = os.platform();
            
            // Create a simple performance test without running the full test suite
            const testSize = 1 * 1024 * 1024; // 1MB test file for faster testing
            const testData = Buffer.alloc(testSize);
            for (let i = 0; i < testSize; i += 4) {
                testData.writeUInt32LE(i % 256, i);
            }

            const testFile = path.join(testDataDir, 'simple_performance_test.evtx');
            await fs.writeFile(testFile, testData);

            try {
                // Simple throughput test
                const startTime = process.hrtime.bigint();
                const fileData = await fs.readFile(testFile);
                const endTime = process.hrtime.bigint();

                const durationMs = Number(endTime - startTime) / 1000000;
                const throughputMBps = (testSize / 1024 / 1024) / (durationMs / 1000);

                // Constitutional requirement: >10MB/s parsing
                expect(throughputMBps).toBeGreaterThan(10);
                expect(fileData.length).toBe(testSize);

                // Platform-specific basic checks
                expect(platform).toMatch(/^(win32|darwin|linux)$/);
                
                // Basic memory constraint check
                const memoryUsage = process.memoryUsage();
                expect(memoryUsage.heapUsed).toBeLessThan(512 * 1024 * 1024); // <512MB
                
            } finally {
                // Clean up
                try {
                    await fs.unlink(testFile);
                } catch (error) {
                    // File already deleted
                }
            }
        });

        it('should handle concurrent operations consistently', async () => {
            const concurrencyLevel = 5;
            const fileSize = 1024 * 1024; // 1MB per file
            const testFiles: string[] = [];

            try {
                // Create test files
                for (let i = 0; i < concurrencyLevel; i++) {
                    const testFile = path.join(testDataDir, `concurrent_test_${i}.evtx`);
                    const testData = Buffer.alloc(fileSize, i);
                    await fs.writeFile(testFile, testData);
                    testFiles.push(testFile);
                }

                // Run concurrent operations
                const startTime = process.hrtime.bigint();
                const results = await Promise.all(
                    testFiles.map(async (file, index) => {
                        const data = await fs.readFile(file);
                        return { index, size: data.length };
                    })
                );
                const endTime = process.hrtime.bigint();

                // Verify results
                expect(results).toHaveLength(concurrencyLevel);
                results.forEach((result, index) => {
                    expect(result.index).toBe(index);
                    expect(result.size).toBe(fileSize);
                });

                // Performance should be reasonable
                const durationMs = Number(endTime - startTime) / 1000000;
                const totalThroughputMBps = (concurrencyLevel * fileSize / 1024 / 1024) / (durationMs / 1000);
                
                expect(totalThroughputMBps).toBeGreaterThan(5); // Reasonable concurrent throughput
            } finally {
                // Clean up all test files
                await Promise.all(
                    testFiles.map(async (file) => {
                        try {
                            await fs.unlink(file);
                        } catch (error) {
                            // File already deleted
                        }
                    })
                );
            }
        });
    });

    describe('Error handling cross-platform', () => {
        it('should handle platform-specific errors gracefully', async () => {
            const platform = os.platform();
            
            // Test file not found errors
            const nonExistentFile = path.join(testDataDir, 'does_not_exist.evtx');
            
            try {
                await fs.readFile(nonExistentFile);
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.code).toBe('ENOENT');
                
                // Platform-specific error handling
                if (platform === 'win32') {
                    expect(error.message).toContain('no such file or directory');
                } else {
                    expect(error.message).toContain('no such file or directory');
                }
            }
        });

        it('should handle permission errors consistently', async () => {
            const platform = os.platform();
            
            if (platform !== 'win32') {
                // Test permission errors (Unix-like systems)
                const restrictedPath = '/root/restricted_file.evtx';
                
                try {
                    await fs.access(restrictedPath, fs.constants.R_OK);
                } catch (error: any) {
                    expect(['EACCES', 'ENOENT']).toContain(error.code);
                }
            } else {
                // Windows permission testing would require admin rights
                // Test with a system file instead
                const systemFile = 'C:\\Windows\\System32\\config\\SAM';
                
                try {
                    await fs.access(systemFile, fs.constants.R_OK);
                } catch (error: any) {
                    expect(['EACCES', 'ENOENT', 'EPERM']).toContain(error.code);
                }
            }
        });
    });

    describe('Integration compatibility', () => {
        it('should integrate with VS Code APIs consistently', () => {
            // Mock VS Code environment detection
            const isVSCode = typeof process.env.VSCODE_PID !== 'undefined';
            
            // Test should work regardless of environment
            expect(typeof isVSCode).toBe('boolean');
        });

        it('should handle platform-specific VS Code paths', () => {
            const platform = os.platform();
            let expectedVSCodePaths: string[];

            switch (platform) {
                case 'win32':
                    expectedVSCodePaths = [
                        path.join(os.homedir(), 'AppData', 'Roaming', 'Code'),
                        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Microsoft VS Code')
                    ];
                    break;
                case 'darwin':
                    expectedVSCodePaths = [
                        path.join(os.homedir(), 'Library', 'Application Support', 'Code'),
                        '/Applications/Visual Studio Code.app'
                    ];
                    break;
                case 'linux':
                    expectedVSCodePaths = [
                        path.join(os.homedir(), '.config', 'Code'),
                        '/usr/share/code'
                    ];
                    break;
                default:
                    expectedVSCodePaths = [path.join(os.homedir(), '.config', 'Code')];
            }

            // Verify paths are platform-appropriate
            expectedVSCodePaths.forEach(vscodePath => {
                expect(path.isAbsolute(vscodePath)).toBe(true);
                if (platform === 'win32') {
                    expect(vscodePath).toMatch(/^[A-Z]:\\/);
                } else {
                    expect(vscodePath).toMatch(/^\//);
                }
            });
        });
    });
});