/**
 * Security Validation Service
 *
 * Handles security validation for file access, input sanitization,
 * and secure handling of EVTX data per constitutional requirements.
 *
 * @example
 * ```typescript
 * const securityService = SecurityValidationService.getInstance();
 * const validation = await securityService.validateFileAccess('/path/to/file.evtx');
 *
 * if (validation.valid) {
 *   // Safe to proceed with file operations
 * } else {
 * }
 * ```
 *
 * @constitutional
 * - Enforces 512MB file size limit per constitutional requirements
 * - Validates all file access operations for security compliance
 * - Prevents path traversal attacks and malicious file access
 * - Supports WCAG 2.1 AA accessibility through comprehensive error reporting
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ErrorUtils } from './error_service';

/**
 * Security validation levels that determine strictness of validation checks.
 *
 * @public
 */
export enum SecurityLevel {
  /** No security validation - use with extreme caution */
  NONE = 'none',
  /** Basic security checks for file type and permissions */
  BASIC = 'basic',
  /** Strict security validation including content analysis (recommended) */
  STRICT = 'strict',
}

/**
 * File access permissions and metadata information.
 *
 * @public
 */
export interface FileAccessPermissions {
  /** Whether the file can be read by the current user */
  readonly canRead: boolean;
  /** Whether the file can be written by the current user */
  readonly canWrite: boolean;
  /** Whether the file has executable permissions */
  readonly isExecutable: boolean;
  /** Whether the file is a symbolic link */
  readonly isSymlink: boolean;
  /** File owner information */
  readonly owner: string;
  /** File size in bytes (constitutional limit: 512MB) */
  readonly size: number;
}

/**
 * Result of security validation operations.
 *
 * @public
 */
export interface SecurityValidationResult {
  /** Whether the validation passed (true = safe to proceed) */
  readonly valid: boolean;
  /** Security level used for validation */
  readonly level: SecurityLevel;
  /** Array of security issues found during validation */
  readonly issues: SecurityIssue[];
  /** Human-readable recommendations for addressing issues */
  readonly recommendations: string[];
}

/**
 * Types of security issues that can be detected during validation.
 *
 * @public
 */
export enum SecurityIssueType {
  /** Unsafe file path detected */
  UNSAFE_PATH = 'unsafe_path',
  /** Invalid file type (not .evtx) */
  INVALID_FILE_TYPE = 'invalid_file_type',
  /** File exceeds constitutional 512MB size limit */
  EXCESSIVE_FILE_SIZE = 'excessive_file_size',
  /** Insufficient permissions to access file */
  PERMISSION_DENIED = 'permission_denied',
  /** Suspicious content patterns detected */
  SUSPICIOUS_CONTENT = 'suspicious_content',
  /** Path traversal attempt detected (../) */
  PATH_TRAVERSAL = 'path_traversal',
  /** Unsafe characters in file path */
  UNSAFE_CHARACTERS = 'unsafe_characters',
  /** Potential symbolic link attack */
  SYMLINK_ATTACK = 'symlink_attack',
  /** File could cause memory exhaustion */
  MEMORY_EXHAUSTION = 'memory_exhaustion',
}

/**
 * Individual security issue found during validation.
 *
 * @public
 */
export interface SecurityIssue {
  /** Type of security issue detected */
  readonly type: SecurityIssueType;
  /** Severity level of the issue */
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  /** Human-readable description of the issue */
  readonly message: string;
  /** Additional details about the issue (optional) */
  readonly details?: Record<string, unknown>;
  /** Specific recommendation for addressing this issue (optional) */
  readonly recommendation?: string;
}

/**
 * Security Validation Service
 *
 * Singleton service that provides comprehensive security validation for all EVTX file operations.
 * Implements constitutional requirements for security and performance.
 *
 * @example
 * ```typescript
 * // Get singleton instance
 * const security = SecurityValidationService.getInstance();
 *
 * // Validate file access
 * const validation = await security.validateFileAccess('/path/to/log.evtx');
 *
 * if (!validation.valid) {
 *   validation.issues.forEach(issue => {
 *     if (issue.recommendation) {
 *     }
 *   });
 * }
 * ```
 *
 * @constitutional
 * - Enforces 512MB file size limit per constitutional requirements
 * - Validates all file operations for security compliance
 * - Provides comprehensive path traversal prevention
 * - Supports accessibility through detailed error reporting
 *
 * @public
 */
export class SecurityValidationService {
  private static instance: SecurityValidationService | undefined;

  /**
   * Constitutional limits from requirements
   * @private
   */
  private static readonly MAX_FILE_SIZE = 512 * 1024 * 1024; // 512MB
  private static readonly MAX_MEMORY_USAGE = 512 * 1024 * 1024; // 512MB
  private static readonly ALLOWED_FILE_EXTENSIONS = ['.evtx'];
  private static readonly BLOCKED_PATH_PATTERNS = [
    /\.\./, // Parent directory traversal
    /[<>:"|?*]/, // Windows invalid characters
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1f]/, // Control characters (security validation)
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    /^\./, // Hidden files (Unix)
  ];

  // Malicious content signatures (simplified)
  private static readonly SUSPICIOUS_SIGNATURES = [
    Buffer.from([0x4d, 0x5a]), // PE header (MZ)
    Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF header
    Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Java class file
    Buffer.from([0x50, 0x4b, 0x03, 0x04]), // ZIP/Office files (potential macro)
  ];

  /**
   * Private constructor for singleton pattern.
   * Use getInstance() to get the service instance.
   *
   * @private
   */
  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance of SecurityValidationService.
   *
   * @returns The singleton SecurityValidationService instance
   * @public
   */
  public static getInstance(): SecurityValidationService {
    if (!SecurityValidationService.instance) {
      SecurityValidationService.instance = new SecurityValidationService();
    }
    return SecurityValidationService.instance;
  }

  /**
   * Validate file access for EVTX operations with comprehensive security checks.
   *
   * Performs multiple layers of validation:
   * - Path validation (traversal prevention, unsafe characters)
   * - File system checks (permissions, file type, size limits)
   * - Content validation (malicious pattern detection)
   *
   * @param filePath - Absolute path to the file to validate
   * @param operation - Type of operation ('read' or 'write')
   * @param level - Security validation level (NONE, BASIC, or STRICT)
   *
   * @returns Promise resolving to comprehensive validation result
   *
   * @example
   * ```typescript
   * const security = SecurityValidationService.getInstance();
   *
   * // Basic file validation
   * const result = await security.validateFileAccess('/path/to/log.evtx');
   *
   * // Strict validation for write operations
   * const writeResult = await security.validateFileAccess(
   *   '/path/to/output.evtx',
   *   'write',
   *   SecurityLevel.STRICT
   * );
   *
   * // Handle validation results
   * if (!result.valid) {
   *   const criticalIssues = result.issues.filter(i => i.severity === 'critical');
   *   if (criticalIssues.length > 0) {
   *     throw new Error(`Critical security issues: ${criticalIssues.map(i => i.message)}`);
   *   }
   * }
   * ```
   *
   * @throws Never throws - all errors are captured in validation result
   *
   * @constitutional
   * - Enforces 512MB file size limit per constitutional requirements
   * - Validates all file operations for security compliance
   * - Performance: <1ms validation time for typical files
   *
   * @public
   */
  public async validateFileAccess(
    filePath: string,
    operation: 'read' | 'write' = 'read',
    level: SecurityLevel = SecurityLevel.STRICT
  ): Promise<SecurityValidationResult> {
    const issues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    try {
      // Basic path validation
      const pathIssues = this.validateFilePath(filePath);
      issues.push(...pathIssues);

      // File system checks
      const fsIssues = await this.validateFileSystem(filePath, operation);
      issues.push(...fsIssues);

      // Content validation for read operations
      if (operation === 'read' && level !== SecurityLevel.NONE) {
        const contentIssues = await this.validateFileContent(filePath, level);
        issues.push(...contentIssues);
      }

      // Generate recommendations based on issues
      recommendations.push(...this.generateRecommendations(issues));

      // Determine if validation passes
      const criticalIssues = issues.filter(
        (issue) => issue.severity === 'critical' || issue.severity === 'high'
      );

      const valid = level === SecurityLevel.NONE || criticalIssues.length === 0;

      return {
        valid,
        level,
        issues,
        recommendations,
      };
    } catch (error) {
      // Handle validation errors securely
      issues.push({
        type: SecurityIssueType.PERMISSION_DENIED,
        severity: 'high',
        message: 'Security validation failed',
        details: { error: error instanceof Error ? error.message : String(error) },
      });

      return {
        valid: false,
        level,
        issues,
        recommendations: ['Contact support for assistance'],
      };
    }
  }

  /**
   * Validate file path for security issues
   */
  private validateFilePath(filePath: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Normalize path
    const normalizedPath = path.normalize(filePath);

    // Check for path traversal attempts
    if (normalizedPath.includes('..')) {
      issues.push({
        type: SecurityIssueType.PATH_TRAVERSAL,
        severity: 'critical',
        message: 'Path traversal attempt detected',
        details: { path: filePath },
        recommendation: 'Use absolute paths without parent directory references',
      });
    }

    // Check for unsafe characters
    for (const pattern of SecurityValidationService.BLOCKED_PATH_PATTERNS) {
      if (pattern.test(path.basename(filePath))) {
        issues.push({
          type: SecurityIssueType.UNSAFE_CHARACTERS,
          severity: 'high',
          message: 'Unsafe characters detected in file path',
          details: { path: filePath, pattern: pattern.toString() },
          recommendation: 'Use only alphanumeric characters, hyphens, and underscores',
        });
      }
    }

    // Validate file extension
    const ext = path.extname(filePath).toLowerCase();
    if (!SecurityValidationService.ALLOWED_FILE_EXTENSIONS.includes(ext)) {
      issues.push({
        type: SecurityIssueType.INVALID_FILE_TYPE,
        severity: 'medium',
        message: `Invalid file extension: ${ext}`,
        details: { extension: ext, allowed: SecurityValidationService.ALLOWED_FILE_EXTENSIONS },
        recommendation: 'Only EVTX files are supported for security reasons',
      });
    }

    // Check path length (Windows MAX_PATH limitation)
    if (filePath.length > 260) {
      issues.push({
        type: SecurityIssueType.UNSAFE_PATH,
        severity: 'medium',
        message: 'File path exceeds maximum length',
        details: { length: filePath.length, maxLength: 260 },
        recommendation: 'Use shorter file paths or enable long path support',
      });
    }

    return issues;
  }

  /**
   * Validate file system access and permissions
   */
  private async validateFileSystem(
    filePath: string,
    operation: 'read' | 'write'
  ): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    try {
      const stats = await fs.stat(filePath);

      // Check if it's a regular file
      if (!stats.isFile()) {
        issues.push({
          type: SecurityIssueType.INVALID_FILE_TYPE,
          severity: 'high',
          message: 'Path does not point to a regular file',
          details: {
            isDirectory: stats.isDirectory(),
            isSymbolicLink: stats.isSymbolicLink(),
            isBlockDevice: stats.isBlockDevice(),
          },
          recommendation: 'Select a regular EVTX file',
        });
      }

      // Check for symbolic links (potential security risk)
      if (stats.isSymbolicLink()) {
        issues.push({
          type: SecurityIssueType.SYMLINK_ATTACK,
          severity: 'medium',
          message: 'Symbolic link detected',
          details: { path: filePath },
          recommendation: 'Use direct file paths instead of symbolic links',
        });
      }

      // Check file size against constitutional limits
      if (stats.size > SecurityValidationService.MAX_FILE_SIZE) {
        issues.push({
          type: SecurityIssueType.EXCESSIVE_FILE_SIZE,
          severity: 'high',
          message: 'File exceeds maximum allowed size',
          details: {
            size: stats.size,
            maxSize: SecurityValidationService.MAX_FILE_SIZE,
            sizeMB: Math.round(stats.size / (1024 * 1024)),
          },
          recommendation: 'Use files smaller than 512MB',
        });
      }

      // Estimate memory requirements
      const estimatedMemoryUsage = stats.size * 1.5; // Conservative estimate
      if (estimatedMemoryUsage > SecurityValidationService.MAX_MEMORY_USAGE) {
        issues.push({
          type: SecurityIssueType.MEMORY_EXHAUSTION,
          severity: 'medium',
          message: 'File may cause memory exhaustion',
          details: {
            estimatedMemory: estimatedMemoryUsage,
            maxMemory: SecurityValidationService.MAX_MEMORY_USAGE,
          },
          recommendation: 'Consider processing smaller files or increasing memory limits',
        });
      }

      // Check file permissions
      try {
        await fs.access(filePath, operation === 'read' ? fs.constants.R_OK : fs.constants.W_OK);
      } catch {
        issues.push({
          type: SecurityIssueType.PERMISSION_DENIED,
          severity: 'high',
          message: `Insufficient permissions for ${operation} operation`,
          details: { operation, path: filePath },
          recommendation: `Ensure you have ${operation} permissions for this file`,
        });
      }
    } catch (error) {
      if ((error as { code?: string }).code === 'ENOENT') {
        issues.push({
          type: SecurityIssueType.UNSAFE_PATH,
          severity: 'high',
          message: 'File does not exist',
          details: { path: filePath },
          recommendation: 'Verify the file path is correct',
        });
      } else {
        issues.push({
          type: SecurityIssueType.PERMISSION_DENIED,
          severity: 'high',
          message: 'Cannot access file',
          details: {
            path: filePath,
            error: error instanceof Error ? error.message : String(error),
          },
          recommendation: 'Check file permissions and accessibility',
        });
      }
    }

    return issues;
  }

  /**
   * Validate file content for malicious signatures
   */
  private async validateFileContent(
    filePath: string,
    level: SecurityLevel
  ): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];

    if (level === SecurityLevel.BASIC) {
      return issues; // Skip content validation for basic level
    }

    try {
      // Read first 1KB for signature analysis
      const handle = await fs.open(filePath, 'r');
      const buffer = Buffer.alloc(1024);
      const { bytesRead } = await handle.read(buffer, 0, 1024, 0);
      await handle.close();

      if (bytesRead === 0) {
        issues.push({
          type: SecurityIssueType.SUSPICIOUS_CONTENT,
          severity: 'medium',
          message: 'File appears to be empty',
          details: { size: bytesRead },
          recommendation: 'Verify the file contains valid EVTX data',
        });
        return issues;
      }

      // Check for EVTX signature
      const evtxSignature = Buffer.from('ElfFile\0', 'ascii');
      if (!buffer.subarray(0, evtxSignature.length).equals(evtxSignature)) {
        issues.push({
          type: SecurityIssueType.SUSPICIOUS_CONTENT,
          severity: 'medium',
          message: 'File does not appear to be a valid EVTX file',
          details: { expectedSignature: evtxSignature.toString('hex') },
          recommendation: 'Verify this is a Windows Event Log file',
        });
      }

      // Check for suspicious signatures
      for (const signature of SecurityValidationService.SUSPICIOUS_SIGNATURES) {
        for (let i = 0; i <= buffer.length - signature.length; i++) {
          if (buffer.subarray(i, i + signature.length).equals(signature)) {
            issues.push({
              type: SecurityIssueType.SUSPICIOUS_CONTENT,
              severity: 'high',
              message: 'Suspicious binary signature detected',
              details: {
                signature: signature.toString('hex'),
                offset: i,
              },
              recommendation: 'This file may contain malicious content. Proceed with caution.',
            });
            break;
          }
        }
      }
    } catch (error) {
      issues.push({
        type: SecurityIssueType.SUSPICIOUS_CONTENT,
        severity: 'medium',
        message: 'Cannot validate file content',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        recommendation: 'File content validation failed',
      });
    }

    return issues;
  }

  /**
   * Generate security recommendations based on issues
   */
  private generateRecommendations(issues: SecurityIssue[]): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter((issue) => issue.severity === 'critical');
    const highIssues = issues.filter((issue) => issue.severity === 'high');
    const mediumIssues = issues.filter((issue) => issue.severity === 'medium');

    if (criticalIssues.length > 0) {
      recommendations.push(
        '⚠️ Critical security issues detected. Do not proceed without addressing these issues.'
      );
    }

    if (highIssues.length > 0) {
      recommendations.push('High-risk security issues found. Review carefully before proceeding.');
    }

    if (mediumIssues.length > 0) {
      recommendations.push(
        'Medium-risk security issues identified. Consider addressing before processing.'
      );
    }

    // Specific recommendations
    const hasPathIssues = issues.some(
      (issue) =>
        issue.type === SecurityIssueType.PATH_TRAVERSAL ||
        issue.type === SecurityIssueType.UNSAFE_CHARACTERS
    );
    if (hasPathIssues) {
      recommendations.push('Use absolute paths with safe characters only.');
    }

    const hasPermissionIssues = issues.some(
      (issue) => issue.type === SecurityIssueType.PERMISSION_DENIED
    );
    if (hasPermissionIssues) {
      recommendations.push(
        'Verify file permissions and ensure you have appropriate access rights.'
      );
    }

    const hasSizeIssues = issues.some(
      (issue) =>
        issue.type === SecurityIssueType.EXCESSIVE_FILE_SIZE ||
        issue.type === SecurityIssueType.MEMORY_EXHAUSTION
    );
    if (hasSizeIssues) {
      recommendations.push('Consider processing smaller files or adjusting memory limits.');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Sanitize input string to prevent injection attacks
   */
  public sanitizeInput(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      return '';
    }

    // Truncate to max length
    let sanitized = input.slice(0, maxLength);

    // Remove control characters except whitespace (security sanitization)
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

    // Remove potential script injection patterns
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove potential SQL injection patterns
    sanitized = sanitized.replace(/(['";]|--|\*\/|\*\*)/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  /**
   * Validate and sanitize file path
   */
  public sanitizeFilePath(filePath: string): string {
    if (typeof filePath !== 'string') {
      return '';
    }

    // Normalize path
    let sanitized = path.normalize(filePath);

    // Remove dangerous patterns
    sanitized = sanitized.replace(/\.\./g, ''); // Remove parent directory references
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, ''); // Remove invalid characters (security)

    // Ensure it's an absolute path on Windows/Unix
    if (!path.isAbsolute(sanitized)) {
      sanitized = path.resolve(sanitized);
    }

    return sanitized;
  }

  /**
   * Check if operation is within security limits
   */
  public checkResourceLimits(
    operation: string,
    memoryUsage?: number,
    fileSize?: number,
    processingTime?: number
  ): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    if (memoryUsage && memoryUsage > SecurityValidationService.MAX_MEMORY_USAGE) {
      issues.push({
        type: SecurityIssueType.MEMORY_EXHAUSTION,
        severity: 'critical',
        message: `Operation "${operation}" exceeds memory limit`,
        details: {
          memoryUsage,
          maxMemory: SecurityValidationService.MAX_MEMORY_USAGE,
          operation,
        },
        recommendation: 'Reduce memory usage or process data in smaller chunks',
      });
    }

    if (fileSize && fileSize > SecurityValidationService.MAX_FILE_SIZE) {
      issues.push({
        type: SecurityIssueType.EXCESSIVE_FILE_SIZE,
        severity: 'high',
        message: `File size exceeds limit for operation "${operation}"`,
        details: {
          fileSize,
          maxSize: SecurityValidationService.MAX_FILE_SIZE,
          operation,
        },
        recommendation: 'Use smaller files or implement streaming processing',
      });
    }

    // Processing time limit (5 minutes for any single operation)
    const MAX_PROCESSING_TIME = 5 * 60 * 1000; // 5 minutes
    if (processingTime && processingTime > MAX_PROCESSING_TIME) {
      issues.push({
        type: SecurityIssueType.MEMORY_EXHAUSTION, // Reuse enum for timeout
        severity: 'medium',
        message: `Operation "${operation}" taking too long`,
        details: {
          processingTime,
          maxTime: MAX_PROCESSING_TIME,
          operation,
        },
        recommendation:
          'Consider implementing progress indicators or breaking into smaller operations',
      });
    }

    return issues;
  }

  /**
   * Handle security validation failure
   */
  public async handleSecurityFailure(
    result: SecurityValidationResult,
    operation: string,
    filePath: string
  ): Promise<void> {
    const criticalIssues = result.issues.filter((issue) => issue.severity === 'critical');
    const highIssues = result.issues.filter((issue) => issue.severity === 'high');

    if (criticalIssues.length > 0) {
      // Log critical security issues
      await ErrorUtils.handleSecurityError(
        `Critical security violations detected during ${operation}`,
        operation,
        filePath
      );

      // Show blocking error to user
      await vscode.window.showErrorMessage(
        'Security validation failed: Critical issues detected',
        { modal: true },
        'Show Details'
      );
    } else if (highIssues.length > 0) {
      // Show warning for high-risk issues
      const proceed = await vscode.window.showWarningMessage(
        'Security issues detected. Proceed with caution?',
        { modal: true },
        'Show Details',
        'Proceed Anyway',
        'Cancel'
      );

      if (proceed === 'Show Details') {
        this.showSecurityDetails(result);
      }
    }
  }

  /**
   * Show detailed security validation results
   */
  private showSecurityDetails(result: SecurityValidationResult): void {
    const channel = vscode.window.createOutputChannel('EVTX Security Validation');
    channel.show();

    channel.appendLine('=== SECURITY VALIDATION RESULTS ===');
    channel.appendLine(`Validation Level: ${result.level}`);
    channel.appendLine(`Status: ${result.valid ? 'PASSED' : 'FAILED'}`);
    channel.appendLine(`Total Issues: ${result.issues.length}`);
    channel.appendLine('');

    if (result.issues.length > 0) {
      channel.appendLine('SECURITY ISSUES:');
      for (const issue of result.issues) {
        channel.appendLine(`[${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}`);
        if (issue.recommendation) {
          channel.appendLine(`  Recommendation: ${issue.recommendation}`);
        }
        if (issue.details) {
          channel.appendLine(`  Details: ${JSON.stringify(issue.details, null, 2)}`);
        }
        channel.appendLine('');
      }
    }

    if (result.recommendations.length > 0) {
      channel.appendLine('RECOMMENDATIONS:');
      for (const recommendation of result.recommendations) {
        channel.appendLine(`• ${recommendation}`);
      }
      channel.appendLine('');
    }

    channel.appendLine('=== END SECURITY VALIDATION ===');
  }

  /**
   * Get security configuration from VS Code settings
   */
  public getSecurityConfiguration(): {
    level: SecurityLevel;
    allowSymlinks: boolean;
    maxFileSize: number;
    enableContentValidation: boolean;
  } {
    const config = vscode.workspace.getConfiguration('evtxViewer.security');

    return {
      level: config.get<SecurityLevel>('validationLevel', SecurityLevel.STRICT),
      allowSymlinks: config.get<boolean>('allowSymlinks', false),
      maxFileSize: config.get<number>('maxFileSize', SecurityValidationService.MAX_FILE_SIZE),
      enableContentValidation: config.get<boolean>('enableContentValidation', true),
    };
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    // Clean up any resources if needed
    SecurityValidationService.instance = undefined;
  }
}

// Export singleton instance
export function getSecurityService(): SecurityValidationService {
  return SecurityValidationService.getInstance();
}

// Security middleware for common operations
export namespace SecurityMiddleware {
  /**
   * Secure file access wrapper
   */
  export async function secureFileAccess<T>(
    filePath: string,
    operation: 'read' | 'write',
    callback: (path: string) => Promise<T>,
    options: {
      securityLevel?: SecurityLevel;
      allowOverride?: boolean;
    } = {}
  ): Promise<T> {
    const securityService = getSecurityService();
    const level = options.securityLevel ?? SecurityLevel.STRICT;

    // Sanitize file path
    const sanitizedPath = securityService.sanitizeFilePath(filePath);

    // Validate security
    const validation = await securityService.validateFileAccess(sanitizedPath, operation, level);

    if (!validation.valid) {
      if (options.allowOverride) {
        // Show warning but allow override
        const proceed = await vscode.window.showWarningMessage(
          'Security validation failed. Proceed anyway?',
          'Show Details',
          'Proceed',
          'Cancel'
        );

        if (proceed === 'Show Details') {
          await securityService.handleSecurityFailure(validation, operation, sanitizedPath);
          return secureFileAccess(filePath, operation, callback, options);
        } else if (proceed !== 'Proceed') {
          throw new Error('Operation cancelled due to security concerns');
        }
      } else {
        await securityService.handleSecurityFailure(validation, operation, sanitizedPath);
        throw new Error('Security validation failed');
      }
    }

    return callback(sanitizedPath);
  }
}
