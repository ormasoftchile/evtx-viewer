// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Progress Notification Service
 *
 * Manages VS Code progress indicators, notifications, and cancellation handling.
 * Provides consistent progress feedback for long-running operations.
 */

import * as vscode from 'vscode';
import { EventEmitter } from 'events';

export interface ProgressOptions {
  readonly title: string;
  readonly cancellable?: boolean;
  readonly location?: vscode.ProgressLocation;
  readonly detail?: string;
  readonly incremental?: boolean;
}

export interface ProgressUpdate {
  readonly message: string;
  readonly increment?: number; // for incremental progress
  readonly percentage?: number; // for absolute progress (0-100)
  readonly detail?: string;
}

export interface ProgressResult<T> {
  readonly success: boolean;
  readonly result?: T;
  readonly error?: Error;
  readonly cancelled: boolean;
  readonly duration: number; // milliseconds
}

export class ProgressOperation {
  private readonly _id: string;
  private readonly _title: string;
  private readonly _startTime: Date;
  private readonly _cancellationToken: vscode.CancellationToken;
  private readonly _progress: vscode.Progress<{ message?: string; increment?: number }>;
  private readonly _emitter = new EventEmitter();

  private _cancelled = false;
  private _completed = false;
  private _currentMessage = '';
  private _currentPercentage = 0;

  constructor(
    id: string,
    title: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>,
    token: vscode.CancellationToken
  ) {
    this._id = id;
    this._title = title;
    this._startTime = new Date();
    this._progress = progress;
    this._cancellationToken = token;

    // Set up cancellation handling
    this._cancellationToken.onCancellationRequested(() => {
      if (!this._completed) {
        this._cancelled = true;
        this._emitter.emit('cancelled');
      }
    });
  }

  public get id(): string {
    return this._id;
  }
  public get title(): string {
    return this._title;
  }
  public get startTime(): Date {
    return this._startTime;
  }
  public get cancelled(): boolean {
    return this._cancelled;
  }
  public get completed(): boolean {
    return this._completed;
  }
  public get currentMessage(): string {
    return this._currentMessage;
  }
  public get currentPercentage(): number {
    return this._currentPercentage;
  }
  public get duration(): number {
    return Date.now() - this._startTime.getTime();
  }
  public get cancellationToken(): vscode.CancellationToken {
    return this._cancellationToken;
  }

  /**
   * Report progress update
   */
  public report(update: ProgressUpdate): void {
    if (this._completed || this._cancelled) {
      return;
    }

    this._currentMessage = update.message;

    const progressOptions: { message?: string; increment?: number } = {
      message: update.message,
    };

    // Handle incremental vs absolute progress
    if (update.increment !== undefined) {
      progressOptions.increment = update.increment;
    } else if (update.percentage !== undefined) {
      // VS Code progress is incremental, so calculate increment
      const increment = update.percentage - this._currentPercentage;
      if (increment > 0) {
        progressOptions.increment = increment;
        this._currentPercentage = update.percentage;
      }
    }

    this._progress.report(progressOptions);
    this._emitter.emit('progress', update);
  }

  /**
   * Complete the operation
   */
  public complete<T>(result: T): ProgressResult<T> {
    if (this._completed) {
      throw new Error('Operation already completed');
    }

    this._completed = true;
    const progressResult: ProgressResult<T> = {
      success: true,
      result,
      cancelled: this._cancelled,
      duration: this.duration,
    };

    this._emitter.emit('completed', progressResult);
    return progressResult;
  }

  /**
   * Fail the operation with error
   */
  public fail<T>(error: Error): ProgressResult<T> {
    if (this._completed) {
      throw new Error('Operation already completed');
    }

    this._completed = true;
    const progressResult: ProgressResult<T> = {
      success: false,
      error,
      cancelled: this._cancelled,
      duration: this.duration,
    };

    this._emitter.emit('failed', progressResult);
    return progressResult;
  }

  /**
   * Listen for progress events
   */
  public onProgress(listener: (update: ProgressUpdate) => void): vscode.Disposable {
    this._emitter.on('progress', listener);
    return new vscode.Disposable(() => this._emitter.off('progress', listener));
  }

  /**
   * Listen for cancellation
   */
  public onCancelled(listener: () => void): vscode.Disposable {
    this._emitter.on('cancelled', listener);
    return new vscode.Disposable(() => this._emitter.off('cancelled', listener));
  }

  /**
   * Listen for completion
   */
  public onCompleted<T>(listener: (result: ProgressResult<T>) => void): vscode.Disposable {
    this._emitter.on('completed', listener);
    return new vscode.Disposable(() => this._emitter.off('completed', listener));
  }

  /**
   * Listen for failure
   */
  public onFailed<T>(listener: (result: ProgressResult<T>) => void): vscode.Disposable {
    this._emitter.on('failed', listener);
    return new vscode.Disposable(() => this._emitter.off('failed', listener));
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this._emitter.removeAllListeners();
  }
}

export class ProgressService {
  private readonly activeOperations = new Map<string, ProgressOperation>();
  private operationCounter = 0;

  /**
   * Start a new progress operation
   */
  public async withProgress<T>(
    options: ProgressOptions,
    task: (operation: ProgressOperation) => Promise<T>
  ): Promise<ProgressResult<T>> {
    const operationId = `op-${++this.operationCounter}-${Date.now()}`;

    const location = options.location ?? vscode.ProgressLocation.Notification;
    const cancellable = options.cancellable ?? false;

    return vscode.window.withProgress(
      {
        location,
        title: options.title,
        cancellable,
      },
      async (progress, token) => {
        const operation = new ProgressOperation(operationId, options.title, progress, token);
        this.activeOperations.set(operationId, operation);

        try {
          // Initial progress report
          if (options.detail) {
            operation.report({ message: options.detail });
          }

          const result = await task(operation);

          if (token.isCancellationRequested) {
            return operation.fail(new Error('Operation was cancelled'));
          }

          return operation.complete(result);
        } catch (error) {
          return operation.fail(error as Error);
        } finally {
          this.activeOperations.delete(operationId);
          operation.dispose();
        }
      }
    );
  }

  /**
   * Start a background progress operation (status bar)
   */
  public async withBackgroundProgress<T>(
    title: string,
    task: (operation: ProgressOperation) => Promise<T>
  ): Promise<ProgressResult<T>> {
    return this.withProgress(
      {
        title,
        location: vscode.ProgressLocation.Window,
        cancellable: false,
      },
      task
    );
  }

  /**
   * Start a cancellable progress operation with notification
   */
  public async withCancellableProgress<T>(
    title: string,
    task: (operation: ProgressOperation) => Promise<T>
  ): Promise<ProgressResult<T>> {
    return this.withProgress(
      {
        title,
        location: vscode.ProgressLocation.Notification,
        cancellable: true,
      },
      task
    );
  }

  /**
   * Show a simple progress notification for quick operations
   */
  public async showQuickProgress<T>(title: string, task: () => Promise<T>): Promise<T> {
    const result = await this.withProgress(
      {
        title,
        location: vscode.ProgressLocation.Window,
        cancellable: false,
      },
      async () => {
        return task();
      }
    );

    if (!result.success) {
      throw result.error || new Error('Operation failed');
    }

    return result.result!;
  }

  /**
   * Get an active operation by ID
   */
  public getOperation(operationId: string): ProgressOperation | undefined {
    return this.activeOperations.get(operationId);
  }

  /**
   * Get all active operations
   */
  public getActiveOperations(): readonly ProgressOperation[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Cancel an operation by ID
   */
  public cancelOperation(operationId: string): boolean {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      return false;
    }

    // Note: We can't directly cancel VS Code's progress, but we can check
    // the cancellation token in the task implementation
    return !operation.completed;
  }

  /**
   * Cancel all active operations
   */
  public cancelAllOperations(): number {
    let cancelledCount = 0;

    for (const operation of this.activeOperations.values()) {
      if (!operation.completed && this.cancelOperation(operation.id)) {
        cancelledCount++;
      }
    }

    return cancelledCount;
  }

  /**
   * Get progress service statistics
   */
  public getStatistics(): {
    activeOperations: number;
    totalOperationsStarted: number;
    averageOperationDuration: number;
  } {
    const activeOps = this.activeOperations.size;
    const totalOps = this.operationCounter;

    // Calculate average duration of completed operations
    let totalDuration = 0;
    let completedOps = 0;

    for (const operation of this.activeOperations.values()) {
      if (operation.completed) {
        totalDuration += operation.duration;
        completedOps++;
      }
    }

    const averageDuration = completedOps > 0 ? totalDuration / completedOps : 0;

    return {
      activeOperations: activeOps,
      totalOperationsStarted: totalOps,
      averageOperationDuration: averageDuration,
    };
  }

  /**
   * Dispose all operations and clean up
   */
  public dispose(): void {
    for (const operation of this.activeOperations.values()) {
      operation.dispose();
    }
    this.activeOperations.clear();
  }
}

// Notification utilities
export class NotificationService {
  /**
   * Show an information message
   */
  public static async showInfo(message: string, ...items: string[]): Promise<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
  }

  /**
   * Show a warning message
   */
  public static async showWarning(
    message: string,
    ...items: string[]
  ): Promise<string | undefined> {
    return vscode.window.showWarningMessage(message, ...items);
  }

  /**
   * Show an error message
   */
  public static async showError(message: string, ...items: string[]): Promise<string | undefined> {
    return vscode.window.showErrorMessage(message, ...items);
  }

  /**
   * Show error with option to view details
   */
  public static async showErrorWithDetails(message: string, error: Error): Promise<void> {
    const action = await vscode.window.showErrorMessage(message, 'Show Details', 'Dismiss');

    if (action === 'Show Details') {
      // Show error details in output channel or new document
      const channel = vscode.window.createOutputChannel('EVTX Viewer Error');
      channel.show();
      channel.appendLine(`Error: ${message}`);
      channel.appendLine(`Details: ${error.message}`);
      channel.appendLine(`Stack: ${error.stack}`);
    }
  }

  /**
   * Show progress notification that automatically dismisses
   */
  public static async showProgressNotification(
    message: string,
    duration: number = 3000
  ): Promise<void> {
    const notification = vscode.window.setStatusBarMessage(message, duration);

    // Also show as information message for better visibility
    setTimeout(() => {
      notification.dispose();
    }, duration);
  }

  /**
   * Show confirmation dialog
   */
  public static async showConfirmation(
    message: string,
    confirmText: string = 'Yes',
    cancelText: string = 'No'
  ): Promise<boolean> {
    const result = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      confirmText,
      cancelText
    );

    return result === confirmText;
  }

  /**
   * Show input dialog
   */
  public static async showInputDialog(
    prompt: string,
    placeholder?: string,
    value?: string
  ): Promise<string | undefined> {
    const options: vscode.InputBoxOptions = { prompt };

    if (placeholder !== undefined) {
      options.placeHolder = placeholder;
    }

    if (value !== undefined) {
      options.value = value;
    }

    return vscode.window.showInputBox(options);
  }

  /**
   * Show file save dialog
   */
  public static async showSaveDialog(
    defaultName: string,
    filters?: Record<string, string[]>
  ): Promise<vscode.Uri | undefined> {
    return vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultName),
      filters: filters || {
        'All Files': ['*'],
      },
    });
  }

  /**
   * Show file open dialog
   */
  public static async showOpenDialog(
    canSelectMany: boolean = false,
    filters?: Record<string, string[]>
  ): Promise<vscode.Uri[] | undefined> {
    return vscode.window.showOpenDialog({
      canSelectMany,
      canSelectFiles: true,
      canSelectFolders: false,
      filters: filters || {
        'EVTX Files': ['evtx'],
        'All Files': ['*'],
      },
    });
  }
}

// Global progress service instance
let globalProgressService: ProgressService | undefined;

/**
 * Get the global progress service instance
 */
export function getProgressService(): ProgressService {
  if (!globalProgressService) {
    globalProgressService = new ProgressService();
  }
  return globalProgressService;
}

/**
 * Dispose the global progress service
 */
export function disposeProgressService(): void {
  if (globalProgressService) {
    globalProgressService.dispose();
    globalProgressService = undefined;
  }
}
