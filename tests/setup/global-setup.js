/**
 * Global Jest Setup
 * 
 * This file runs BEFORE any test environments are created.
 * It ensures Node.js globals are available for JSDOM/webidl-conversions.
 */

const { TextEncoder, TextDecoder } = require('util');
const { URL, URLSearchParams } = require('url');

module.exports = async function globalSetup() {
  // Set up critical globals BEFORE any Jest environments are created
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
  global.URL = URL;
  global.URLSearchParams = URLSearchParams;

  // Add performance API
  global.performance = global.performance || {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {},
    timeOrigin: Date.now()
  };

  // Add fetch API stubs
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
    get(name) { return this.headers.get(name.toLowerCase()); }
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

  console.log('Global Jest setup complete - Node.js globals available for JSDOM');
};