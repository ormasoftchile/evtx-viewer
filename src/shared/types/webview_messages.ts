// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Webview Message Protocol Types
 *
 * Defines the communication interface between VS Code extension host and webview.
 * This protocol ensures type-safe message passing and proper separation of concerns.
 */

import type { FilterCriteria } from '../models/filter_criteria';
import type { ExportRequest } from '../models/export_request';
import type { EventRecord } from '../../parsers/models/event_record';

// Base message structure
export interface BaseMessage {
  readonly id: string;
  readonly timestamp: number;
  readonly type: string;
}

// Messages from Extension Host to Webview
export namespace ExtensionToWebview {
  export interface BaseMessage {
    readonly id: string;
    readonly timestamp: number;
    readonly type: string;
  }

  // File operations
  export interface FileLoadedMessage extends BaseMessage {
    readonly type: 'file-loaded';
    readonly payload: {
      readonly filePath: string;
      readonly fileName: string;
      readonly fileSize: number;
      readonly totalEvents: number;
      readonly parseTime: number;
    };
  }

  export interface FileLoadErrorMessage extends BaseMessage {
    readonly type: 'file-load-error';
    readonly payload: {
      readonly filePath: string;
      readonly error: string;
      readonly details?: string;
    };
  }

  // Event data
  export interface EventsDataMessage extends BaseMessage {
    readonly type: 'events-data';
    readonly payload: {
      readonly events: readonly EventRecord[];
      readonly startIndex: number;
      readonly totalCount: number;
      readonly hasMore: boolean;
    };
  }

  export interface FilteredEventsMessage extends BaseMessage {
    readonly type: 'filtered-events';
    readonly payload: {
      readonly events: readonly EventRecord[];
      readonly totalFiltered: number;
      readonly totalEvents: number;
      readonly filterCriteria: FilterCriteria;
      readonly filterTime: number;
    };
  }

  // Progress updates
  export interface ProgressMessage extends BaseMessage {
    readonly type: 'progress';
    readonly payload: {
      readonly operation: 'parsing' | 'filtering' | 'exporting';
      readonly progress: number; // 0-100
      readonly message: string;
      readonly cancellable?: boolean;
    };
  }

  // Export operations
  export interface ExportCompleteMessage extends BaseMessage {
    readonly type: 'export-complete';
    readonly payload: {
      readonly exportPath: string;
      readonly exportedCount: number;
      readonly exportTime: number;
    };
  }

  export interface ExportErrorMessage extends BaseMessage {
    readonly type: 'export-error';
    readonly payload: {
      readonly error: string;
      readonly details?: string;
    };
  }

  // System state
  export interface MemoryStatusMessage extends BaseMessage {
    readonly type: 'memory-status';
    readonly payload: {
      readonly heapUsed: number;
      readonly heapTotal: number;
      readonly loadedFiles: number;
      readonly cacheSize: number;
    };
  }

  export interface ErrorMessage extends BaseMessage {
    readonly type: 'error';
    readonly payload: {
      readonly error: string;
      readonly code?: string;
      readonly details?: string;
      readonly recoverable: boolean;
    };
  }

  export type Message =
    | FileLoadedMessage
    | FileLoadErrorMessage
    | EventsDataMessage
    | FilteredEventsMessage
    | ProgressMessage
    | ExportCompleteMessage
    | ExportErrorMessage
    | MemoryStatusMessage
    | ErrorMessage;
}

// Messages from Webview to Extension Host
export namespace WebviewToExtension {
  export interface BaseMessage {
    readonly id: string;
    readonly timestamp: number;
    readonly type: string;
  }

  // File operations
  export interface OpenFileMessage extends BaseMessage {
    readonly type: 'open-file';
    readonly payload: {
      readonly filePath?: string; // Optional - triggers file picker if not provided
    };
  }

  export interface AddFileMessage extends BaseMessage {
    readonly type: 'add-file';
    readonly payload: {
      readonly filePath?: string; // Optional - triggers file picker if not provided
    };
  }

  export interface CloseFileMessage extends BaseMessage {
    readonly type: 'close-file';
    readonly payload: {
      readonly filePath: string;
    };
  }

  // Data requests
  export interface RequestEventsMessage extends BaseMessage {
    readonly type: 'request-events';
    readonly payload: {
      readonly startIndex: number;
      readonly count: number;
      readonly filePath?: string; // Optional - current file if not specified
    };
  }

  export interface ApplyFilterMessage extends BaseMessage {
    readonly type: 'apply-filter';
    readonly payload: {
      readonly filter: FilterCriteria;
      readonly filePath?: string; // Optional - current file if not specified
    };
  }

  export interface ClearFilterMessage extends BaseMessage {
    readonly type: 'clear-filter';
    readonly payload: {
      readonly filePath?: string; // Optional - current file if not specified
    };
  }

  // Export operations
  export interface ExportEventsMessage extends BaseMessage {
    readonly type: 'export-events';
    readonly payload: {
      readonly exportRequest: ExportRequest;
      readonly events?: readonly EventRecord[]; // Optional - current filtered events if not provided
    };
  }

  // UI state
  export interface UpdatePreferencesMessage extends BaseMessage {
    readonly type: 'update-preferences';
    readonly payload: {
      readonly preferences: {
        readonly itemsPerPage?: number;
        readonly dateFormat?: string;
        readonly theme?: 'light' | 'dark' | 'auto';
        readonly autoRefresh?: boolean;
      };
    };
  }

  // System operations
  export interface CancelOperationMessage extends BaseMessage {
    readonly type: 'cancel-operation';
    readonly payload: {
      readonly operationId: string;
    };
  }

  export interface RequestMemoryStatusMessage extends BaseMessage {
    readonly type: 'request-memory-status';
    readonly payload: Record<string, never>; // Empty payload
  }

  // Lifecycle
  export interface WebviewReadyMessage extends BaseMessage {
    readonly type: 'webview-ready';
    readonly payload: {
      readonly version: string;
      readonly capabilities: readonly string[];
    };
  }

  export interface WebviewDisposeMessage extends BaseMessage {
    readonly type: 'webview-dispose';
    readonly payload: Record<string, never>; // Empty payload
  }

  export type Message =
    | OpenFileMessage
    | AddFileMessage
    | CloseFileMessage
    | RequestEventsMessage
    | ApplyFilterMessage
    | ClearFilterMessage
    | ExportEventsMessage
    | UpdatePreferencesMessage
    | CancelOperationMessage
    | RequestMemoryStatusMessage
    | WebviewReadyMessage
    | WebviewDisposeMessage;
}

// Union of all possible messages
export type AllMessages = ExtensionToWebview.Message | WebviewToExtension.Message;

// Type guards for message discrimination
export namespace MessageTypeGuards {
  export function isExtensionMessage(message: AllMessages): message is ExtensionToWebview.Message {
    return [
      'file-loaded',
      'file-load-error',
      'events-data',
      'filtered-events',
      'progress',
      'export-complete',
      'export-error',
      'memory-status',
      'error',
    ].includes(message.type);
  }

  export function isWebviewMessage(message: AllMessages): message is WebviewToExtension.Message {
    return [
      'open-file',
      'add-file',
      'close-file',
      'request-events',
      'apply-filter',
      'clear-filter',
      'export-events',
      'update-preferences',
      'cancel-operation',
      'request-memory-status',
      'webview-ready',
      'webview-dispose',
    ].includes(message.type);
  }
}

// Message factory helpers
export namespace MessageFactory {
  export function createExtensionMessage<T extends ExtensionToWebview.Message>(
    type: T['type'],
    payload: T['payload']
  ): T {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      payload,
    } as T;
  }

  export function createWebviewMessage<T extends WebviewToExtension.Message>(
    type: T['type'],
    payload: T['payload']
  ): T {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      payload,
    } as T;
  }
}

// Message response correlation
export interface MessageResponse<T = any> {
  readonly requestId: string;
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly timestamp: number;
}

// WebView API wrapper interface
export interface WebviewAPI {
  // Send message to extension host
  postMessage(message: WebviewToExtension.Message): void;

  // Listen for messages from extension host
  onMessage(handler: (message: ExtensionToWebview.Message) => void): void;

  // Remove message listener
  removeMessageListener(handler: (message: ExtensionToWebview.Message) => void): void;

  // Get initial state (called when webview loads)
  getInitialState(): Promise<{
    files: readonly string[];
    preferences: any;
    capabilities: readonly string[];
  }>;
}

// Extension API interface for webview provider
export interface ExtensionWebviewAPI {
  // Send message to webview
  sendMessage(message: ExtensionToWebview.Message): Promise<boolean>;

  // Listen for messages from webview
  onMessage(handler: (message: WebviewToExtension.Message) => void): void;

  // Remove message listener
  removeMessageListener(handler: (message: WebviewToExtension.Message) => void): void;

  // Dispose resources
  dispose(): void;
}
