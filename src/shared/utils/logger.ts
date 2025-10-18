// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Logger utility for EVTX Viewer Extension
 *
 * Provides structured logging with different levels and can be configured
 * to show/hide different log levels based on development/production context.
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private static currentLevel: LogLevel = LogLevel.INFO;

  static setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  static error(message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.ERROR) {
      console.error(`[EVTX] ERROR: ${message}`, ...args);
    }
  }

  static warn(message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.WARN) {
      console.warn(`[EVTX] WARN: ${message}`, ...args);
    }
  }

  static info(message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.INFO) {
      console.info(`[EVTX] INFO: ${message}`, ...args);
    }
  }

  static debug(message: string, ...args: any[]): void {
    if (this.currentLevel >= LogLevel.DEBUG) {
      console.log(`[EVTX] DEBUG: ${message}`, ...args);
    }
  }
}

// Export convenience functions
export const log = {
  error: Logger.error.bind(Logger),
  warn: Logger.warn.bind(Logger),
  info: Logger.info.bind(Logger),
  debug: Logger.debug.bind(Logger),
};
