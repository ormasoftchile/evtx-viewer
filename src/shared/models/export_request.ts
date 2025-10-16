// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Export Request Model
 *
 * Defines export options and formats for EVTX events.
 * Part of Phase 3.3 Core Implementation - T019
 *
 * Constitutional Performance Requirements:
 * - Support for large dataset export
 * - Memory-efficient chunked export
 * - Progress tracking for long operations
 */

import { FilterCriteria } from './filter_criteria';

/**
 * Supported export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  TSV = 'tsv',
  EXCEL = 'excel',
}

/**
 * Export compression options
 */
export enum CompressionType {
  NONE = 'none',
  GZIP = 'gzip',
  ZIP = 'zip',
}

/**
 * Export scope options
 */
export enum ExportScope {
  ALL_EVENTS = 'all',
  FILTERED_EVENTS = 'filtered',
  SELECTED_EVENTS = 'selected',
  VISIBLE_EVENTS = 'visible',
}

/**
 * Field selection for export
 */
export interface ExportFieldSelection {
  /**
   * Include all available fields
   */
  includeAll?: boolean;

  /**
   * Specific fields to include (dot notation supported)
   */
  includeFields?: string[];

  /**
   * Fields to exclude (takes precedence over include)
   */
  excludeFields?: string[];

  /**
   * Custom field mappings (oldName -> newName)
   */
  fieldMappings?: { [oldName: string]: string };
}

/**
 * Export formatting options
 */
export interface ExportFormatOptions {
  /**
   * Pretty print JSON output
   */
  prettyPrint?: boolean;

  /**
   * Include CSV headers
   */
  includeHeaders?: boolean;

  /**
   * CSV/TSV delimiter override
   */
  delimiter?: string;

  /**
   * Quote character for CSV
   */
  quoteChar?: string;

  /**
   * Escape character for CSV
   */
  escapeChar?: string;

  /**
   * XML root element name
   */
  xmlRootElement?: string;

  /**
   * XML record element name
   */
  xmlRecordElement?: string;

  /**
   * Date format string
   */
  dateFormat?: string;

  /**
   * Number format locale
   */
  numberLocale?: string;

  /**
   * Include XML namespace declarations
   */
  includeXmlNamespaces?: boolean;
}

/**
 * Export chunking options for large datasets
 */
export interface ExportChunkOptions {
  /**
   * Enable chunked export
   */
  enabled?: boolean;

  /**
   * Records per chunk
   */
  recordsPerChunk?: number;

  /**
   * Maximum memory usage per chunk (bytes)
   */
  maxMemoryPerChunk?: number;

  /**
   * Chunk file naming pattern (for multi-file output)
   */
  chunkFilePattern?: string;
}

/**
 * Export progress callback interface
 */
export interface ExportProgress {
  /**
   * Total records to export
   */
  totalRecords: number;

  /**
   * Records processed so far
   */
  processedRecords: number;

  /**
   * Progress percentage (0-100)
   */
  percentage: number;

  /**
   * Current processing speed (records/second)
   */
  recordsPerSecond: number;

  /**
   * Estimated time remaining (milliseconds)
   */
  estimatedTimeRemaining: number;

  /**
   * Current operation description
   */
  currentOperation: string;

  /**
   * Export start time
   */
  startTime: Date;

  /**
   * Current chunk number (if chunked)
   */
  currentChunk?: number;

  /**
   * Total chunks (if chunked)
   */
  totalChunks?: number;
}

/**
 * Main export request interface
 */
export interface ExportRequest {
  /**
   * Export format
   */
  format: ExportFormat;

  /**
   * Output file path (directory for chunked exports)
   */
  outputPath: string;

  /**
   * Export scope
   */
  scope: ExportScope;

  /**
   * Filter criteria (used when scope is FILTERED_EVENTS)
   */
  filterCriteria?: FilterCriteria;

  /**
   * Specific event record IDs (used when scope is SELECTED_EVENTS)
   */
  selectedEventIds?: bigint[];

  /**
   * Field selection options
   */
  fieldSelection?: ExportFieldSelection;

  /**
   * Format-specific options
   */
  formatOptions?: ExportFormatOptions;

  /**
   * Chunking options for large exports
   */
  chunkOptions?: ExportChunkOptions;

  /**
   * Compression settings
   */
  compression?: CompressionType;

  /**
   * Maximum file size before splitting (bytes)
   */
  maxFileSize?: number;

  /**
   * Overwrite existing files
   */
  overwrite?: boolean;

  /**
   * Export metadata (creation time, source info, etc.)
   */
  includeMetadata?: boolean;

  /**
   * Custom metadata to include
   */
  customMetadata?: { [key: string]: any };

  /**
   * Progress callback function
   */
  onProgress?: (progress: ExportProgress) => void;

  /**
   * Cancellation token
   */
  cancellationToken?: AbortSignal;
}

/**
 * Export result information
 */
export interface ExportResult {
  /**
   * Export was successful
   */
  success: boolean;

  /**
   * Output file path(s)
   */
  outputFiles: string[];

  /**
   * Total records exported
   */
  recordsExported: number;

  /**
   * Total export time (milliseconds)
   */
  exportTime: number;

  /**
   * Export speed (records/second)
   */
  exportSpeed: number;

  /**
   * Total output size (bytes)
   */
  outputSize: number;

  /**
   * Compression ratio (if compressed)
   */
  compressionRatio?: number;

  /**
   * Error message (if not successful)
   */
  error?: string;

  /**
   * Warning messages
   */
  warnings?: string[];

  /**
   * Export statistics
   */
  statistics?: ExportStatistics;
}

/**
 * Detailed export statistics
 */
export interface ExportStatistics {
  /**
   * Records by level
   */
  recordsByLevel: { [level: number]: number };

  /**
   * Records by provider
   */
  recordsByProvider: { [provider: string]: number };

  /**
   * Records by channel
   */
  recordsByChannel: { [channel: string]: number };

  /**
   * Time range of exported records
   */
  timeRange: {
    earliest: Date;
    latest: Date;
  };

  /**
   * File processing statistics
   */
  fileStats?: {
    filesProcessed: number;
    totalFileSize: number;
  };

  /**
   * Memory usage statistics
   */
  memoryStats?: {
    peakMemoryUsage: number;
    averageMemoryUsage: number;
  };
}

/**
 * Export request builder for easier construction
 */
export class ExportRequestBuilder {
  private request: ExportRequest;

  constructor(format: ExportFormat, outputPath: string) {
    this.request = {
      format,
      outputPath,
      scope: ExportScope.ALL_EVENTS,
    };
  }

  /**
   * Set export scope
   */
  public scope(scope: ExportScope): ExportRequestBuilder {
    this.request.scope = scope;
    return this;
  }

  /**
   * Set filter criteria for filtered exports
   */
  public withFilter(criteria: FilterCriteria): ExportRequestBuilder {
    this.request.filterCriteria = criteria;
    this.request.scope = ExportScope.FILTERED_EVENTS;
    return this;
  }

  /**
   * Set specific event IDs for selected exports
   */
  public withSelectedEvents(eventIds: bigint[]): ExportRequestBuilder {
    this.request.selectedEventIds = eventIds;
    this.request.scope = ExportScope.SELECTED_EVENTS;
    return this;
  }

  /**
   * Configure field selection
   */
  public fields(selection: ExportFieldSelection): ExportRequestBuilder {
    this.request.fieldSelection = selection;
    return this;
  }

  /**
   * Include only specific fields
   */
  public includeFields(fields: string[]): ExportRequestBuilder {
    this.request.fieldSelection = this.request.fieldSelection || {};
    this.request.fieldSelection.includeFields = fields;
    return this;
  }

  /**
   * Exclude specific fields
   */
  public excludeFields(fields: string[]): ExportRequestBuilder {
    this.request.fieldSelection = this.request.fieldSelection || {};
    this.request.fieldSelection.excludeFields = fields;
    return this;
  }

  /**
   * Set format options
   */
  public formatOptions(options: ExportFormatOptions): ExportRequestBuilder {
    this.request.formatOptions = options;
    return this;
  }

  /**
   * Enable pretty printing (for JSON)
   */
  public prettyPrint(enabled: boolean = true): ExportRequestBuilder {
    this.request.formatOptions = this.request.formatOptions || {};
    this.request.formatOptions.prettyPrint = enabled;
    return this;
  }

  /**
   * Include headers (for CSV)
   */
  public includeHeaders(enabled: boolean = true): ExportRequestBuilder {
    this.request.formatOptions = this.request.formatOptions || {};
    this.request.formatOptions.includeHeaders = enabled;
    return this;
  }

  /**
   * Set date format
   */
  public dateFormat(format: string): ExportRequestBuilder {
    this.request.formatOptions = this.request.formatOptions || {};
    this.request.formatOptions.dateFormat = format;
    return this;
  }

  /**
   * Configure chunked export
   */
  public chunked(recordsPerChunk: number): ExportRequestBuilder {
    this.request.chunkOptions = {
      enabled: true,
      recordsPerChunk,
    };
    return this;
  }

  /**
   * Set compression
   */
  public compressed(compression: CompressionType): ExportRequestBuilder {
    this.request.compression = compression;
    return this;
  }

  /**
   * Set maximum file size
   */
  public maxFileSize(sizeInBytes: number): ExportRequestBuilder {
    this.request.maxFileSize = sizeInBytes;
    return this;
  }

  /**
   * Allow overwriting existing files
   */
  public overwrite(allow: boolean = true): ExportRequestBuilder {
    this.request.overwrite = allow;
    return this;
  }

  /**
   * Include metadata in export
   */
  public includeMetadata(
    enabled: boolean = true,
    customMetadata?: { [key: string]: any }
  ): ExportRequestBuilder {
    this.request.includeMetadata = enabled;
    if (customMetadata) {
      this.request.customMetadata = customMetadata;
    }
    return this;
  }

  /**
   * Set progress callback
   */
  public onProgress(callback: (progress: ExportProgress) => void): ExportRequestBuilder {
    this.request.onProgress = callback;
    return this;
  }

  /**
   * Set cancellation token
   */
  public cancellable(token: AbortSignal): ExportRequestBuilder {
    this.request.cancellationToken = token;
    return this;
  }

  /**
   * Build the export request
   */
  public build(): ExportRequest {
    return { ...this.request };
  }
}

/**
 * Utility functions for export requests
 */
export class ExportUtils {
  /**
   * Get file extension for export format
   */
  public static getFileExtension(format: ExportFormat, compression?: CompressionType): string {
    let ext = '';

    switch (format) {
      case ExportFormat.JSON:
        ext = '.json';
        break;
      case ExportFormat.CSV:
        ext = '.csv';
        break;
      case ExportFormat.XML:
        ext = '.xml';
        break;
      case ExportFormat.TSV:
        ext = '.tsv';
        break;
      case ExportFormat.EXCEL:
        ext = '.xlsx';
        break;
    }

    if (compression === CompressionType.GZIP) {
      ext += '.gz';
    } else if (compression === CompressionType.ZIP) {
      ext += '.zip';
    }

    return ext;
  }

  /**
   * Get MIME type for export format
   */
  public static getMimeType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return 'application/json';
      case ExportFormat.CSV:
        return 'text/csv';
      case ExportFormat.XML:
        return 'application/xml';
      case ExportFormat.TSV:
        return 'text/tab-separated-values';
      case ExportFormat.EXCEL:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Validate export request
   */
  public static validate(request: ExportRequest): string[] {
    const errors: string[] = [];

    if (!request.outputPath) {
      errors.push('Output path is required');
    }

    if (request.scope === ExportScope.FILTERED_EVENTS && !request.filterCriteria) {
      errors.push('Filter criteria required for filtered export');
    }

    if (
      request.scope === ExportScope.SELECTED_EVENTS &&
      (!request.selectedEventIds || request.selectedEventIds.length === 0)
    ) {
      errors.push('Selected event IDs required for selected export');
    }

    if (
      request.chunkOptions?.enabled &&
      (!request.chunkOptions.recordsPerChunk || request.chunkOptions.recordsPerChunk <= 0)
    ) {
      errors.push('Records per chunk must be greater than 0 for chunked export');
    }

    if (request.maxFileSize && request.maxFileSize <= 0) {
      errors.push('Maximum file size must be greater than 0');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  public static estimateSize(
    recordCount: number,
    format: ExportFormat,
    includeAllFields: boolean = true
  ): number {
    // Rough estimates based on typical event record sizes
    let bytesPerRecord = 0;

    switch (format) {
      case ExportFormat.JSON:
        bytesPerRecord = includeAllFields ? 2000 : 800;
        break;
      case ExportFormat.XML:
        bytesPerRecord = includeAllFields ? 3000 : 1200;
        break;
      case ExportFormat.CSV:
        bytesPerRecord = includeAllFields ? 1000 : 400;
        break;
      case ExportFormat.TSV:
        bytesPerRecord = includeAllFields ? 1000 : 400;
        break;
      case ExportFormat.EXCEL:
        bytesPerRecord = includeAllFields ? 1500 : 600;
        break;
    }

    return recordCount * bytesPerRecord;
  }

  /**
   * Create a default export request
   */
  public static createDefault(format: ExportFormat, outputPath: string): ExportRequest {
    return new ExportRequestBuilder(format, outputPath)
      .scope(ExportScope.ALL_EVENTS)
      .includeHeaders()
      .prettyPrint()
      .includeMetadata()
      .build();
  }

  /**
   * Create a performance-optimized export request for large datasets
   */
  public static createOptimizedForLargeDataset(
    format: ExportFormat,
    outputPath: string,
    recordCount: number
  ): ExportRequest {
    const builder = new ExportRequestBuilder(format, outputPath)
      .scope(ExportScope.ALL_EVENTS)
      .includeMetadata(false);

    // Use chunked export for large datasets (>10k records)
    if (recordCount > 10000) {
      builder.chunked(Math.min(50000, Math.max(5000, Math.floor(recordCount / 10))));
    }

    // Disable pretty printing for large JSON exports to save space
    if (format === ExportFormat.JSON && recordCount > 50000) {
      builder.prettyPrint(false);
    } else if (format === ExportFormat.JSON) {
      builder.prettyPrint(true);
    }

    // Always include headers for structured formats
    if (format === ExportFormat.CSV || format === ExportFormat.TSV) {
      builder.includeHeaders(true);
    }

    return builder.build();
  }
}
