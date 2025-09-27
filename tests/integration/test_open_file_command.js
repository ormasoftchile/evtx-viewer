"use strict";
/**
 * Integration Tests for EVTX: Open File Command
 *
 * TDD Approach: These tests MUST FAIL initially before implementation
 * Tests VS Code command registration and file opening workflow
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('EVTX: Open File Command Integration Tests', () => {
    let mockExtensionContext;
    let mockShowOpenDialog;
    let mockShowErrorMessage;
    let mockCreateWebviewPanel;
    (0, globals_1.beforeEach)(() => {
        // Reset all mocks
        globals_1.jest.clearAllMocks();
        // Mock VS Code APIs
        mockShowOpenDialog = vscode.window.showOpenDialog;
        mockShowErrorMessage = vscode.window.showErrorMessage;
        mockCreateWebviewPanel = vscode.window.createWebviewPanel;
        // Mock extension context
        mockExtensionContext = {
            subscriptions: [],
            workspaceState: {
                get: globals_1.jest.fn(),
                update: globals_1.jest.fn(),
            },
            globalState: {
                get: globals_1.jest.fn(),
                update: globals_1.jest.fn(),
                keys: globals_1.jest.fn(),
            },
            extensionPath: '/mock/extension/path',
            asAbsolutePath: globals_1.jest.fn((relativePath) => path.join('/mock/extension/path', relativePath)),
            storageUri: vscode.Uri.parse('file:///mock/storage'),
            globalStorageUri: vscode.Uri.parse('file:///mock/global-storage'),
            logUri: vscode.Uri.parse('file:///mock/logs'),
            environmentVariableCollection: {},
            extensionUri: vscode.Uri.parse('file:///mock/extension'),
            globalStoragePath: '/mock/global-storage',
            logPath: '/mock/logs',
            storagePath: '/mock/storage',
            secrets: {},
            extensionMode: vscode.ExtensionMode.Development,
        };
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Command Registration', () => {
        (0, globals_1.it)('should register the evtx-viewer.openFile command', async () => {
            // This test will fail until the command is implemented
            const commands = await vscode.commands.getCommands();
            (0, globals_1.expect)(commands).toContain('evtx-viewer.openFile');
        });
        (0, globals_1.it)('should have command visible in command palette', async () => {
            // This test will fail until the command is properly configured
            const allCommands = await vscode.commands.getCommands(true);
            const evtxCommand = allCommands.find(cmd => cmd === 'evtx-viewer.openFile');
            (0, globals_1.expect)(evtxCommand).toBeDefined();
        });
    });
    (0, globals_1.describe)('File Selection Dialog', () => {
        (0, globals_1.it)('should show open dialog with correct file filters when command is executed', async () => {
            // Mock dialog to return a file selection
            const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Execute the command - this will fail until implemented
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockShowOpenDialog).toHaveBeenCalledWith({
                canSelectMany: false,
                canSelectFolders: false,
                canSelectFiles: true,
                filters: {
                    'Windows Event Log Files': ['evtx'],
                    'All Files': ['*']
                },
                openLabel: 'Open EVTX File'
            });
        });
        (0, globals_1.it)('should handle user cancellation of file dialog gracefully', async () => {
            // Mock dialog to return undefined (user cancelled)
            mockShowOpenDialog.mockResolvedValue(undefined);
            // Execute the command - this should not show error
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockShowErrorMessage).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should validate selected file has .evtx extension', async () => {
            // Mock dialog to return non-evtx file
            const mockFileUri = vscode.Uri.file('/mock/path/test.txt');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Execute the command
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('Selected file is not a valid EVTX file. Please select a file with .evtx extension.');
        });
    });
    (0, globals_1.describe)('File Processing', () => {
        (0, globals_1.it)('should verify file exists before attempting to open', async () => {
            // Mock dialog to return non-existent file
            const mockFileUri = vscode.Uri.file('/nonexistent/path/test.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock fs.access to throw error for non-existent file
            globals_1.jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('File not found'));
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('Unable to access the selected file: /nonexistent/path/test.evtx');
        });
        (0, globals_1.it)('should check file is readable before opening', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock fs.access to succeed for existence but fail for readability
            globals_1.jest.spyOn(fs.promises, 'access')
                .mockImplementation((path, mode) => {
                if (mode === fs.constants.F_OK) {
                    return Promise.resolve();
                }
                if (mode === fs.constants.R_OK) {
                    return Promise.reject(new Error('Permission denied'));
                }
                return Promise.resolve();
            });
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('File is not readable. Please check file permissions: /mock/path/test.evtx');
        });
        (0, globals_1.it)('should validate file size is reasonable for processing', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/huge.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock file system calls
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 5 * 1024 * 1024 * 1024, // 5GB file
                isFile: () => true,
            });
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('File size (5.00 GB) exceeds maximum supported size of 2.00 GB. Please use a smaller file.');
        });
    });
    (0, globals_1.describe)('Webview Creation', () => {
        (0, globals_1.it)('should create webview panel for valid EVTX file', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock successful file system calls
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024, // 1MB file
                isFile: () => true,
            });
            const mockWebviewPanel = {
                webview: {
                    html: '',
                    postMessage: globals_1.jest.fn(),
                    onDidReceiveMessage: globals_1.jest.fn(),
                },
                title: '',
                dispose: globals_1.jest.fn(),
                reveal: globals_1.jest.fn(),
            };
            mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel);
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockCreateWebviewPanel).toHaveBeenCalledWith('evtx-viewer.editor', 'EVTX Viewer - test.evtx', vscode.ViewColumn.One, {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(mockExtensionContext.extensionPath, 'out', 'webview'))
                ]
            });
        });
        (0, globals_1.it)('should set correct webview title based on filename', async () => {
            const mockFileUri = vscode.Uri.file('/path/to/security-logs.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock successful file system calls
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            const mockWebviewPanel = {
                webview: { html: '', postMessage: globals_1.jest.fn(), onDidReceiveMessage: globals_1.jest.fn() },
                title: '',
                dispose: globals_1.jest.fn(),
                reveal: globals_1.jest.fn(),
            };
            mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel);
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockCreateWebviewPanel).toHaveBeenCalledWith(globals_1.expect.any(String), 'EVTX Viewer - security-logs.evtx', globals_1.expect.any(Number), globals_1.expect.any(Object));
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle file system errors gracefully', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock fs.access to throw unexpected error
            globals_1.jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('Unexpected file system error'));
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('Failed to open EVTX file: Unexpected file system error');
        });
        (0, globals_1.it)('should handle webview creation errors', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock successful file system calls
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            // Mock webview creation to throw error
            mockCreateWebviewPanel.mockImplementation(() => {
                throw new Error('Failed to create webview panel');
            });
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('Failed to create EVTX viewer: Failed to create webview panel');
        });
    });
    (0, globals_1.describe)('Performance Requirements', () => {
        (0, globals_1.it)('should complete file opening workflow within constitutional time limit (<100ms UI response)', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock successful file system calls
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            const mockWebviewPanel = {
                webview: { html: '', postMessage: globals_1.jest.fn(), onDidReceiveMessage: globals_1.jest.fn() },
                title: '',
                dispose: globals_1.jest.fn(),
                reveal: globals_1.jest.fn(),
            };
            mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel);
            const startTime = performance.now();
            await vscode.commands.executeCommand('evtx-viewer.openFile');
            const duration = performance.now() - startTime;
            // Constitutional requirement: UI response time <100ms
            (0, globals_1.expect)(duration).toBeLessThan(100);
        });
    });
});
//# sourceMappingURL=test_open_file_command.js.map