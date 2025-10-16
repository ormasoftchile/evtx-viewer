// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Filter Criteria Model
 *
 * Defines filtering options and criteria for EVTX events.
 * Part of Phase 3.3 Core Implementation - T018
 *
 * Constitutional Performance Requirements:
 * - Fast filter evaluation
 * - Memory-efficient filter storage
 * - Support for complex filter combinations
 */

import { EventLevel } from '../../parsers/models/event_record';

/**
 * Time range filter specification
 */
export interface TimeRangeFilter {
  /**
   * Start time (inclusive). If undefined, no lower bound.
   */
  start?: Date;

  /**
   * End time (inclusive). If undefined, no upper bound.
   */
  end?: Date;

  /**
   * Relative time shortcuts (e.g., "last24hours", "lastweek")
   */
  relative?: TimeRangeShortcut;
}

/**
 * Predefined time range shortcuts
 */
export enum TimeRangeShortcut {
  LAST_HOUR = 'lasthour',
  LAST_24_HOURS = 'last24hours',
  LAST_7_DAYS = 'last7days',
  LAST_30_DAYS = 'last30days',
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  THIS_WEEK = 'thisweek',
  THIS_MONTH = 'thismonth',
  CUSTOM = 'custom',
}

/**
 * Text search options
 */
export interface TextSearchFilter {
  /**
   * Search query text
   */
  query: string;

  /**
   * Use regular expression matching
   */
  isRegex?: boolean;

  /**
   * Case-sensitive search
   */
  caseSensitive?: boolean;

  /**
   * Search whole words only
   */
  wholeWords?: boolean;

  /**
   * Fields to search in
   */
  searchFields?: SearchField[];
}

/**
 * Fields that can be searched
 */
export enum SearchField {
  MESSAGE = 'message',
  XML = 'xml',
  EVENT_DATA = 'eventData',
  USER_DATA = 'userData',
  PROVIDER = 'provider',
  CHANNEL = 'channel',
  COMPUTER = 'computer',
  ALL = 'all',
}

/**
 * Numeric range filter
 */
export interface NumericRangeFilter {
  /**
   * Minimum value (inclusive)
   */
  min?: number;

  /**
   * Maximum value (inclusive)
   */
  max?: number;
}

/**
 * Custom field filter with path and value
 */
export interface CustomFieldFilter {
  /**
   * Dot-notation path to field (e.g., "eventData.ProcessName")
   */
  fieldPath: string;

  /**
   * Expected value (or array of values for OR logic)
   */
  value: any;

  /**
   * Comparison operator
   */
  operator?: FilterOperator;
}

/**
 * Filter comparison operators
 */
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  IN = 'in',
  NOT_IN = 'not_in',
}

/**
 * Filter combination logic
 */
export enum FilterLogic {
  AND = 'and',
  OR = 'or',
}

/**
 * Main filter criteria interface
 */
export interface FilterCriteria {
  /**
   * Filter name for display/saving
   */
  name?: string;

  /**
   * Filter description
   */
  description?: string;

  /**
   * Event ID filters (OR logic within array)
   */
  eventIds?: number[];

  /**
   * Event level filters (OR logic within array)
   */
  levels?: EventLevel[];

  /**
   * Provider name filters (OR logic within array, supports partial matches)
   */
  providers?: string[];

  /**
   * Channel name filters (OR logic within array, supports partial matches)
   */
  channels?: string[];

  /**
   * Computer name filters (OR logic within array, supports partial matches)
   */
  computers?: string[];

  /**
   * User ID filters (OR logic within array)
   */
  userIds?: string[];

  /**
   * Time range filter
   */
  timeRange?: TimeRangeFilter;

  /**
   * Text search filter
   */
  textSearch?: TextSearchFilter;

  /**
   * Process ID filter
   */
  processIds?: number[];

  /**
   * Thread ID filter
   */
  threadIds?: number[];

  /**
   * Task ID filter
   */
  taskIds?: number[];

  /**
   * Opcode filter
   */
  opcodes?: number[];

  /**
   * Keywords bitmask filter
   */
  keywords?: bigint[];

  /**
   * Version filter
   */
  versions?: number[];

  /**
   * Custom field filters
   */
  customFilters?: CustomFieldFilter[];

  /**
   * Logic for combining multiple filter criteria
   */
  logic?: FilterLogic;

  /**
   * Exclude/invert the filter results
   */
  exclude?: boolean;

  /**
   * Filter is enabled/active
   */
  enabled?: boolean;
}

/**
 * Filter criteria builder class for easier construction
 */
export class FilterCriteriaBuilder {
  private criteria: FilterCriteria = {};

  /**
   * Set filter name
   */
  public name(name: string): FilterCriteriaBuilder {
    this.criteria.name = name;
    return this;
  }

  /**
   * Set filter description
   */
  public description(description: string): FilterCriteriaBuilder {
    this.criteria.description = description;
    return this;
  }

  /**
   * Add event ID filter
   */
  public eventIds(eventIds: number[]): FilterCriteriaBuilder {
    this.criteria.eventIds = eventIds;
    return this;
  }

  /**
   * Add single event ID
   */
  public eventId(eventId: number): FilterCriteriaBuilder {
    this.criteria.eventIds = this.criteria.eventIds || [];
    this.criteria.eventIds.push(eventId);
    return this;
  }

  /**
   * Add level filter
   */
  public levels(levels: EventLevel[]): FilterCriteriaBuilder {
    this.criteria.levels = levels;
    return this;
  }

  /**
   * Add single level
   */
  public level(level: EventLevel): FilterCriteriaBuilder {
    this.criteria.levels = this.criteria.levels || [];
    this.criteria.levels.push(level);
    return this;
  }

  /**
   * Add provider filter
   */
  public providers(providers: string[]): FilterCriteriaBuilder {
    this.criteria.providers = providers;
    return this;
  }

  /**
   * Add single provider
   */
  public provider(provider: string): FilterCriteriaBuilder {
    this.criteria.providers = this.criteria.providers || [];
    this.criteria.providers.push(provider);
    return this;
  }

  /**
   * Add channel filter
   */
  public channels(channels: string[]): FilterCriteriaBuilder {
    this.criteria.channels = channels;
    return this;
  }

  /**
   * Add single channel
   */
  public channel(channel: string): FilterCriteriaBuilder {
    this.criteria.channels = this.criteria.channels || [];
    this.criteria.channels.push(channel);
    return this;
  }

  /**
   * Add time range filter
   */
  public timeRange(start?: Date, end?: Date): FilterCriteriaBuilder {
    this.criteria.timeRange = {};
    if (start !== undefined) {
      this.criteria.timeRange.start = start;
    }
    if (end !== undefined) {
      this.criteria.timeRange.end = end;
    }
    return this;
  }

  /**
   * Add relative time range
   */
  public relativeTimeRange(shortcut: TimeRangeShortcut): FilterCriteriaBuilder {
    this.criteria.timeRange = { relative: shortcut };
    return this;
  }

  /**
   * Add text search filter
   */
  public textSearch(query: string, options?: Partial<TextSearchFilter>): FilterCriteriaBuilder {
    this.criteria.textSearch = { query, ...options };
    return this;
  }

  /**
   * Add custom field filter
   */
  public customField(
    fieldPath: string,
    value: any,
    operator?: FilterOperator
  ): FilterCriteriaBuilder {
    this.criteria.customFilters = this.criteria.customFilters || [];
    const filter: CustomFieldFilter = { fieldPath, value };
    if (operator !== undefined) {
      filter.operator = operator;
    }
    this.criteria.customFilters.push(filter);
    return this;
  }

  /**
   * Set filter logic
   */
  public withLogic(logic: FilterLogic): FilterCriteriaBuilder {
    this.criteria.logic = logic;
    return this;
  }

  /**
   * Set filter as excluded/inverted
   */
  public exclude(exclude: boolean = true): FilterCriteriaBuilder {
    this.criteria.exclude = exclude;
    return this;
  }

  /**
   * Set filter enabled state
   */
  public enabled(enabled: boolean = true): FilterCriteriaBuilder {
    this.criteria.enabled = enabled;
    return this;
  }

  /**
   * Build the filter criteria
   */
  public build(): FilterCriteria {
    return { ...this.criteria };
  }

  /**
   * Reset builder to start fresh
   */
  public reset(): FilterCriteriaBuilder {
    this.criteria = {};
    return this;
  }
}

/**
 * Utility class for working with filter criteria
 */
export class FilterUtils {
  /**
   * Create a time range from shortcut
   */
  public static createTimeRangeFromShortcut(shortcut: TimeRangeShortcut): TimeRangeFilter {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (shortcut) {
      case TimeRangeShortcut.LAST_HOUR:
        return {
          start: new Date(now.getTime() - 60 * 60 * 1000),
          end: now,
          relative: shortcut,
        };

      case TimeRangeShortcut.LAST_24_HOURS:
        return {
          start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          end: now,
          relative: shortcut,
        };

      case TimeRangeShortcut.LAST_7_DAYS:
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now,
          relative: shortcut,
        };

      case TimeRangeShortcut.LAST_30_DAYS:
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now,
          relative: shortcut,
        };

      case TimeRangeShortcut.TODAY:
        return {
          start: today,
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
          relative: shortcut,
        };

      case TimeRangeShortcut.YESTERDAY: {
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: yesterday,
          end: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1),
          relative: shortcut,
        };
      }

      case TimeRangeShortcut.THIS_WEEK: {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          start: startOfWeek,
          end: now,
          relative: shortcut,
        };
      }

      case TimeRangeShortcut.THIS_MONTH: {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: startOfMonth,
          end: now,
          relative: shortcut,
        };
      }

      default:
        return { relative: shortcut };
    }
  }

  /**
   * Check if filter criteria is empty
   */
  public static isEmpty(criteria: FilterCriteria): boolean {
    return (
      !criteria.eventIds?.length &&
      !criteria.levels?.length &&
      !criteria.providers?.length &&
      !criteria.channels?.length &&
      !criteria.computers?.length &&
      !criteria.userIds?.length &&
      !criteria.timeRange &&
      !criteria.textSearch?.query &&
      !criteria.processIds?.length &&
      !criteria.threadIds?.length &&
      !criteria.taskIds?.length &&
      !criteria.opcodes?.length &&
      !criteria.keywords?.length &&
      !criteria.versions?.length &&
      !criteria.customFilters?.length
    );
  }

  /**
   * Serialize filter criteria to JSON
   */
  public static toJSON(criteria: FilterCriteria): string {
    const serializable = {
      ...criteria,
      keywords: criteria.keywords?.map((k) => k.toString()),
      timeRange: criteria.timeRange
        ? {
            ...criteria.timeRange,
            start: criteria.timeRange.start?.toISOString(),
            end: criteria.timeRange.end?.toISOString(),
          }
        : undefined,
    };

    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Deserialize filter criteria from JSON
   */
  public static fromJSON(json: string): FilterCriteria {
    const data = JSON.parse(json);

    return {
      ...data,
      keywords: data.keywords?.map((k: string) => BigInt(k)),
      timeRange: data.timeRange
        ? {
            ...data.timeRange,
            start: data.timeRange.start ? new Date(data.timeRange.start) : undefined,
            end: data.timeRange.end ? new Date(data.timeRange.end) : undefined,
          }
        : undefined,
    };
  }

  /**
   * Create a display summary of filter criteria
   */
  public static getSummary(criteria: FilterCriteria): string {
    const parts: string[] = [];

    if (criteria.eventIds?.length) {
      parts.push(`Event IDs: ${criteria.eventIds.join(', ')}`);
    }

    if (criteria.levels?.length) {
      const levelNames = criteria.levels.map((l) => {
        switch (l) {
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
            return `Level ${l}`;
        }
      });
      parts.push(`Levels: ${levelNames.join(', ')}`);
    }

    if (criteria.providers?.length) {
      parts.push(`Providers: ${criteria.providers.join(', ')}`);
    }

    if (criteria.channels?.length) {
      parts.push(`Channels: ${criteria.channels.join(', ')}`);
    }

    if (criteria.timeRange?.relative) {
      parts.push(`Time: ${criteria.timeRange.relative}`);
    } else if (criteria.timeRange) {
      const start = criteria.timeRange.start
        ? criteria.timeRange.start.toLocaleDateString()
        : 'beginning';
      const end = criteria.timeRange.end ? criteria.timeRange.end.toLocaleDateString() : 'now';
      parts.push(`Time: ${start} - ${end}`);
    }

    if (criteria.textSearch?.query) {
      parts.push(`Text: "${criteria.textSearch.query}"`);
    }

    if (criteria.customFilters?.length) {
      parts.push(`Custom filters: ${criteria.customFilters.length}`);
    }

    if (parts.length === 0) {
      return 'No filters';
    }

    let summary = parts.join(', ');

    if (criteria.logic === FilterLogic.OR) {
      summary = `(${summary} - OR logic)`;
    }

    if (criteria.exclude) {
      summary = `NOT (${summary})`;
    }

    return summary;
  }
}
