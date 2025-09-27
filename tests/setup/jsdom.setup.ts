/**
 * JSDOM Setup for Accessibility Tests
 * 
 * Provides Node.js globals that are missing in jsdom environment
 */

import { TextEncoder, TextDecoder } from 'util';

// Add Node.js globals to jsdom environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

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