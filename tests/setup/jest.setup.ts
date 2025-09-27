/**
 * Jest Setup Configuration
 * 
 * Global test environment setup for EVTX Viewer extension tests.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.VSCODE_EXTENSION_TEST = 'true';

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});