"use strict";
/**
 * Integration Tests for EVTX: Open Folder Command
 *
 * TDD Approach: These tests MUST FAIL initially before implementation
 * Tests VS Code command for opening folders containing EVTX files
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
const fs = __importStar(require("fs"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('EVTX: Open Folder Command Integration Tests', () => {
    let mockShowOpenDialog;
    let mockShowErrorMessage;
    let mockShowInformationMessage;
    let mockCreateWebviewPanel;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockShowOpenDialog = vscode.window.showOpenDialog;
        mockShowErrorMessage = vscode.window.showErrorMessage;
        mockShowInformationMessage = vscode.window.showInformationMessage;
        mockCreateWebviewPanel = vscode.window.createWebviewPanel;
    });
    (0, globals_1.describe)('Command Registration', () => {
        (0, globals_1.it)('should register the evtx-viewer.openFolder command', async () => {
            const commands = await vscode.commands.getCommands();
            (0, globals_1.expect)(commands).toContain('evtx-viewer.openFolder');
        });
    });
    (0, globals_1.describe)('Folder Selection Dialog', () => {
        (0, globals_1.it)('should show open dialog for folder selection', async () => {
            const mockFolderUri = vscode.Uri.file('/mock/folder/path');
            mockShowOpenDialog.mockResolvedValue([mockFolderUri]);
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            (0, globals_1.expect)(mockShowOpenDialog).toHaveBeenCalledWith({
                canSelectMany: false,
                canSelectFolders: true,
                canSelectFiles: false,
                openLabel: 'Select Folder with EVTX Files'
            });
        });
        (0, globals_1.it)('should handle user cancellation gracefully', async () => {
            mockShowOpenDialog.mockResolvedValue(undefined);
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            (0, globals_1.expect)(mockShowErrorMessage).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Folder Processing', () => {
        (0, globals_1.it)('should scan folder for .evtx files recursively', async () => {
            const mockFolderUri = vscode.Uri.file('/mock/folder');
            mockShowOpenDialog.mockResolvedValue([mockFolderUri]);
            // Mock directory structure with EVTX files
            const mockFiles = [
                '/mock/folder/system.evtx',
                '/mock/folder/application.evtx',
                '/mock/folder/security.evtx',
                '/mock/folder/subfolder/setup.evtx'
            ];
            globals_1.jest.spyOn(fs.promises, 'readdir').mockImplementation(async (dirPath) => {
                if (dirPath === '/mock/folder') {
                    return [
                        { name: 'system.evtx', isFile: () => true, isDirectory: () => false },
                        { name: 'application.evtx', isFile: () => true, isDirectory: () => false },
                        { name: 'security.evtx', isFile: () => true, isDirectory: () => false },
                        { name: 'subfolder', isFile: () => false, isDirectory: () => true },
                        { name: 'readme.txt', isFile: () => true, isDirectory: () => false }
                    ];
                }
                if (dirPath.includes('subfolder')) {
                    return [
                        { name: 'setup.evtx', isFile: () => true, isDirectory: () => false }
                    ];
                }
                return [];
            });
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            (0, globals_1.expect)(mockShowInformationMessage).toHaveBeenCalledWith('Found 4 EVTX files in the selected folder. Opening combined view...');
        });
        (0, globals_1.it)('should handle empty folder appropriately', async () => {
            const mockFolderUri = vscode.Uri.file('/mock/empty-folder');
            mockShowOpenDialog.mockResolvedValue([mockFolderUri]);
            globals_1.jest.spyOn(fs.promises, 'readdir').mockResolvedValue([]);
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('No EVTX files found in the selected folder: /mock/empty-folder');
        });
        (0, globals_1.it)('should validate folder accessibility', async () => {
            const mockFolderUri = vscode.Uri.file('/mock/inaccessible-folder');
            mockShowOpenDialog.mockResolvedValue([mockFolderUri]);
            globals_1.jest.spyOn(fs.promises, 'readdir').mockRejectedValue(new Error('Permission denied'));
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('Unable to access folder: Permission denied');
        });
        (0, globals_1.it)('should limit number of files processed for performance', async () => {
            const mockFolderUri = vscode.Uri.file('/mock/large-folder');
            mockShowOpenDialog.mockResolvedValue([mockFolderUri]);
            // Mock folder with 150 EVTX files (exceeds limit of 100)
            const mockFiles = Array.from({ length: 150 }, (_, i) => ({
                name: `file${i}.evtx`,
                isFile: () => true,
                isDirectory: () => false
            }));
            globals_1.jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles);
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            (0, globals_1.expect)(mockShowInformationMessage).toHaveBeenCalledWith(globals_1.expect.stringContaining('Found 150 EVTX files. Processing first 100 files for performance'));
        });
    });
    (0, globals_1.describe)('Webview Creation for Multiple Files', () => {
        (0, globals_1.it)('should create webview panel for multiple EVTX files', async () => {
            const mockFolderUri = vscode.Uri.file('/mock/folder');
            mockShowOpenDialog.mockResolvedValue([mockFolderUri]);
            const mockFiles = [
                { name: 'system.evtx', isFile: () => true, isDirectory: () => false },
                { name: 'application.evtx', isFile: () => true, isDirectory: () => false }
            ];
            globals_1.jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles);
            const mockWebviewPanel = {
                webview: { html: '', postMessage: globals_1.jest.fn(), onDidReceiveMessage: globals_1.jest.fn() },
                title: '',
                dispose: globals_1.jest.fn(),
                reveal: globals_1.jest.fn(),
            };
            mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel);
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            (0, globals_1.expect)(mockCreateWebviewPanel).toHaveBeenCalledWith('evtx-viewer.editor', 'EVTX Viewer - Multiple Files (2 files)', vscode.ViewColumn.One, globals_1.expect.objectContaining({
                enableScripts: true,
                retainContextWhenHidden: true
            }));
        });
        (0, globals_1.it)('should include folder name in webview title', async () => {
            const mockFolderUri = vscode.Uri.file('/system/logs/windows-events');
            mockShowOpenDialog.mockResolvedValue([mockFolderUri]);
            const mockFiles = [
                { name: 'system.evtx', isFile: () => true, isDirectory: () => false }
            ];
            globals_1.jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles);
            const mockWebviewPanel = {
                webview: { html: '', postMessage: globals_1.jest.fn(), onDidReceiveMessage: globals_1.jest.fn() },
                title: '',
                dispose: globals_1.jest.fn(),
                reveal: globals_1.jest.fn(),
            };
            mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel);
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            (0, globals_1.expect)(mockCreateWebviewPanel).toHaveBeenCalledWith(globals_1.expect.any(String), 'EVTX Viewer - windows-events (1 file)', globals_1.expect.any(Number), globals_1.expect.any(Object));
        });
    });
    (0, globals_1.describe)('Performance Requirements', () => {
        (0, globals_1.it)('should complete folder scanning within reasonable time for large directories', async () => {
            const mockFolderUri = vscode.Uri.file('/mock/large-folder');
            mockShowOpenDialog.mockResolvedValue([mockFolderUri]);
            // Mock folder with many files
            const mockFiles = Array.from({ length: 50 }, (_, i) => ({
                name: `file${i}.evtx`,
                isFile: () => true,
                isDirectory: () => false
            }));
            globals_1.jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles);
            const startTime = performance.now();
            await vscode.commands.executeCommand('evtx-viewer.openFolder');
            const duration = performance.now() - startTime;
            // Should complete folder scanning quickly
            (0, globals_1.expect)(duration).toBeLessThan(1000); // 1 second for folder scanning
        });
    });
});
//# sourceMappingURL=test_open_folder_command.js.map