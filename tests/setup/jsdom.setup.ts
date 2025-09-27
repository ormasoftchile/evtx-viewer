/**
 * JSDOM Setup for Accessibility Tests
 * 
 * Provides Node.js globals that are missing in jsdom environment
 */

import { TextEncoder, TextDecoder } from 'util';

// Add Node.js globals to jsdom environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Add missing URL globals that webidl-conversions needs
(global as any).URL = URL || require('url').URL;
(global as any).URLSearchParams = URLSearchParams || require('url').URLSearchParams;

// Add performance API if missing
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {}
  };
}

// Add other missing globals that might be needed
if (typeof (global as any).Request === 'undefined') {
  (global as any).Request = class Request {};
}
if (typeof (global as any).Response === 'undefined') {
  (global as any).Response = class Response {};
}
if (typeof (global as any).Headers === 'undefined') {
  (global as any).Headers = class Headers {};
}

// Suppress jsdom navigation errors
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Not implemented: navigation')
  ) {
    return;
  }
  originalError.call(console, ...args);
};