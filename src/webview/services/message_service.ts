// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/* eslint-env browser */

/**
 * Webview Message Handling Service
 * Manages communication between webview and extension host
 */

export interface WebviewMessage {
  command: string;
  [key: string]: any;
}

export interface LoadFilesMessage extends WebviewMessage {
  command: 'loadFiles';
  filePaths: string[];
}

export interface FilterEventsMessage extends WebviewMessage {
  command: 'filterEvents';
  filter: any;
}

export interface ExportEventsMessage extends WebviewMessage {
  command: 'exportEvents';
  format: string;
  outputPath?: string;
}

export interface LoadProgressMessage extends WebviewMessage {
  command: 'loadProgress';
  file: string;
  status: 'parsing' | 'complete' | 'error';
  progress?: number;
}

export interface ErrorMessage extends WebviewMessage {
  command: 'error';
  error: string;
  details?: any;
}

/**
 * Message service for webview communication
 * Constitutional requirement: <100ms UI response time
 */
export class MessageService {
  private static instance: MessageService;
  private messageHandlers = new Map<string, (message: WebviewMessage) => void>();
  private vscode: any;

  private constructor() {
    // Get VS Code API if available
    this.vscode = (window as any).acquireVsCodeApi?.();

    // Set up message listener
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  /**
   * Register a message handler for a specific command
   */
  public onMessage(command: string, handler: (message: WebviewMessage) => void): void {
    this.messageHandlers.set(command, handler);
  }

  /**
   * Remove a message handler
   */
  public offMessage(command: string): void {
    this.messageHandlers.delete(command);
  }

  /**
   * Send a message to the extension host
   */
  public postMessage(message: WebviewMessage): void {
    if (this.vscode) {
      this.vscode.postMessage(message);
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    const message = event.data as WebviewMessage;

    if (!message || !message.command) {
      return;
    }

    const handler = this.messageHandlers.get(message.command);
    if (handler) {
      try {
        handler(message);
      } catch (error) {
        this.sendError(
          `Error handling message: ${message.command}`,
          error instanceof Error ? { message: error.message, stack: error.stack } : error
        );
      }
    }
  }

  /**
   * Request files to be loaded
   */
  public requestLoadFiles(filePaths: string[]): void {
    this.postMessage({
      command: 'loadFiles',
      filePaths,
    });
  }

  /**
   * Request events to be filtered
   */
  public requestFilterEvents(filter: any): void {
    this.postMessage({
      command: 'filterEvents',
      filter,
    });
  }

  /**
   * Request events to be exported
   */
  public requestExportEvents(format: string, outputPath?: string): void {
    this.postMessage({
      command: 'exportEvents',
      format,
      outputPath,
    });
  }

  /**
   * Send ready signal to extension host
   */
  public sendReady(): void {
    this.postMessage({
      command: 'ready',
    });
  }

  /**
   * Send error message to extension host
   */
  public sendError(error: string, details?: any): void {
    this.postMessage({
      command: 'error',
      error,
      details,
    });
  }

  /**
   * Update webview state in extension host
   */
  public updateState(state: any): void {
    if (this.vscode) {
      this.vscode.setState(state);
    }
  }

  /**
   * Get saved webview state from extension host
   */
  public getState(): any {
    if (this.vscode) {
      return this.vscode.getState();
    }
    return null;
  }
}

export default MessageService;
