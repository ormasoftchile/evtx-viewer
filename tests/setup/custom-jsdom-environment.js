/**
 * Custom JSDOM Environment for Jest
 * 
 * This custom environment ensures proper global setup before JSDOM initialization
 * to prevent webidl-conversions errors.
 */

// Set globals IMMEDIATELY at module load time
const { TextEncoder, TextDecoder } = require('util');
const { URL, URLSearchParams } = require('url');

// Set up critical globals BEFORE any other imports
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

// Now import the JSDOM environment AFTER globals are set
const JSDOMEnvironment = require('jest-environment-jsdom').default;

class CustomJSDOMEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    // Globals are already set at module level
    super(config, context);

    // Suppress jsdom navigation errors
    const originalError = console.error;
    console.error = (...args) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('Not implemented: navigation') ||
         args[0].includes('Error: Not implemented'))
      ) {
        return;
      }
      originalError.call(console, ...args);
    };
  }

  async setup() {
    await super.setup();
  }

  async teardown() {
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }
}

module.exports = CustomJSDOMEnvironment;