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

// Lazy-load JSDOM only when actually used
let JSDOMClass: any = null;

export class JSDOM {
  private _dom: any;

  constructor(html?: string, options?: any) {
    // Load JSDOM only when constructor is called
    if (!JSDOMClass) {
      JSDOMClass = require('jsdom').JSDOM;
    }
    this._dom = new JSDOMClass(html, options);
  }

  get window() {
    return this._dom.window;
  }

  get document() {
    return this._dom.window.document;
  }

  get virtualConsole() {
    return this._dom.virtualConsole;
  }

  get cookieJar() {
    return this._dom.cookieJar;
  }

  nodeLocation(node: any) {
    return this._dom.nodeLocation(node);
  }

  getInternalVMContext() {
    return this._dom.getInternalVMContext();
  }

  serialize() {
    return this._dom.serialize();
  }

  reconfigure(settings: any) {
    return this._dom.reconfigure(settings);
  }

  static fragment(html?: string) {
    if (!JSDOMClass) {
      JSDOMClass = require('jsdom').JSDOM;
    }
    return JSDOMClass.fragment(html);
  }

  static fromURL(url: string, options?: any) {
    if (!JSDOMClass) {
      JSDOMClass = require('jsdom').JSDOM;
    }
    return JSDOMClass.fromURL(url, options);
  }

  static fromFile(filename: string, options?: any) {
    if (!JSDOMClass) {
      JSDOMClass = require('jsdom').JSDOM;
    }
    return JSDOMClass.fromFile(filename, options);
  }
}

// Export a helper function that ensures everything is set up
export const ensureJSDOMGlobals = () => {
  // This function just ensures the module has been loaded and globals are set
  return true;
};