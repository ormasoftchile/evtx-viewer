// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Event Record Model
 *
 * Comprehensive data model for Windows Event Log records with constitutional
 * compliance for memory efficiency, accessibility, and performance optimization.
 * Provides structured representation of event data with comprehensive metadata.
 *
 * @fileoverview Event record model with constitutional performance guarantees
 * @version 1.0.0
 * @author EVTX Viewer Team
 *
 * @constitutional
 * - Memory: Efficient data representation within 512MB limits
 * - Performance: Fast construction, filtering, and serialization
 * - Accessibility: Structured data with proper labeling for screen readers
 * - Security: Data validation and sanitization support
 *
 * Constitutional Performance Requirements:
 * - Fast construction and filtering
 * - Memory-efficient representation
 * - Support for large event data payloads
 */

/**
 * Event Record Data Interface
 *
 * Defines the complete structure of a Windows Event Log record with all
 * metadata and payload information. Optimized for memory efficiency and
 * accessibility compliance.
 *
 * @interface EventRecordData
 *
 * @constitutional
 * - Provides structured data access for accessibility
 * - Implements memory-efficient field organization
 * - Supports comprehensive event filtering and search
 */
export interface EventRecordData {
  /**
   * Unique event record identifier
   *
   * @constitutional Primary key for efficient event lookup and deduplication
   */
  eventRecordId: bigint;

  /**
   * Event ID number for categorization
   *
   * @constitutional Enables efficient event filtering and categorization
   */
  eventId: number;

  /**
   * Event version for compatibility tracking
   *
   * @constitutional Optional field for version-aware processing
   */
  version?: number;

  /**
   * Event level for severity classification
   *
   * Event severity levels:
   * - 1: Critical - System unusable
   * - 2: Error - Error conditions
   * - 3: Warning - Warning conditions
   * - 4: Information - Informational messages
   * - 5: Verbose - Debug-level messages
   *
   * @constitutional Enables accessible severity-based filtering and display
   */
  level: number;

  /**
   * Task identifier for event categorization
   *
   * @constitutional Optional field for task-based event organization
   */
  task?: number;

  /**
   * Task category name (friendly name for task ID)
   *
   * @constitutional Optional field for human-readable task categorization
   */
  taskName?: string;

  /**
   * Event opcode for operation classification
   *
   * @constitutional Enables operation-specific event filtering
   */
  opcode?: number;

  /**
   * Event opcode name (friendly name for opcode)
   *
   * @constitutional Optional field for human-readable opcode display
   */
  opcodeName?: string;

  /**
   * Event keywords bitmask for advanced categorization
   *
   * @constitutional Enables keyword-based filtering and event classification
   */
  keywords?: bigint;

  /**
   * Event keywords names (friendly names for keywords bitmask)
   *
   * @constitutional Optional field for human-readable keywords display
   */
  keywordsNames?: string[];

  /**
   * Event timestamp for chronological ordering
   *
   * @constitutional Required for time-based filtering and accessibility
   */
  timestamp: Date;

  /**
   * Event provider/source name for origin identification
   *
   * @constitutional Required for source-based filtering and accessibility labels
   */
  provider: string;

  /**
   * Event provider GUID for unique identification
   *
   * @constitutional Optional field for provider identification
   */
  providerGuid?: string;

  /**
   * Event channel/log name for log categorization
   *
   * @constitutional Required for channel-based organization and navigation
   */
  channel: string;

  /**
   * Computer name where event occurred
   *
   * @constitutional Required for multi-system event correlation
   */
  computer: string;

  /**
   * Security identifier of user associated with event
   *
   * @constitutional Optional field for security audit and user tracking
   */
  userId?: string;

  /**
   * Process ID that generated the event
   *
   * @constitutional Optional field for process-based event correlation
   */
  processId?: number;

  /**
   * Thread ID that generated the event
   */
  threadId?: number;

  /**
   * Event message/description
   */
  message?: string;

  /**
   * Raw XML data of the event
   */
  xml: string;

  /**
   * Parsed event data as key-value pairs
   */
  eventData?: { [key: string]: any };

  /**
   * User data associated with event
   */
  userData?: { [key: string]: any };

  /**
   * Event correlation activity ID
   */
  activityId?: string;

  /**
   * Related activity ID
   */
  relatedActivityId?: string;
}

export interface FilterCriteria {
  /**
   * Filter by event IDs (array means OR)
   */
  eventIds?: number[];

  /**
   * Filter by event levels (array means OR)
   */
  levels?: number[];

  /**
   * Filter by provider names (array means OR)
   */
  providers?: string[];

  /**
   * Filter by channels (array means OR)
   */
  channels?: string[];

  /**
   * Filter by computer names (array means OR)
   */
  computers?: string[];

  /**
   * Filter by time range
   */
  timeRange?: {
    start?: Date;
    end?: Date;
  };

  /**
   * Text search in message/event data
   */
  textSearch?: string;

  /**
   * Use regex for text search
   */
  textSearchRegex?: boolean;

  /**
   * Filter by process ID
   */
  processId?: number;

  /**
   * Filter by thread ID
   */
  threadId?: number;

  /**
   * Filter by user ID
   */
  userId?: string;

  /**
   * Custom field filters
   */
  customFilters?: { [fieldPath: string]: any };
}

/**
 * Event Level enumeration for better type safety
 */
export enum EventLevel {
  CRITICAL = 1,
  ERROR = 2,
  WARNING = 3,
  INFORMATION = 4,
  VERBOSE = 5,
}

/**
 * Event Record model class
 */
export class EventRecord {
  private _data: EventRecordData;

  constructor(data: EventRecordData) {
    // Validate required fields
    if (!data.eventRecordId) {
      throw new Error('Event record ID is required');
    }
    if (!data.eventId && data.eventId !== 0) {
      throw new Error('Event ID is required');
    }
    if (!data.timestamp) {
      throw new Error('Timestamp is required');
    }
    if (!data.provider) {
      throw new Error('Provider is required');
    }
    if (!data.xml) {
      throw new Error('XML data is required');
    }

    this._data = { ...data };
  }

  // Getters for all properties
  public get eventRecordId(): bigint {
    return this._data.eventRecordId;
  }
  public get eventId(): number {
    return this._data.eventId;
  }
  public get version(): number | undefined {
    return this._data.version;
  }
  public get level(): number {
    return this._data.level;
  }
  public get task(): number | undefined {
    return this._data.task;
  }
  public get opcode(): number | undefined {
    return this._data.opcode;
  }
  public get keywords(): bigint | undefined {
    return this._data.keywords;
  }
  public get timestamp(): Date {
    return this._data.timestamp;
  }
  public get provider(): string {
    return this._data.provider;
  }
  public get providerGuid(): string | undefined {
    return this._data.providerGuid;
  }
  public get taskName(): string | undefined {
    return this._data.taskName;
  }
  public get opcodeName(): string | undefined {
    return this._data.opcodeName;
  }
  public get keywordsNames(): string[] | undefined {
    return this._data.keywordsNames;
  }
  public get channel(): string {
    return this._data.channel;
  }
  public get computer(): string {
    return this._data.computer;
  }
  public get userId(): string | undefined {
    return this._data.userId;
  }
  public get processId(): number | undefined {
    return this._data.processId;
  }
  public get threadId(): number | undefined {
    return this._data.threadId;
  }
  public get message(): string | undefined {
    return this._data.message;
  }
  public get xml(): string {
    return this._data.xml;
  }
  public get eventData(): { [key: string]: any } | undefined {
    return this._data.eventData;
  }
  public get userData(): { [key: string]: any } | undefined {
    return this._data.userData;
  }
  public get activityId(): string | undefined {
    return this._data.activityId;
  }
  public get relatedActivityId(): string | undefined {
    return this._data.relatedActivityId;
  }

  /**
   * Check if event is critical level
   */
  public isCritical(): boolean {
    return this._data.level === EventLevel.CRITICAL;
  }

  /**
   * Check if event is error level
   */
  public isError(): boolean {
    return this._data.level === EventLevel.ERROR;
  }

  /**
   * Check if event is warning level
   */
  public isWarning(): boolean {
    return this._data.level === EventLevel.WARNING;
  }

  /**
   * Check if event is information level
   */
  public isInformation(): boolean {
    return this._data.level === EventLevel.INFORMATION;
  }

  /**
   * Check if event is verbose level
   */
  public isVerbose(): boolean {
    return this._data.level === EventLevel.VERBOSE;
  }

  /**
   * Get human-readable level name
   */
  public getLevelName(): string {
    switch (this._data.level) {
      case EventLevel.CRITICAL:
        return 'Critical';
      case EventLevel.ERROR:
        return 'Error';
      case EventLevel.WARNING:
        return 'Warning';
      case EventLevel.INFORMATION:
        return 'Information';
      case EventLevel.VERBOSE:
        return 'Verbose';
      default:
        return `Level ${this._data.level}`;
    }
  }

  /**
   * Check if this event matches the given filter criteria
   */
  public matchesFilter(criteria: FilterCriteria): boolean {
    // Event ID filter
    if (criteria.eventIds && criteria.eventIds.length > 0) {
      if (!criteria.eventIds.includes(this._data.eventId)) {
        return false;
      }
    }

    // Level filter
    if (criteria.levels && criteria.levels.length > 0) {
      if (!criteria.levels.includes(this._data.level)) {
        return false;
      }
    }

    // Provider filter
    if (criteria.providers && criteria.providers.length > 0) {
      const matches = criteria.providers.some((provider) =>
        this._data.provider.toLowerCase().includes(provider.toLowerCase())
      );
      if (!matches) {
        return false;
      }
    }

    // Channel filter
    if (criteria.channels && criteria.channels.length > 0) {
      const matches = criteria.channels.some((channel) =>
        this._data.channel.toLowerCase().includes(channel.toLowerCase())
      );
      if (!matches) {
        return false;
      }
    }

    // Computer filter
    if (criteria.computers && criteria.computers.length > 0) {
      const matches = criteria.computers.some((computer) =>
        this._data.computer.toLowerCase().includes(computer.toLowerCase())
      );
      if (!matches) {
        return false;
      }
    }

    // Time range filter
    if (criteria.timeRange) {
      if (criteria.timeRange.start && this._data.timestamp < criteria.timeRange.start) {
        return false;
      }
      if (criteria.timeRange.end && this._data.timestamp > criteria.timeRange.end) {
        return false;
      }
    }

    // Text search filter
    if (criteria.textSearch) {
      const searchText = criteria.textSearch.toLowerCase();
      const searchTargets = [
        this._data.message || '',
        this._data.xml,
        JSON.stringify(this._data.eventData || {}),
        JSON.stringify(this._data.userData || {}),
      ]
        .join(' ')
        .toLowerCase();

      if (criteria.textSearchRegex) {
        try {
          const regex = new RegExp(criteria.textSearch, 'i');
          if (!regex.test(searchTargets)) {
            return false;
          }
        } catch (error) {
          // Invalid regex, fall back to string search
          if (!searchTargets.includes(searchText)) {
            return false;
          }
        }
      } else {
        if (!searchTargets.includes(searchText)) {
          return false;
        }
      }
    }

    // Process ID filter
    if (criteria.processId !== undefined && this._data.processId !== criteria.processId) {
      return false;
    }

    // Thread ID filter
    if (criteria.threadId !== undefined && this._data.threadId !== criteria.threadId) {
      return false;
    }

    // User ID filter
    if (criteria.userId && this._data.userId !== criteria.userId) {
      return false;
    }

    // Custom field filters
    if (criteria.customFilters) {
      for (const [fieldPath, value] of Object.entries(criteria.customFilters)) {
        const fieldValue = this.getFieldValue(fieldPath);
        if (fieldValue !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Get field value by dot-notation path (e.g., "eventData.ProcessName")
   */
  public getFieldValue(fieldPath: string): any {
    const parts = fieldPath.split('.');
    let current: any = this._data;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Format timestamp with custom format
   */
  public formatTimestamp(format?: string): string {
    const date = this._data.timestamp;

    if (!format) {
      // Default ISO format
      return date.toISOString();
    }

    // Simple format replacements (could be extended)
    const formatMap: { [key: string]: string } = {
      YYYY: date.getFullYear().toString(),
      MM: (date.getMonth() + 1).toString().padStart(2, '0'),
      DD: date.getDate().toString().padStart(2, '0'),
      HH: date.getHours().toString().padStart(2, '0'),
      mm: date.getMinutes().toString().padStart(2, '0'),
      ss: date.getSeconds().toString().padStart(2, '0'),
      SSS: date.getMilliseconds().toString().padStart(3, '0'),
    };

    let formatted = format;
    for (const [token, value] of Object.entries(formatMap)) {
      formatted = formatted.replace(new RegExp(token, 'g'), value);
    }

    return formatted;
  }

  /**
   * Serialize to JSON with BigInt handling
   */
  public toJSON(): object {
    return {
      ...this._data,
      eventRecordId: this._data.eventRecordId.toString(),
      keywords: this._data.keywords?.toString(),
      timestamp: this._data.timestamp.toISOString(),
    };
  }

  /**
   * Create EventRecord from JSON data
   */
  public static fromJSON(data: any): EventRecord {
    return new EventRecord({
      ...data,
      eventRecordId: BigInt(data.eventRecordId),
      keywords: data.keywords ? BigInt(data.keywords) : undefined,
      timestamp: new Date(data.timestamp),
    });
  }

  /**
   * Create minimal EventRecord for testing
   */
  public static createMinimal(eventId: number, timestamp: Date, provider: string): EventRecord {
    return new EventRecord({
      eventRecordId: BigInt(Math.floor(Math.random() * 1000000)),
      eventId,
      level: EventLevel.INFORMATION,
      timestamp,
      provider,
      channel: 'System',
      computer: 'localhost',
      xml: `<Event><System><EventID>${eventId}</EventID></System></Event>`,
    });
  }

  /**
   * Get a summary string for display
   */
  public getSummary(): string {
    const levelName = this.getLevelName();
    const timeStr = this.formatTimestamp('YYYY-MM-DD HH:mm:ss');
    const message = this._data.message || `Event ID ${this._data.eventId}`;

    return `[${timeStr}] ${levelName}: ${message} (${this._data.provider})`;
  }

  /**
   * Clone this event record
   */
  public clone(): EventRecord {
    return new EventRecord({ ...this._data });
  }
}
