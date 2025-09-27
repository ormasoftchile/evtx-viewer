/**
 * JSDOM Helper with Pre-configured Globals
 * 
 * This helper ensures all required Node.js globals are available
 * before importing and using JSDOM.
 */

import { TextEncoder, TextDecoder } from 'util';
import { URL, URLSearchParams } from 'url';

// Set up globals immediately when this module is imported
if (typeof (global as any).TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof (global as any).TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
if (typeof (global as any).URL === 'undefined') {
  (global as any).URL = URL;
}
if (typeof (global as any).URLSearchParams === 'undefined') {
  (global as any).URLSearchParams = URLSearchParams;
}

// Add performance API if missing
if (typeof (global as any).performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {},
    timeOrigin: Date.now()
  };
}

// Add fetch API stubs if missing
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
    private headers = new Map<string, string>();
    get(name: string) { return this.headers.get(name.toLowerCase()) || null; }
    set(name: string, value: string) { this.headers.set(name.toLowerCase(), value); }
    has(name: string) { return this.headers.has(name.toLowerCase()); }
    delete(name: string) { this.headers.delete(name.toLowerCase()); }
  };
}
if (typeof (global as any).AbortController === 'undefined') {
  (global as any).AbortController = class AbortController {
    signal = { aborted: false };
    abort() { this.signal.aborted = true; }
  };
}

// Now safely import JSDOM using require() to avoid ES6 module hoisting
const { JSDOM: JSXDOMClass } = require('jsdom');

// Export JSDOM class with proper typing
export const JSDOM = JSXDOMClass as typeof import('jsdom').JSDOM;

// Export a helper function that ensures everything is set up
export const ensureJSDOMGlobals = () => {
  // This function just ensures the module has been loaded and globals are set
  return true;
};