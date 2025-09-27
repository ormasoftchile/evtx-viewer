"use strict";
/**
 * Jest setup file for EVTX Viewer tests
 * Configures global test environment and mocks
 */
// Mock VS Code API for testing
const vscode = {
    commands: {
        registerCommand: jest.fn(),
        executeCommand: jest.fn(),
    },
    window: {
        showErrorMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showInformationMessage: jest.fn(),
        showOpenDialog: jest.fn(),
        createWebviewPanel: jest.fn(),
        withProgress: jest.fn(),
    },
    workspace: {
        getConfiguration: jest.fn(),
        onDidChangeConfiguration: jest.fn(),
        workspaceFolders: [],
    },
    Uri: {
        file: jest.fn(),
        parse: jest.fn(),
    },
    ViewColumn: {
        One: 1,
        Two: 2,
        Three: 3,
    },
    ExtensionContext: jest.fn(),
    Disposable: jest.fn(),
    EventEmitter: jest.fn(),
    TreeDataProvider: jest.fn(),
    WebviewPanel: jest.fn(),
    WebviewOptions: jest.fn(),
    ProgressLocation: {
        Notification: 15,
        SourceControl: 1,
        Window: 10,
    },
};
// Make VS Code API available globally in tests
global.vscode = vscode;
// Mock Node.js modules commonly used in VS Code extensions
jest.mock('vscode', () => vscode, { virtual: true });
// Set up global test timeout
jest.setTimeout(10000);
// Console setup for cleaner test output
const originalConsoleError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        if (typeof args[0] === 'string' &&
            (args[0].includes('Warning:') || args[0].includes('jest-haste-map'))) {
            return;
        }
        originalConsoleError(...args);
    };
});
afterAll(() => {
    console.error = originalConsoleError;
});
// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});
//# sourceMappingURL=setup.js.map