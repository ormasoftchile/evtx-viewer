/**
 * JSDOM Setup for Accessibility Tests
 * 
 * Provides Node.js globals that are missing in jsdom environment
 * This must run BEFORE any JSDOM imports to prevent webidl-conversions errors
 */

import { TextEncoder, TextDecoder } from 'util';
import { URL, URLSearchParams } from 'url';

// Critical: Set up globals BEFORE any JSDOM imports
// This fixes the webidl-conversions "Cannot read properties of undefined" error

// Add Node.js globals to jsdom environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Add URL globals that webidl-conversions needs
(global as any).URL = URL;
(global as any).URLSearchParams = URLSearchParams;

// Add performance API
(global as any).performance = performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  clearMarks: () => {},
  clearMeasures: () => {},
  timeOrigin: Date.now()
};

// Add fetch API stubs
if (typeof (global as any).Request === 'undefined') {
  (global as any).Request = class Request {
    constructor(public url: string, public options: any = {}) {}
  };
}
if (typeof (global as any).Response === 'undefined') {
  (global as any).Response = class Response {
    constructor(public body: any, public options: any = {}) {}
  };
}
if (typeof (global as any).Headers === 'undefined') {
  (global as any).Headers = class Headers {
    private headers: Map<string, string> = new Map();
    get(name: string) { return this.headers.get(name.toLowerCase()); }
    set(name: string, value: string) { this.headers.set(name.toLowerCase(), value); }
    has(name: string) { return this.headers.has(name.toLowerCase()); }
  };
}

// Add AbortController if missing
if (typeof (global as any).AbortController === 'undefined') {
  (global as any).AbortController = class AbortController {
    signal = { aborted: false };
    abort() { this.signal.aborted = true; }
  };
}

// Suppress jsdom navigation errors
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Not implemented: navigation') ||
     args[0].includes('Error: Not implemented'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};