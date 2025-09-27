/**
 * Error Handling Middleware
 *
 * Comprehensive error handling system with user-friendly messages,
 * logging, recovery options, and consistent error formatting.
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

// Error severity levels
export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Error categories for better organization
export enum ErrorCategory {
  FILE_IO = 'file_io',
  PARSING = 'parsing',
  MEMORY = 'memory',
  NETWORK = 'network',
  VALIDATION = 'validation',
  SECURITY = 'security',
  EXTENSION = 'extension',
  USER_INPUT = 'user_input',
  SYSTEM = 'system',
}

// Recovery actions that can be suggested to users
export enum RecoveryAction {
  RETRY = 'retry',
  RELOAD = 'reload',
  CLEAR_CACHE = 'clear_cache',
  CHECK_PERMISSIONS = 'check_permissions',
  UPDATE_EXTENSION = 'update_extension',
  RESTART_VSCODE = 'restart_vscode',
  CONTACT_SUPPORT = 'contact_support',
  NONE = 'none',
}

export interface ErrorContext {
  readonly timestamp: Date;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly operation?: string; // What was being attempted
  readonly filePath?: string; // File being processed
  readonly userId?: string; // For logging/analytics
  readonly correlationId?: string; // For tracking related errors
  readonly metadata?: Record<string, unknown>; // Additional context
}

export interface ErrorDetails {
  readonly code: string; // Error code for programmatic handling
  readonly message: string; // User-friendly message
  readonly technicalMessage?: string; // Technical details for developers
  readonly cause?: Error; // Original error if wrapped
  readonly context: ErrorContext;
  readonly recoveryActions: RecoveryAction[];
  readonly documentationUrl?: string; // Link to help docs
  readonly reportable: boolean; // Whether to offer bug report option
}

export class EVTXError extends Error {
  public readonly details: ErrorDetails;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'EVTXError';
    this.details = details;

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EVTXError);
    }
  }

  /**
   * Get error details as JSON for logging
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.details.code,
      severity: this.details.context.severity,
      category: this.details.context.category,
      operation: this.details.context.operation,
      filePath: this.details.context.filePath,
      timestamp: this.details.context.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Create user-friendly display message
   */
  public getUserMessage(): string {
    let message = this.details.message;

    if (this.details.context.operation) {
      message = `${this.details.context.operation}: ${message}`;
    }

    return message;
  }

  /**
   * Get suggested recovery actions as user-friendly strings
   */
  public getRecoveryOptions(): string[] {
    return this.details.recoveryActions
      .map((action) => {
        switch (action) {
          case RecoveryAction.RETRY:
            return 'Try Again';
          case RecoveryAction.RELOAD:
            return 'Reload File';
          case RecoveryAction.CLEAR_CACHE:
            return 'Clear Cache';
          case RecoveryAction.CHECK_PERMISSIONS:
            return 'Check File Permissions';
          case RecoveryAction.UPDATE_EXTENSION:
            return 'Update Extension';
          case RecoveryAction.RESTART_VSCODE:
            return 'Restart VS Code';
          case RecoveryAction.CONTACT_SUPPORT:
            return 'Report Issue';
          default:
            return '';
        }
      })
      .filter((option) => option !== '');
  }
}

export class ErrorService {
  private static instance: ErrorService | undefined;
  private readonly emitter = new EventEmitter();
  private readonly errorLog: EVTXError[] = [];
  private readonly maxLogSize = 100;
  private outputChannel: vscode.OutputChannel | undefined;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  /**
   * Handle an error with full processing
   */
  public async handleError(
    error: Error | EVTXError,
    context?: Partial<ErrorContext>
  ): Promise<void> {
    const evtxError = this.normalizeError(error, context);

    // Log the error
    this.logError(evtxError);

    // Emit error event for listeners
    this.emitter.emit('error', evtxError);

    // Show user notification based on severity
    await this.showErrorNotification(evtxError);
  }

  /**
   * Create a standardized EVTX error
   */
  public createError(
    code: string,
    message: string,
    context: Partial<ErrorContext> = {},
    options: {
      cause?: Error;
      technicalMessage?: string;
      recoveryActions?: RecoveryAction[];
      documentationUrl?: string;
      reportable?: boolean;
    } = {}
  ): EVTXError {
    const errorContext: ErrorContext = {
      timestamp: new Date(),
      severity: context.severity ?? ErrorSeverity.ERROR,
      category: context.category ?? ErrorCategory.SYSTEM,
      correlationId: context.correlationId ?? this.generateCorrelationId(),
      ...(context.operation !== undefined && { operation: context.operation }),
      ...(context.filePath !== undefined && { filePath: context.filePath }),
      ...(context.userId !== undefined && { userId: context.userId }),
      ...(context.metadata !== undefined && { metadata: context.metadata }),
    };

    const details: ErrorDetails = {
      code,
      message,
      context: errorContext,
      recoveryActions: options.recoveryActions ?? [RecoveryAction.NONE],
      reportable: options.reportable ?? false,
      ...(options.technicalMessage !== undefined && { technicalMessage: options.technicalMessage }),
      ...(options.cause !== undefined && { cause: options.cause }),
      ...(options.documentationUrl !== undefined && { documentationUrl: options.documentationUrl }),
    };

    return new EVTXError(details);
  }

  /**
   * Wrap an existing error with EVTX error details
   */
  public wrapError(
    error: Error,
    code: string,
    userMessage: string,
    context: Partial<ErrorContext> = {},
    recoveryActions: RecoveryAction[] = [RecoveryAction.NONE]
  ): EVTXError {
    return this.createError(code, userMessage, context, {
      cause: error,
      technicalMessage: error.message,
      recoveryActions,
      reportable: context.severity === ErrorSeverity.CRITICAL,
    });
  }

  /**
   * Convert any error to EVTXError
   */
  private normalizeError(error: Error | EVTXError, context?: Partial<ErrorContext>): EVTXError {
    if (error instanceof EVTXError) {
      return error;
    }

    // Map common Node.js errors to user-friendly messages
    const { code, message, recoveryActions } = this.mapSystemError(error);

    return this.wrapError(error, code, message, context, recoveryActions);
  }

  /**
   * Map system errors to user-friendly messages
   */
  private mapSystemError(error: Error): {
    code: string;
    message: string;
    recoveryActions: RecoveryAction[];
  } {
    const errorCode = (error as any).code;

    switch (errorCode) {
      case 'ENOENT':
        return {
          code: 'FILE_NOT_FOUND',
          message: 'The file could not be found. It may have been moved or deleted.',
          recoveryActions: [RecoveryAction.RETRY, RecoveryAction.CHECK_PERMISSIONS],
        };

      case 'EACCES':
      case 'EPERM':
        return {
          code: 'FILE_PERMISSION_DENIED',
          message: 'Permission denied. You may not have access to this file.',
          recoveryActions: [RecoveryAction.CHECK_PERMISSIONS],
        };

      case 'EMFILE':
      case 'ENFILE':
        return {
          code: 'TOO_MANY_FILES',
          message: 'Too many files are open. Try closing some files and try again.',
          recoveryActions: [RecoveryAction.RETRY, RecoveryAction.RESTART_VSCODE],
        };

      case 'ENOSPC':
        return {
          code: 'DISK_FULL',
          message: 'Not enough disk space available.',
          recoveryActions: [RecoveryAction.CONTACT_SUPPORT],
        };

      case 'ENOMEM':
        return {
          code: 'OUT_OF_MEMORY',
          message: 'Out of memory. Try closing other applications or processing smaller files.',
          recoveryActions: [RecoveryAction.CLEAR_CACHE, RecoveryAction.RESTART_VSCODE],
        };

      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: error.message || 'An unexpected error occurred.',
          recoveryActions: [RecoveryAction.RETRY, RecoveryAction.CONTACT_SUPPORT],
        };
    }
  }

  /**
   * Log error to output channel and memory
   */
  private logError(error: EVTXError): void {
    // Add to in-memory log
    this.errorLog.push(error);

    // Maintain max log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.splice(0, this.errorLog.length - this.maxLogSize);
    }

    // Log to output channel
    this.getOutputChannel().appendLine(
      `[${error.details.context.timestamp.toISOString()}] ` +
        `${error.details.context.severity.toUpperCase()} - ` +
        `${error.details.code}: ${error.message}`
    );

    if (error.details.technicalMessage) {
      this.getOutputChannel().appendLine(`Technical: ${error.details.technicalMessage}`);
    }

    if (error.details.context.operation) {
      this.getOutputChannel().appendLine(`Operation: ${error.details.context.operation}`);
    }

    if (error.details.context.filePath) {
      this.getOutputChannel().appendLine(`File: ${error.details.context.filePath}`);
    }

    if (error.stack) {
      this.getOutputChannel().appendLine(`Stack: ${error.stack}`);
    }

    this.getOutputChannel().appendLine('---');
  }

  /**
   * Show error notification to user based on severity
   */
  private async showErrorNotification(error: EVTXError): Promise<void> {
    const message = error.getUserMessage();
    const recoveryOptions = error.getRecoveryOptions();

    // Add standard options
    const allOptions = [...recoveryOptions];

    if (error.details.reportable) {
      allOptions.push('Report Issue');
    }

    if (error.details.documentationUrl) {
      allOptions.push('View Documentation');
    }

    allOptions.push('Show Details', 'Dismiss');

    let selectedAction: string | undefined;

    switch (error.details.context.severity) {
      case ErrorSeverity.CRITICAL:
        selectedAction = await vscode.window.showErrorMessage(
          message,
          { modal: true },
          ...allOptions
        );
        break;

      case ErrorSeverity.ERROR:
        selectedAction = await vscode.window.showErrorMessage(message, ...allOptions);
        break;

      case ErrorSeverity.WARNING:
        selectedAction = await vscode.window.showWarningMessage(message, ...allOptions);
        break;

      case ErrorSeverity.INFO:
        selectedAction = await vscode.window.showInformationMessage(message, ...allOptions);
        break;
    }

    // Handle selected action
    if (selectedAction) {
      await this.handleRecoveryAction(selectedAction, error);
    }
  }

  /**
   * Handle user recovery action selection
   */
  private async handleRecoveryAction(action: string, error: EVTXError): Promise<void> {
    switch (action) {
      case 'Show Details':
        this.showErrorDetails(error);
        break;

      case 'Report Issue':
        await this.reportIssue(error);
        break;

      case 'View Documentation':
        if (error.details.documentationUrl) {
          vscode.env.openExternal(vscode.Uri.parse(error.details.documentationUrl));
        }
        break;

      case 'Clear Cache':
        // Emit event for cache clearing
        this.emitter.emit('clearCache');
        break;

      case 'Restart VS Code': {
        const restart = await vscode.window.showInformationMessage(
          'Restart VS Code now?',
          'Restart',
          'Cancel'
        );
        if (restart === 'Restart') {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
        break;
      }

      default:
        // Emit recovery action for other components to handle
        this.emitter.emit('recoveryAction', action, error);
        break;
    }
  }

  /**
   * Show detailed error information
   */
  private showErrorDetails(error: EVTXError): void {
    const channel = this.getOutputChannel();
    channel.show();
    channel.appendLine('=== ERROR DETAILS ===');
    channel.appendLine(`Code: ${error.details.code}`);
    channel.appendLine(`Message: ${error.message}`);
    channel.appendLine(`Severity: ${error.details.context.severity}`);
    channel.appendLine(`Category: ${error.details.context.category}`);
    channel.appendLine(`Timestamp: ${error.details.context.timestamp.toISOString()}`);

    if (error.details.context.operation) {
      channel.appendLine(`Operation: ${error.details.context.operation}`);
    }

    if (error.details.context.filePath) {
      channel.appendLine(`File: ${error.details.context.filePath}`);
    }

    if (error.details.technicalMessage) {
      channel.appendLine(`Technical Details: ${error.details.technicalMessage}`);
    }

    if (error.stack) {
      channel.appendLine(`Stack Trace:\n${error.stack}`);
    }

    channel.appendLine('=== END ERROR DETAILS ===\n');
  }

  /**
   * Open issue reporting
   */
  private async reportIssue(error: EVTXError): Promise<void> {
    const issueBody = this.generateIssueReport(error);
    const repoUrl = 'https://github.com/your-username/evtx-viewer'; // Update with actual repo
    const issueUrl = `${repoUrl}/issues/new?body=${encodeURIComponent(issueBody)}`;

    vscode.env.openExternal(vscode.Uri.parse(issueUrl));
  }

  /**
   * Generate issue report template
   */
  private generateIssueReport(error: EVTXError): string {
    return `## Error Report

**Error Code:** ${error.details.code}
**Message:** ${error.message}
**Severity:** ${error.details.context.severity}
**Category:** ${error.details.context.category}
**Timestamp:** ${error.details.context.timestamp.toISOString()}

### Context
${error.details.context.operation ? `**Operation:** ${error.details.context.operation}\n` : ''}${error.details.context.filePath ? `**File:** ${error.details.context.filePath}\n` : ''}
### Technical Details
\`\`\`
${error.details.technicalMessage || error.message}
\`\`\`

### Stack Trace
\`\`\`
${error.stack || 'Not available'}
\`\`\`

### Environment
- VS Code Version: ${vscode.version}
- Extension Version: [Please provide]
- OS: ${process.platform} ${process.arch}
- Node.js: ${process.version}

### Steps to Reproduce
1. [Please provide steps to reproduce the error]

### Expected Behavior
[Please describe what you expected to happen]

### Additional Context
[Please provide any additional context about the error]
`;
  }

  /**
   * Get or create output channel
   */
  private getOutputChannel(): vscode.OutputChannel {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('EVTX Viewer Errors');
    }
    return this.outputChannel;
  }

  /**
   * Generate correlation ID for tracking related errors
   */
  private generateCorrelationId(): string {
    return `evtx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Listen for error events
   */
  public onError(listener: (error: EVTXError) => void): vscode.Disposable {
    this.emitter.on('error', listener);
    return new vscode.Disposable(() => this.emitter.off('error', listener));
  }

  /**
   * Listen for recovery action events
   */
  public onRecoveryAction(listener: (action: string, error: EVTXError) => void): vscode.Disposable {
    this.emitter.on('recoveryAction', listener);
    return new vscode.Disposable(() => this.emitter.off('recoveryAction', listener));
  }

  /**
   * Listen for cache clear events
   */
  public onClearCache(listener: () => void): vscode.Disposable {
    this.emitter.on('clearCache', listener);
    return new vscode.Disposable(() => this.emitter.off('clearCache', listener));
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit: number = 10): readonly EVTXError[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Get error statistics
   */
  public getStatistics(): {
    totalErrors: number;
    errorsBySeverity: Record<ErrorSeverity, number>;
    errorsByCategory: Record<ErrorCategory, number>;
    recentErrorRate: number; // errors per minute in last 10 minutes
  } {
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const recentErrors = this.errorLog.filter(
      (error) => error.details.context.timestamp >= tenMinutesAgo
    );

    const errorsBySeverity = Object.values(ErrorSeverity).reduce(
      (acc, severity) => {
        acc[severity] = this.errorLog.filter(
          (error) => error.details.context.severity === severity
        ).length;
        return acc;
      },
      {} as Record<ErrorSeverity, number>
    );

    const errorsByCategory = Object.values(ErrorCategory).reduce(
      (acc, category) => {
        acc[category] = this.errorLog.filter(
          (error) => error.details.context.category === category
        ).length;
        return acc;
      },
      {} as Record<ErrorCategory, number>
    );

    return {
      totalErrors: this.errorLog.length,
      errorsBySeverity,
      errorsByCategory,
      recentErrorRate: recentErrors.length / 10, // per minute
    };
  }

  /**
   * Clear error log
   */
  public clearLog(): void {
    this.errorLog.length = 0;
    this.getOutputChannel().clear();
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.emitter.removeAllListeners();
    if (this.outputChannel) {
      this.outputChannel.dispose();
    }
  }
}

// Utility functions for common error scenarios
export namespace ErrorUtils {
  /**
   * Handle file operation errors
   */
  export async function handleFileError(
    error: Error,
    filePath: string,
    operation: string
  ): Promise<void> {
    const errorService = ErrorService.getInstance();

    await errorService.handleError(error, {
      category: ErrorCategory.FILE_IO,
      operation,
      filePath,
      severity: ErrorSeverity.ERROR,
    });
  }

  /**
   * Handle parsing errors
   */
  export async function handleParsingError(
    error: Error,
    filePath: string,
    position?: number
  ): Promise<void> {
    const errorService = ErrorService.getInstance();

    let contextOptions: Partial<ErrorContext> = {
      category: ErrorCategory.PARSING,
      operation: 'Parse EVTX file',
      filePath,
      severity: ErrorSeverity.ERROR,
    };

    if (position !== undefined) {
      contextOptions = {
        ...contextOptions,
        metadata: { position },
      };
    }

    await errorService.handleError(error, contextOptions);
  }

  /**
   * Handle memory errors
   */
  export async function handleMemoryError(
    error: Error,
    operation: string,
    memoryUsage?: number
  ): Promise<void> {
    const errorService = ErrorService.getInstance();

    let contextOptions: Partial<ErrorContext> = {
      category: ErrorCategory.MEMORY,
      operation,
      severity: ErrorSeverity.WARNING,
    };

    if (memoryUsage !== undefined) {
      contextOptions = {
        ...contextOptions,
        metadata: { memoryUsage },
      };
    }

    await errorService.handleError(error, contextOptions);
  }

  /**
   * Handle validation errors
   */
  export async function handleValidationError(
    message: string,
    field?: string,
    value?: unknown
  ): Promise<void> {
    const errorService = ErrorService.getInstance();

    const error = errorService.createError(
      'VALIDATION_ERROR',
      message,
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.WARNING,
        metadata: { field, value },
      },
      {
        recoveryActions: [RecoveryAction.RETRY],
      }
    );

    await errorService.handleError(error);
  }

  /**
   * Handle security errors
   */
  export async function handleSecurityError(
    message: string,
    operation: string,
    filePath?: string
  ): Promise<void> {
    const errorService = ErrorService.getInstance();

    let contextOptions: Partial<ErrorContext> = {
      category: ErrorCategory.SECURITY,
      operation,
      severity: ErrorSeverity.CRITICAL,
    };

    if (filePath !== undefined) {
      contextOptions = {
        ...contextOptions,
        filePath,
      };
    }

    const error = errorService.createError('SECURITY_ERROR', message, contextOptions, {
      recoveryActions: [RecoveryAction.CHECK_PERMISSIONS, RecoveryAction.CONTACT_SUPPORT],
      reportable: true,
    });

    await errorService.handleError(error);
  }
}

// Global error service instance
export function getErrorService(): ErrorService {
  return ErrorService.getInstance();
}
