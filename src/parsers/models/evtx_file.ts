// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * EVTX File Model
 *
 * Comprehensive data model for EVTX (Windows Event Log) files with constitutional
 * compliance for memory efficiency, accessibility, and performance optimization.
 * Provides structured representation of file metadata and parsing state.
 *
 * @fileoverview EVTX file model with constitutional performance guarantees
 * @version 1.0.0
 * @author EVTX Viewer Team
 *
 * @constitutional
 * - Memory: Efficient metadata representation within 512MB limits
 * - Performance: Support for files up to 2GB with fast metadata access
 * - Accessibility: Structured data with proper labeling for screen readers
 * - Security: File validation and integrity checking support
 *
 * Constitutional Performance Requirements:
 * - Support files up to 2GB
 * - Memory-efficient representation
 * - Fast file metadata access
 */

/**
 * EVTX File Header Interface
 *
 * Defines the binary structure of EVTX file headers with comprehensive
 * metadata for file validation and processing. Optimized for accessibility
 * and performance within constitutional constraints.
 *
 * @interface EvtxFileHeader
 *
 * @constitutional
 * - Provides structured metadata access for accessibility
 * - Enables efficient file validation and integrity checking
 * - Supports fast header parsing within performance limits
 */
export interface EvtxFileHeader {
  /**
   * EVTX file magic signature for format validation
   *
   * @constitutional Must be "ElfFile\0" for valid EVTX files
   */
  signature: string;

  /**
   * First chunk number in the file (typically 0)
   *
   * @constitutional Enables chunk-based sequential processing
   */
  firstChunkNumber: bigint;

  /**
   * Last chunk number for file boundary validation
   *
   * @constitutional Supports efficient file size calculation and validation
   */
  lastChunkNumber: bigint;

  /**
   * Next record identifier for sequential processing
   *
   * @constitutional Enables efficient record numbering and validation
   */
  nextRecordId: bigint;

  /**
   * File header size in bytes for parsing
   *
   * @constitutional Enables accurate header boundary detection
   */
  headerSize: number;

  /**
   * Minor version for compatibility tracking (typically 1)
   *
   * @constitutional Supports version-aware parsing and validation
   */
  minorVersion: number;

  /**
   * Major version for format compatibility (typically 3)
   *
   * @constitutional Enables version-specific parsing logic
   */
  majorVersion: number;

  /**
   * Header block size in bytes (typically 4096)
   *
   * @constitutional Defines header parsing boundaries for validation
   */
  headerBlockSize: number;

  /**
   * Number of chunks in file for processing planning
   *
   * @constitutional Enables progress tracking and memory planning
   */
  chunkCount: number;
}

/**
 * EVTX File Statistics Interface
 *
 * Comprehensive statistics for EVTX file analysis and accessibility.
 * Provides summary information for efficient file processing and user feedback.
 *
 * @interface EvtxFileStats
 *
 * @constitutional
 * - Enables progress tracking within constitutional response times
 * - Provides accessible summary information for screen readers
 * - Supports memory planning for large file processing
 */
export interface EvtxFileStats {
  /**
   * Total number of events in the file
   *
   * @constitutional Enables progress tracking and memory allocation planning
   */
  totalEvents: number;

  /**
   * File size in bytes for memory planning
   *
   * @constitutional Required for constitutional memory limit validation
   */
  fileSize: number;

  /**
   * Earliest event timestamp
   */
  earliestEvent?: Date;

  /**
   * Latest event timestamp
   */
  latestEvent?: Date;

  /**
   * Unique channels (event logs) in this file
   */
  channels: string[];

  /**
   * Unique event providers in this file
   */
  providers: string[];

  /**
   * Event level distribution
   */
  levelDistribution: Map<number, number>;
}

export interface EvtxParsingProgress {
  /**
   * Number of chunks processed
   */
  chunksProcessed: number;

  /**
   * Total chunks to process
   */
  totalChunks: number;

  /**
   * Number of events parsed
   */
  eventsParsed: number;

  /**
   * Estimated total events (may be updated as parsing progresses)
   */
  estimatedTotalEvents: number;

  /**
   * Parsing progress percentage (0-100)
   */
  progressPercentage: number;

  /**
   * Current parsing speed in events per second
   */
  eventsPerSecond: number;

  /**
   * Estimated time remaining in milliseconds
   */
  estimatedTimeRemaining: number;
}

export enum EvtxFileStatus {
  UNOPENED = 'unopened',
  OPENING = 'opening',
  PARSING_HEADER = 'parsing_header',
  PARSING_CHUNKS = 'parsing_chunks',
  READY = 'ready',
  ERROR = 'error',
  CLOSED = 'closed',
}

/**
 * Main EVTX File model class
 */
export class EvtxFile {
  private _filePath: string;
  private _fileName: string;
  private _status: EvtxFileStatus;
  private _header: EvtxFileHeader | null;
  private _stats: EvtxFileStats | null;
  private _progress: EvtxParsingProgress | null;
  private _error: Error | null;
  private _fileHandle: any; // Node.js file handle
  private _createdAt: Date;
  private _lastAccessed: Date;

  constructor(filePath: string) {
    this._filePath = filePath;
    this._fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
    this._status = EvtxFileStatus.UNOPENED;
    this._header = null;
    this._stats = null;
    this._progress = null;
    this._error = null;
    this._fileHandle = null;
    this._createdAt = new Date();
    this._lastAccessed = new Date();
  }

  // Getters
  public get filePath(): string {
    return this._filePath;
  }
  public get fileName(): string {
    return this._fileName;
  }
  public get status(): EvtxFileStatus {
    return this._status;
  }
  public get header(): EvtxFileHeader | null {
    return this._header;
  }
  public get stats(): EvtxFileStats | null {
    return this._stats;
  }
  public get progress(): EvtxParsingProgress | null {
    return this._progress;
  }
  public get error(): Error | null {
    return this._error;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get lastAccessed(): Date {
    return this._lastAccessed;
  }

  /**
   * Check if file is ready for reading events
   */
  public isReady(): boolean {
    return this._status === EvtxFileStatus.READY;
  }

  /**
   * Check if file is currently being processed
   */
  public isLoading(): boolean {
    return (
      this._status === EvtxFileStatus.OPENING ||
      this._status === EvtxFileStatus.PARSING_HEADER ||
      this._status === EvtxFileStatus.PARSING_CHUNKS
    );
  }

  /**
   * Check if file has an error
   */
  public hasError(): boolean {
    return this._status === EvtxFileStatus.ERROR || this._error !== null;
  }

  /**
   * Get display name for UI
   */
  public getDisplayName(): string {
    return this._fileName;
  }

  /**
   * Get size display string (e.g., "1.5 MB", "2.1 GB")
   */
  public getSizeDisplay(): string {
    if (!this._stats) return 'Unknown';

    const bytes = this._stats.fileSize;
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get total events count with fallback
   */
  public getTotalEvents(): number {
    return this._stats?.totalEvents || 0;
  }

  /**
   * Get parsing progress percentage
   */
  public getProgressPercentage(): number {
    return this._progress?.progressPercentage || 0;
  }

  /**
   * Update file status
   * @internal - Used by EVTX parser
   */
  public _updateStatus(status: EvtxFileStatus): void {
    this._status = status;
    this._lastAccessed = new Date();
  }

  /**
   * Set file header information
   * @internal - Used by EVTX parser
   */
  public _setHeader(header: EvtxFileHeader): void {
    this._header = header;
    this._lastAccessed = new Date();
  }

  /**
   * Update file statistics
   * @internal - Used by EVTX parser
   */
  public _updateStats(stats: Partial<EvtxFileStats>): void {
    if (!this._stats) {
      this._stats = {
        totalEvents: 0,
        fileSize: 0,
        channels: [],
        providers: [],
        levelDistribution: new Map(),
      };
    }

    Object.assign(this._stats, stats);
    this._lastAccessed = new Date();
  }

  /**
   * Update parsing progress
   * @internal - Used by EVTX parser
   */
  public _updateProgress(progress: Partial<EvtxParsingProgress>): void {
    if (!this._progress) {
      this._progress = {
        chunksProcessed: 0,
        totalChunks: 0,
        eventsParsed: 0,
        estimatedTotalEvents: 0,
        progressPercentage: 0,
        eventsPerSecond: 0,
        estimatedTimeRemaining: 0,
      };
    }

    Object.assign(this._progress, progress);

    // Recalculate percentage
    if (this._progress.totalChunks > 0) {
      this._progress.progressPercentage = Math.round(
        (this._progress.chunksProcessed / this._progress.totalChunks) * 100
      );
    }

    this._lastAccessed = new Date();
  }

  /**
   * Set error state
   * @internal - Used by EVTX parser
   */
  public _setError(error: Error): void {
    this._error = error;
    this._status = EvtxFileStatus.ERROR;
    this._lastAccessed = new Date();
  }

  /**
   * Set file handle for reading
   * @internal - Used by EVTX parser
   */
  public _setFileHandle(handle: any): void {
    this._fileHandle = handle;
  }

  /**
   * Get file handle
   * @internal - Used by EVTX parser
   */
  public _getFileHandle(): any {
    return this._fileHandle;
  }

  /**
   * Close file and release resources
   */
  public async close(): Promise<void> {
    if (this._fileHandle) {
      try {
        await this._fileHandle.close();
      } catch (error) {
        // Ignore close errors
      }
      this._fileHandle = null;
    }

    this._status = EvtxFileStatus.CLOSED;
  }

  /**
   * Serialize to JSON for storage/transmission
   */
  public toJSON(): object {
    return {
      filePath: this._filePath,
      fileName: this._fileName,
      status: this._status,
      header: this._header,
      stats: this._stats
        ? {
            ...this._stats,
            levelDistribution: Array.from(this._stats.levelDistribution.entries()),
          }
        : null,
      progress: this._progress,
      error: this._error
        ? {
            message: this._error.message,
            name: this._error.name,
            stack: this._error.stack,
          }
        : null,
      createdAt: this._createdAt.toISOString(),
      lastAccessed: this._lastAccessed.toISOString(),
    };
  }

  /**
   * Create from JSON data
   */
  public static fromJSON(data: any): EvtxFile {
    const file = new EvtxFile(data.filePath);
    file._fileName = data.fileName;
    file._status = data.status;
    file._header = data.header;
    file._progress = data.progress;
    file._createdAt = new Date(data.createdAt);
    file._lastAccessed = new Date(data.lastAccessed);

    if (data.stats) {
      file._stats = {
        ...data.stats,
        levelDistribution: new Map(data.stats.levelDistribution),
      };
    }

    if (data.error) {
      file._error = new Error(data.error.message);
      file._error.name = data.error.name;
      file._error.stack = data.error.stack;
    }

    return file;
  }
}
