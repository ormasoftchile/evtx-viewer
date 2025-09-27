/**
 * Pre-JSDOM Setup Script
 * Sets up Node.js globals before Jest loads any modules
 */

const { TextEncoder, TextDecoder } = require('util');
const { URL, URLSearchParams } = require('url');

// Set globals immediately
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.URL = URL;
global.URLSearchParams = URLSearchParams;

// Add missing ArrayBuffer properties that webidl-conversions expects
if (!ArrayBuffer.prototype.hasOwnProperty('resizable')) {
  Object.defineProperty(ArrayBuffer.prototype, 'resizable', {
    get: function() { return false; },
    configurable: true,
    enumerable: false
  });
}

if (!SharedArrayBuffer.prototype.hasOwnProperty('growable')) {
  Object.defineProperty(SharedArrayBuffer.prototype, 'growable', {
    get: function() { return false; },
    configurable: true,
    enumerable: false
  });
}

global.performance = global.performance || {
  now: () => Date.now(),
  mark: () => {},
  measure: () => {},
  clearMarks: () => {},
  clearMeasures: () => {},
  timeOrigin: Date.now()
};

global.Request = global.Request || class Request {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
  }
};

global.Response = global.Response || class Response {
  constructor(body, options = {}) {
    this.body = body;
    this.options = options;
  }
};

global.Headers = global.Headers || class Headers {
  constructor() {
    this.headers = new Map();
  }
  get(name) { return this.headers.get(name.toLowerCase()) || null; }
  set(name, value) { this.headers.set(name.toLowerCase(), value); }
  has(name) { return this.headers.has(name.toLowerCase()); }
  delete(name) { this.headers.delete(name.toLowerCase()); }
};

global.AbortController = global.AbortController || class AbortController {
  constructor() {
    this.signal = { aborted: false };
  }
  abort() { 
    this.signal.aborted = true; 
  }
};