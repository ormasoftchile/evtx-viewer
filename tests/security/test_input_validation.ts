/**
 * Security Validation Tests for EVTX Viewer
 * 
 * Tests the SecurityValidationService to ensure proper handling of:
 * - Malicious file inputs
 * - Path traversal attacks
 * - Invalid binary data
 * - Edge cases and boundary conditions
 * 
 * Constitutional Requirements:
 * - File access validation
 * - Input sanitization
 * - Malicious content detection
 * - Security validation enforcement
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SecurityValidationService, SecurityLevel, SecurityIssueType } from '../../src/extension/services/security_service';

describe('SecurityValidationService', () => {
    let securityService: SecurityValidationService;
    let tempDir: string;

    beforeEach(async () => {
        securityService = SecurityValidationService.getInstance();
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'evtx-security-test-'));
    });

    afterEach(async () => {
        try {
            await fs.rmdir(tempDir, { recursive: true });
        } catch (error) {
            // Ignore cleanup errors in tests
        }
    });

    describe('File Path Validation', () => {
        test('should reject path traversal attempts', async () => {
            const maliciousPaths = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\config\\sam',
                '../../../../home/user/.ssh/id_rsa',
                '../../../../../root/.bash_history',
                '..\\..\\..\\..\\Users\\Administrator\\Documents'
            ];

            for (const maliciousPath of maliciousPaths) {
                const result = await securityService.validateFileAccess(maliciousPath, 'read', SecurityLevel.STRICT);
                expect(result.valid).toBe(false);
                expect(result.issues.some(issue => issue.type === SecurityIssueType.PATH_TRAVERSAL)).toBe(true);
            }
        });

        test('should reject files with dangerous extensions', async () => {
            const dangerousExtensions = [
                'test.exe',
                'test.bat',
                'test.cmd',
                'test.ps1',
                'test.sh',
                'test.scr',
                'test.com',
                'test.pif'
            ];

            for (const fileName of dangerousExtensions) {
                const filePath = path.join(tempDir, fileName);
                const result = await securityService.validateFileAccess(filePath, 'read', SecurityLevel.STRICT);
                expect(result.valid).toBe(false);
                expect(result.issues.some(issue => issue.type === SecurityIssueType.INVALID_FILE_TYPE)).toBe(true);
            }
        });

        test('should accept valid EVTX file paths', async () => {
            const validPath = path.join(tempDir, 'test.evtx');
            const evtxHeader = Buffer.from('ElfFile\0');
            await fs.writeFile(validPath, evtxHeader);

            const result = await securityService.validateFileAccess(validPath, 'read', SecurityLevel.BASIC);
            expect(result.valid).toBe(true);
            expect(result.issues.filter(issue => issue.severity === 'critical' || issue.severity === 'high')).toHaveLength(0);
        });

        test('should handle extremely long paths', async () => {
            const longPath = 'a'.repeat(300) + '.evtx';
            const result = await securityService.validateFileAccess(longPath, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(false);
            expect(result.issues.some(issue => issue.type === SecurityIssueType.UNSAFE_PATH)).toBe(true);
        });

        test('should detect unsafe characters in file paths', async () => {
            const unsafePaths = [
                'file<test>.evtx',
                'file|test.evtx',
                'file?test.evtx',
                'file*test.evtx',
                'CON.evtx',
                'PRN.evtx'
            ];

            for (const unsafePath of unsafePaths) {
                const result = await securityService.validateFileAccess(unsafePath, 'read', SecurityLevel.STRICT);
                expect(result.valid).toBe(false);
                expect(result.issues.some(issue => issue.type === SecurityIssueType.UNSAFE_CHARACTERS)).toBe(true);
            }
        });
    });

    describe('File System Validation', () => {
        test('should detect non-existent files', async () => {
            const nonExistentFile = path.join(tempDir, 'does-not-exist.evtx');
            
            const result = await securityService.validateFileAccess(nonExistentFile, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(false);
            expect(result.issues.some(issue => issue.type === SecurityIssueType.UNSAFE_PATH)).toBe(true);
        });

        test('should validate existing EVTX files', async () => {
            const validFile = path.join(tempDir, 'valid.evtx');
            const evtxContent = Buffer.from('ElfFile\0');
            await fs.writeFile(validFile, evtxContent);

            const result = await securityService.validateFileAccess(validFile, 'read', SecurityLevel.BASIC);
            expect(result.valid).toBe(true);
        });

        test('should handle directories correctly', async () => {
            const dirPath = path.join(tempDir, 'directory.evtx');
            await fs.mkdir(dirPath);

            const result = await securityService.validateFileAccess(dirPath, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(false);
            expect(result.issues.some(issue => issue.type === SecurityIssueType.INVALID_FILE_TYPE)).toBe(true);
        });
    });

    describe('Content Validation', () => {
        test('should validate EVTX file format with strict security level', async () => {
            const validEvtxFile = path.join(tempDir, 'valid.evtx');
            const evtxContent = Buffer.concat([
                Buffer.from('ElfFile\0', 'ascii'),
                Buffer.alloc(1000, 0x00) // Valid padding
            ]);
            await fs.writeFile(validEvtxFile, evtxContent);

            const result = await securityService.validateFileAccess(validEvtxFile, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(true);
        });

        test('should detect invalid file format', async () => {
            const invalidFile = path.join(tempDir, 'invalid.evtx');
            const invalidContent = Buffer.from('NotAnEvtxFile');
            await fs.writeFile(invalidFile, invalidContent);

            const result = await securityService.validateFileAccess(invalidFile, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(false);
            expect(result.issues.some(issue => issue.type === SecurityIssueType.SUSPICIOUS_CONTENT)).toBe(true);
        });

        test('should detect empty files', async () => {
            const emptyFile = path.join(tempDir, 'empty.evtx');
            await fs.writeFile(emptyFile, Buffer.alloc(0));

            const result = await securityService.validateFileAccess(emptyFile, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(false);
            expect(result.issues.some(issue => issue.type === SecurityIssueType.SUSPICIOUS_CONTENT)).toBe(true);
        });

        test('should skip content validation for basic security level', async () => {
            const anyFile = path.join(tempDir, 'any.evtx');
            await fs.writeFile(anyFile, Buffer.from('AnyContent'));

            const result = await securityService.validateFileAccess(anyFile, 'read', SecurityLevel.BASIC);
            
            // Should not have suspicious content issues in basic mode
            expect(result.issues.some(issue => issue.type === SecurityIssueType.SUSPICIOUS_CONTENT)).toBe(false);
        });
    });

    describe('Security Levels', () => {
        test('should allow all files with NONE security level', async () => {
            const dangerousFile = path.join(tempDir, '../../../dangerous.exe');
            
            const result = await securityService.validateFileAccess(dangerousFile, 'read', SecurityLevel.NONE);
            expect(result.valid).toBe(true);
            expect(result.level).toBe(SecurityLevel.NONE);
        });

        test('should enforce strict validation with STRICT security level', async () => {
            const maliciousFile = path.join(tempDir, '../malicious.evtx');
            
            const result = await securityService.validateFileAccess(maliciousFile, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(false);
            expect(result.level).toBe(SecurityLevel.STRICT);
            expect(result.issues.some(issue => issue.type === SecurityIssueType.PATH_TRAVERSAL)).toBe(true);
        });

        test('should provide appropriate recommendations', async () => {
            const badFile = path.join(tempDir, '../bad.exe');
            
            const result = await securityService.validateFileAccess(badFile, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(false);
            expect(result.recommendations).toBeDefined();
            expect(result.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('should handle null and undefined inputs gracefully', async () => {
            const result1 = await securityService.validateFileAccess('', 'read', SecurityLevel.STRICT);
            expect(result1.valid).toBe(false);
            expect(result1.issues.length).toBeGreaterThan(0);

            const result2 = await securityService.validateFileAccess(' ', 'read', SecurityLevel.STRICT);
            expect(result2.valid).toBe(false);
            expect(result2.issues.length).toBeGreaterThan(0);
        });

        test('should handle special characters in file paths', async () => {
            const specialCharPaths = [
                'file with spaces.evtx',
                'file-with-dashes.evtx',
                'file_with_underscores.evtx',
                'file.with.dots.evtx'
            ];

            for (const specialPath of specialCharPaths) {
                const fullPath = path.join(tempDir, specialPath);
                await fs.writeFile(fullPath, Buffer.from('ElfFile\0'));

                const result = await securityService.validateFileAccess(fullPath, 'read', SecurityLevel.STRICT);
                // These should be valid as they don't contain dangerous patterns
                expect(result.valid).toBe(true);
            }
        });

        test('should handle concurrent validation requests', async () => {
            const validPath = path.join(tempDir, 'concurrent-test.evtx');
            await fs.writeFile(validPath, Buffer.from('ElfFile\0'));

            // Run multiple validations concurrently
            const promises = Array.from({ length: 10 }, () => 
                securityService.validateFileAccess(validPath, 'read', SecurityLevel.STRICT)
            );

            const results = await Promise.all(promises);
            results.forEach(result => {
                expect(result.valid).toBe(true);
            });
        });

        test('should maintain singleton instance', () => {
            const service1 = SecurityValidationService.getInstance();
            const service2 = SecurityValidationService.getInstance();
            
            expect(service1).toBe(service2);
        });

        test('should handle file system errors gracefully', async () => {
            // Test with a very long path that might cause issues
            const longPath = path.join(tempDir, 'a'.repeat(500) + '.evtx');
            
            const result = await securityService.validateFileAccess(longPath, 'read', SecurityLevel.STRICT);
            expect(result.valid).toBe(false);
            expect(result.issues.some(issue => 
                issue.type === SecurityIssueType.UNSAFE_PATH || 
                issue.type === SecurityIssueType.PERMISSION_DENIED
            )).toBe(true);
        });
    });

    describe('Performance Under Attack', () => {
        test('should handle validation timeouts', async () => {
            const testFile = path.join(tempDir, 'timeout-test.evtx');
            await fs.writeFile(testFile, Buffer.from('ElfFile\0'));
            
            const startTime = Date.now();
            const result = await securityService.validateFileAccess(testFile, 'read', SecurityLevel.STRICT);
            const endTime = Date.now();
            
            // Should complete quickly for normal files
            expect(endTime - startTime).toBeLessThan(1000);
            expect(result).toBeDefined();
        });

        test('should maintain performance with rapid validation requests', async () => {
            const validFile = path.join(tempDir, 'rapid-test.evtx');
            await fs.writeFile(validFile, Buffer.from('ElfFile\0'));
            
            const startTime = Date.now();
            const rapidTests = Array.from({ length: 50 }, () =>
                securityService.validateFileAccess(validFile, 'read', SecurityLevel.BASIC)
            );
            
            const results = await Promise.all(rapidTests);
            const endTime = Date.now();
            
            // Should complete quickly
            expect(endTime - startTime).toBeLessThan(2000);  // 2 seconds max
            
            // All should be processed
            expect(results).toHaveLength(50);
            results.forEach(result => {
                expect(result).toBeDefined();
            });
        });
    });

    describe('Integration Scenarios', () => {
        test('should validate complete file processing workflow', async () => {
            // Simulate a complete validation workflow
            const testFile = path.join(tempDir, 'workflow-test.evtx');
            const validEvtxContent = Buffer.concat([
                Buffer.from('ElfFile\0', 'ascii'),
                Buffer.alloc(100, 0x00)
            ]);
            await fs.writeFile(testFile, validEvtxContent);
            
            // Step 1: Validate file access
            const accessResult = await securityService.validateFileAccess(testFile, 'read', SecurityLevel.STRICT);
            expect(accessResult.valid).toBe(true);
            
            // Step 2: Would then proceed to parsing (simulated)
            expect(accessResult.issues.filter(issue => 
                issue.severity === 'critical' || issue.severity === 'high'
            )).toHaveLength(0);
        });

        test('should maintain security boundaries across operations', async () => {
            const maliciousFile = path.join(tempDir, '../../../malicious.evtx');
            
            // Multiple security checks should all fail consistently
            const result1 = await securityService.validateFileAccess(maliciousFile, 'read', SecurityLevel.STRICT);
            const result2 = await securityService.validateFileAccess(maliciousFile, 'write', SecurityLevel.STRICT);
            
            expect(result1.valid).toBe(false);
            expect(result2.valid).toBe(false);
            
            // Both should detect the same security issues
            const hasPathTraversal1 = result1.issues.some(issue => issue.type === SecurityIssueType.PATH_TRAVERSAL);
            const hasPathTraversal2 = result2.issues.some(issue => issue.type === SecurityIssueType.PATH_TRAVERSAL);
            
            expect(hasPathTraversal1).toBe(true);
            expect(hasPathTraversal2).toBe(true);
        });
    });
});