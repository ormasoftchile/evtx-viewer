/**
 * VS Code Mock for Jest Testing
 * 
 * Mock implementation of VS Code APIs for unit and integration testing.
 */

const EventEmitter = require('events').EventEmitter;

// Mock disposable
const mockDisposable = {
  dispose: jest.fn(),
};

// Mock URI
const Uri = {
  file: jest.fn((path) => ({
    scheme: 'file',
    authority: '',
    path: path,
    query: '',
    fragment: '',
    fsPath: path,
    toString: () => `file://${path}`,
  })),
  parse: jest.fn(),
  joinPath: jest.fn(),
};

// Mock webview
const mockWebview = {
  html: '',
  postMessage: jest.fn().mockResolvedValue(undefined),
  asWebviewUri: jest.fn((uri) => uri),
  cspSource: 'vscode-webview://fake-id',
  options: {},
  onDidReceiveMessage: jest.fn(),
};

// Mock webview panel
const mockWebviewPanel = {
  webview: mockWebview,
  title: '',
  viewType: '',
  viewColumn: 1,
  active: true,
  visible: true,
  onDidDispose: jest.fn(),
  onDidChangeViewState: jest.fn(),
  reveal: jest.fn(),
  dispose: jest.fn(),
};

// Mock commands
const commands = {
  registerCommand: jest.fn().mockReturnValue(mockDisposable),
  executeCommand: jest.fn().mockResolvedValue(undefined),
  getCommands: jest.fn().mockResolvedValue([]),
};

// Mock window
const vscodeWindow = {
  createWebviewPanel: jest.fn().mockReturnValue(mockWebviewPanel),
  showInformationMessage: jest.fn().mockResolvedValue(undefined),
  showErrorMessage: jest.fn().mockResolvedValue(undefined),
  showWarningMessage: jest.fn().mockResolvedValue(undefined),
  showOpenDialog: jest.fn().mockResolvedValue(undefined),
  showSaveDialog: jest.fn().mockResolvedValue(undefined),
  withProgress: jest.fn((options, task) => task({ report: jest.fn() })),
  createOutputChannel: jest.fn().mockReturnValue({
    append: jest.fn(),
    appendLine: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
    show: jest.fn(),
    hide: jest.fn(),
  }),
};

// Mock workspace
const workspace = {
  getConfiguration: jest.fn().mockReturnValue({
    get: jest.fn(),
    update: jest.fn(),
    has: jest.fn(),
    inspect: jest.fn(),
  }),
  openTextDocument: jest.fn(),
  onDidChangeConfiguration: jest.fn().mockReturnValue(mockDisposable),
  workspaceFolders: [],
  getWorkspaceFolder: jest.fn(),
};

// Mock progress
const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15,
};

// Mock view column
const ViewColumn = {
  Active: -1,
  Beside: -2,
  One: 1,
  Two: 2,
  Three: 3,
  Four: 4,
  Five: 5,
  Six: 6,
  Seven: 7,
  Eight: 8,
  Nine: 9,
};

// Mock environment
const env = {
  clipboard: {
    readText: jest.fn(),
    writeText: jest.fn(),
  },
  openExternal: jest.fn(),
  asExternalUri: jest.fn(),
};

// Mock languages
const languages = {
  registerDocumentFormattingEditProvider: jest.fn().mockReturnValue(mockDisposable),
  registerDocumentSymbolProvider: jest.fn().mockReturnValue(mockDisposable),
  createDiagnosticCollection: jest.fn().mockReturnValue({
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    dispose: jest.fn(),
  }),
};

// Mock extension context
const mockExtensionContext = {
  subscriptions: [],
  workspaceState: {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(() => []),
  },
  globalState: {
    get: jest.fn(),
    update: jest.fn(),
    keys: jest.fn(() => []),
    setKeysForSync: jest.fn(),
  },
  extensionPath: '/mock/extension/path',
  asAbsolutePath: jest.fn((relativePath) => `/mock/extension/path/${relativePath}`),
  storageUri: Uri.file('/mock/storage'),
  globalStorageUri: Uri.file('/mock/global-storage'),
  logUri: Uri.file('/mock/logs'),
  extensionUri: Uri.file('/mock/extension'),
  environmentVariableCollection: {},
  extensionMode: 1, // Test mode
  storagePath: '/mock/storage',
  globalStoragePath: '/mock/global-storage',
  logPath: '/mock/logs',
  secrets: {},
  extension: {},
  languageModelAccessInformation: {},
};

module.exports = {
  Uri,
  ViewColumn,
  ProgressLocation,
  commands,
  window: vscodeWindow,
  workspace,
  env,
  languages,
  Disposable: mockDisposable,
  ExtensionContext: mockExtensionContext,
  EventEmitter,
};