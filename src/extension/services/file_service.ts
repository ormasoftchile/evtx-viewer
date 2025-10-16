// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * File System Access Service
 *
 * Handles file loading, caching, and memory management for EVTX files.
 * Provides progress tracking and efficient memory usage for large files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import type { EventRecord } from '../../parsers/models/event_record';
import type { EvtxFile } from '../../parsers/models/evtx_file';

export interface FileLoadOptions {
  readonly enableCache?: boolean;
  readonly maxMemoryUsage?: number; // bytes
  readonly progressCallback?: (progress: number, message: string) => void;
  readonly signal?: AbortSignal;
}

export interface FileInfo {
  readonly filePath: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly lastModified: Date;
  readonly isLoaded: boolean;
  readonly eventCount: number;
  readonly parseTime?: number;
}

export interface LoadedFile {
  readonly info: FileInfo;
  readonly evtxFile: EvtxFile;
  readonly events: readonly EventRecord[];
  readonly loadTime: Date;
  readonly memoryUsage: number;
}

export class FileLoadError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FileLoadError';
  }
}

export class FileService extends EventEmitter {
  private readonly loadedFiles = new Map<string, LoadedFile>();
  private readonly fileWatchers = new Map<string, fs.FSWatcher>();
  private readonly maxMemoryUsage: number;
  private currentMemoryUsage = 0;

  constructor(options?: { maxMemoryUsage?: number; autoWatch?: boolean }) {
    super();
    this.maxMemoryUsage = options?.maxMemoryUsage ?? 512 * 1024 * 1024; // 512MB default
  }

  /**
   * Load an EVTX file and parse its contents
   */
  public async loadFile(filePath: string, options: FileLoadOptions = {}): Promise<LoadedFile> {
    const absolutePath = path.resolve(filePath);

    // Validate file exists and is readable
    await this.validateFile(absolutePath);

    // Check if already loaded and up to date
    const existingFile = this.loadedFiles.get(absolutePath);
    if (existingFile && (await this.isFileUpToDate(existingFile))) {
      return existingFile;
    }

    // Check memory constraints before loading
    const fileSize = await this.getFileSize(absolutePath);
    await this.ensureMemoryAvailable(fileSize);

    const startTime = Date.now();
    let progress = 0;

    try {
      // Report initial progress
      options.progressCallback?.(0, `Reading file: ${path.basename(absolutePath)}`);

      // Read file in chunks for memory efficiency - not used in current implementation
      await this.readFileWithProgress(
        absolutePath,
        (chunkProgress, message) => {
          progress = chunkProgress * 0.3; // Reading takes 30% of total progress
          options.progressCallback?.(progress, message);
        },
        options.signal
      );

      options.progressCallback?.(30, 'Parsing EVTX structure...');

      // Create EVTX file model and parse
      const evtxFile = new (await import('../../parsers/models/evtx_file')).EvtxFile(absolutePath);

      const { EvtxParser } = await import('../../parsers/core/evtx_parser');
      const parseOptions: any = {
        progressInterval: 1000,
      };

      if (options.signal) {
        parseOptions.cancellationToken = options.signal;
      }

      const events = await EvtxParser.parseFile(evtxFile, parseOptions);

      options.progressCallback?.(90, 'Processing events...');

      const parseTime = Date.now() - startTime;
      options.progressCallback?.(95, 'Finalizing...');

      const fileInfo: FileInfo = {
        filePath: absolutePath,
        fileName: path.basename(absolutePath),
        fileSize,
        lastModified: await this.getFileModTime(absolutePath),
        isLoaded: true,
        eventCount: events.length,
        parseTime,
      };

      const memoryUsage = this.estimateMemoryUsage(events);

      const loadedFile: LoadedFile = {
        info: fileInfo,
        evtxFile,
        events: Object.freeze(events), // Prevent accidental mutations
        loadTime: new Date(),
        memoryUsage,
      };

      // Cache the loaded file if enabled
      if (options.enableCache !== false) {
        this.loadedFiles.set(absolutePath, loadedFile);
        this.currentMemoryUsage += memoryUsage;

        // Start watching file for changes
        this.watchFile(absolutePath);
      }

      options.progressCallback?.(100, `Loaded ${events.length.toLocaleString()} events`);

      this.emit('file-loaded', loadedFile);
      return loadedFile;
    } catch (error) {
      const fileLoadError = new FileLoadError(
        `Failed to load EVTX file: ${error instanceof Error ? error.message : String(error)}`,
        absolutePath,
        'LOAD_ERROR',
        error instanceof Error ? error : undefined
      );

      this.emit('file-load-error', fileLoadError);
      throw fileLoadError;
    }
  }

  /**
   * Get information about a file without loading it
   */
  public async getFileInfo(filePath: string): Promise<FileInfo> {
    const absolutePath = path.resolve(filePath);
    await this.validateFile(absolutePath);

    const stats = await fs.promises.stat(absolutePath);
    const loadedFile = this.loadedFiles.get(absolutePath);

    const result: FileInfo = {
      filePath: absolutePath,
      fileName: path.basename(absolutePath),
      fileSize: stats.size,
      lastModified: stats.mtime,
      isLoaded: !!loadedFile,
      eventCount: loadedFile?.events.length ?? 0,
    };

    if (loadedFile?.info.parseTime !== undefined) {
      (result as any).parseTime = loadedFile.info.parseTime;
    }

    return result;
  }

  /**
   * Unload a file from memory
   */
  public unloadFile(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);
    const loadedFile = this.loadedFiles.get(absolutePath);

    if (!loadedFile) {
      return false;
    }

    // Stop watching file
    this.unwatchFile(absolutePath);

    // Remove from memory
    this.loadedFiles.delete(absolutePath);
    this.currentMemoryUsage -= loadedFile.memoryUsage;

    this.emit('file-unloaded', absolutePath);
    return true;
  }

  /**
   * Get a loaded file
   */
  public getLoadedFile(filePath: string): LoadedFile | undefined {
    const absolutePath = path.resolve(filePath);
    return this.loadedFiles.get(absolutePath);
  }

  /**
   * Get all loaded files
   */
  public getLoadedFiles(): readonly LoadedFile[] {
    return Array.from(this.loadedFiles.values());
  }

  /**
   * Clear all loaded files from memory
   */
  public clearAll(): void {
    const filePaths = Array.from(this.loadedFiles.keys());
    filePaths.forEach((filePath) => this.unloadFile(filePath));

    this.emit('all-files-cleared');
  }

  /**
   * Get current memory usage statistics
   */
  public getMemoryUsage(): {
    current: number;
    maximum: number;
    loadedFiles: number;
    utilizationPercent: number;
  } {
    return {
      current: this.currentMemoryUsage,
      maximum: this.maxMemoryUsage,
      loadedFiles: this.loadedFiles.size,
      utilizationPercent: (this.currentMemoryUsage / this.maxMemoryUsage) * 100,
    };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Stop all file watchers
    this.fileWatchers.forEach((watcher) => watcher.close());
    this.fileWatchers.clear();

    // Clear all loaded files
    this.clearAll();

    // Remove all listeners
    this.removeAllListeners();
  }

  // Private helper methods

  private async validateFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(filePath);

      if (!stats.isFile()) {
        throw new FileLoadError('Path is not a file', filePath, 'NOT_FILE');
      }

      // Check file extension
      if (!filePath.toLowerCase().endsWith('.evtx')) {
        throw new FileLoadError(
          'Invalid file extension. Expected .evtx file',
          filePath,
          'INVALID_EXTENSION'
        );
      }

      // Check file size limits (2GB max)
      const maxFileSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (stats.size > maxFileSize) {
        throw new FileLoadError(
          `File too large: ${stats.size} bytes. Maximum supported size is ${maxFileSize} bytes`,
          filePath,
          'FILE_TOO_LARGE'
        );
      }

      // Check if file is readable
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch (error) {
      if (error instanceof FileLoadError) {
        throw error;
      }

      throw new FileLoadError(
        `File validation failed: ${error instanceof Error ? error.message : String(error)}`,
        filePath,
        'VALIDATION_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }

  private async getFileModTime(filePath: string): Promise<Date> {
    const stats = await fs.promises.stat(filePath);
    return stats.mtime;
  }

  private async isFileUpToDate(loadedFile: LoadedFile): Promise<boolean> {
    try {
      const currentModTime = await this.getFileModTime(loadedFile.info.filePath);
      return currentModTime.getTime() === loadedFile.info.lastModified.getTime();
    } catch {
      return false;
    }
  }

  private async ensureMemoryAvailable(requiredMemory: number): Promise<void> {
    // Estimate memory requirement (rough: file size * 2 for parsing overhead)
    const estimatedMemory = requiredMemory * 2;

    if (this.currentMemoryUsage + estimatedMemory > this.maxMemoryUsage) {
      // Try to free memory by removing least recently used files
      await this.freeLeastRecentlyUsedFiles(estimatedMemory);

      if (this.currentMemoryUsage + estimatedMemory > this.maxMemoryUsage) {
        throw new FileLoadError(
          `Insufficient memory. Required: ${estimatedMemory} bytes, Available: ${this.maxMemoryUsage - this.currentMemoryUsage} bytes`,
          '',
          'INSUFFICIENT_MEMORY'
        );
      }
    }
  }

  private async freeLeastRecentlyUsedFiles(requiredMemory: number): Promise<void> {
    // Sort loaded files by load time (oldest first)
    const sortedFiles = Array.from(this.loadedFiles.entries()).sort(
      (a, b) => a[1].loadTime.getTime() - b[1].loadTime.getTime()
    );

    let freedMemory = 0;

    for (const [filePath, loadedFile] of sortedFiles) {
      if (freedMemory >= requiredMemory) {
        break;
      }

      this.unloadFile(filePath);
      freedMemory += loadedFile.memoryUsage;

      this.emit('file-evicted', filePath, 'memory-pressure');
    }
  }

  private async readFileWithProgress(
    filePath: string,
    progressCallback: (progress: number, message: string) => void,
    signal?: AbortSignal
  ): Promise<Buffer> {
    const fileSize = await this.getFileSize(filePath);
    const chunks: Buffer[] = [];
    let bytesRead = 0;

    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath);

      signal?.addEventListener('abort', () => {
        stream.destroy();
        reject(new Error('Operation cancelled'));
      });

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        bytesRead += chunk.length;

        const progress = (bytesRead / fileSize) * 100;
        progressCallback(
          progress,
          `Reading: ${bytesRead.toLocaleString()} / ${fileSize.toLocaleString()} bytes`
        );
      });

      stream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      stream.on('error', (error) => {
        reject(
          new FileLoadError(`Failed to read file: ${error.message}`, filePath, 'READ_ERROR', error)
        );
      });
    });
  }

  private estimateMemoryUsage(events: readonly EventRecord[]): number {
    // Rough estimation:
    // - Base object overhead: ~100 bytes per event
    // - String content: average ~200 bytes per event (message, provider, etc.)
    // - Additional data: ~50 bytes per event
    const avgBytesPerEvent = 350;
    return events.length * avgBytesPerEvent;
  }

  private watchFile(filePath: string): void {
    // Don't watch if already watching
    if (this.fileWatchers.has(filePath)) {
      return;
    }

    try {
      const watcher = fs.watch(filePath, (eventType) => {
        if (eventType === 'change') {
          this.handleFileChange(filePath);
        }
      });

      this.fileWatchers.set(filePath, watcher);
    } catch (error) {
      // File watching is optional - don't fail if it doesn't work
      // Log warning only in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
      }
    }
  }

  private unwatchFile(filePath: string): void {
    const watcher = this.fileWatchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.fileWatchers.delete(filePath);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    const loadedFile = this.loadedFiles.get(filePath);
    if (!loadedFile) {
      return;
    }

    try {
      const isUpToDate = await this.isFileUpToDate(loadedFile);
      if (!isUpToDate) {
        this.emit('file-changed', filePath);

        // Auto-unload the file since it's outdated
        this.unloadFile(filePath);
      }
    } catch (error) {
      // If we can't check the file, assume it's been deleted or moved
      this.emit('file-deleted', filePath);
      this.unloadFile(filePath);
    }
  }
}

// Event types for FileService
export interface FileServiceEvents {
  'file-loaded': (file: LoadedFile) => void;
  'file-unloaded': (filePath: string) => void;
  'file-load-error': (error: FileLoadError) => void;
  'file-changed': (filePath: string) => void;
  'file-deleted': (filePath: string) => void;
  'file-evicted': (filePath: string, reason: string) => void;
  'all-files-cleared': () => void;
}

// Extend EventEmitter interface
export interface FileServiceEventEmitter {
  on<K extends keyof FileServiceEvents>(event: K, listener: FileServiceEvents[K]): this;
  emit<K extends keyof FileServiceEvents>(
    event: K,
    ...args: Parameters<FileServiceEvents[K]>
  ): boolean;
}
