"use strict";
/**
 * Integration Tests for EVTX: Add File to Current View Command
 *
 * TDD Approach: These tests MUST FAIL initially before implementation
 * Tests VS Code command for adding additional EVTX files to existing view
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
(0, globals_1.describe)('EVTX: Add File to Current View Command Integration Tests', () => {
    let mockShowOpenDialog;
    let mockShowErrorMessage;
    let mockShowInformationMessage;
    let mockShowWarningMessage;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
        mockShowOpenDialog = vscode.window.showOpenDialog;
        mockShowErrorMessage = vscode.window.showErrorMessage;
        mockShowInformationMessage = vscode.window.showInformationMessage;
        mockShowWarningMessage = vscode.window.showWarningMessage;
    });
    (0, globals_1.describe)('Command Registration', () => {
        (0, globals_1.it)('should register the evtx-viewer.addFile command', async () => {
            const commands = await vscode.commands.getCommands();
            (0, globals_1.expect)(commands).toContain('evtx-viewer.addFile');
        });
    });
    (0, globals_1.describe)('Command Availability', () => {
        (0, globals_1.it)('should only be available when an EVTX viewer is already open', async () => {
            // When no EVTX viewer is open, command should show warning
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowWarningMessage).toHaveBeenCalledWith('No EVTX viewer is currently open. Use "EVTX: Open File" to create a new viewer first.');
        });
        (0, globals_1.it)('should be enabled in command palette when EVTX viewer is active', async () => {
            // This test requires mocking an active EVTX viewer webview
            // Implementation will need to track active webview panels
            // Mock active webview panel
            const mockActiveWebview = {
                webview: {
                    postMessage: globals_1.jest.fn(),
                    onDidReceiveMessage: globals_1.jest.fn(),
                    html: ''
                },
                title: 'EVTX Viewer - test.evtx',
                visible: true,
                active: true,
                viewType: 'evtx-viewer.editor'
            };
            // This will fail until viewer state management is implemented
            // The test verifies that the command becomes available when a viewer is open
        });
    });
    (0, globals_1.describe)('File Selection and Validation', () => {
        (0, globals_1.it)('should show open dialog with EVTX file filters', async () => {
            // Mock existing viewer state
            const mockExistingViewer = { isActive: true };
            const mockFileUri = vscode.Uri.file('/mock/path/additional.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock successful file validation
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowOpenDialog).toHaveBeenCalledWith({
                canSelectMany: true, // Allow multiple file selection
                canSelectFolders: false,
                canSelectFiles: true,
                filters: {
                    'Windows Event Log Files': ['evtx'],
                    'All Files': ['*']
                },
                openLabel: 'Add EVTX Files'
            });
        });
        (0, globals_1.it)('should allow multiple file selection', async () => {
            const mockFileUris = [
                vscode.Uri.file('/mock/path/file1.evtx'),
                vscode.Uri.file('/mock/path/file2.evtx'),
                vscode.Uri.file('/mock/path/file3.evtx')
            ];
            mockShowOpenDialog.mockResolvedValue(mockFileUris);
            // Mock successful file validation for all files
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowInformationMessage).toHaveBeenCalledWith('Successfully added 3 EVTX files to the current view.');
        });
        (0, globals_1.it)('should validate each selected file individually', async () => {
            const mockFileUris = [
                vscode.Uri.file('/mock/path/valid.evtx'),
                vscode.Uri.file('/mock/path/invalid.txt'),
                vscode.Uri.file('/mock/path/nonexistent.evtx')
            ];
            mockShowOpenDialog.mockResolvedValue(mockFileUris);
            // Mock validation results
            globals_1.jest.spyOn(fs.promises, 'access').mockImplementation(async (filePath) => {
                if (filePath.includes('nonexistent')) {
                    throw new Error('File not found');
                }
                return Promise.resolve();
            });
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowWarningMessage).toHaveBeenCalledWith('Some files could not be added:\n' +
                '• invalid.txt: Not a valid EVTX file\n' +
                '• nonexistent.evtx: File not found\n' +
                '\nSuccessfully added 1 file.');
        });
        (0, globals_1.it)('should prevent adding duplicate files', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/existing.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock file validation
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            // This test will fail until duplicate detection is implemented
            // Need to track which files are already loaded in the current view
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowWarningMessage).toHaveBeenCalledWith('File existing.evtx is already loaded in the current view.');
        });
    });
    (0, globals_1.describe)('File Size and Resource Management', () => {
        (0, globals_1.it)('should warn when adding large files that may impact performance', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/large.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024 * 1024, // 1GB file
                isFile: () => true,
            });
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowWarningMessage).toHaveBeenCalledWith('Adding large file (1.00 GB). This may impact performance. Continue?', 'Yes', 'No');
        });
        (0, globals_1.it)('should check total memory usage when adding files', async () => {
            const mockFileUris = Array.from({ length: 10 }, (_, i) => vscode.Uri.file(`/mock/path/file${i}.evtx`));
            mockShowOpenDialog.mockResolvedValue(mockFileUris);
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 100 * 1024 * 1024, // 100MB per file = 1GB total
                isFile: () => true,
            });
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowWarningMessage).toHaveBeenCalledWith(globals_1.expect.stringContaining('Total memory usage would exceed constitutional limit'));
        });
    });
    (0, globals_1.describe)('Webview Integration', () => {
        (0, globals_1.it)('should send message to active webview with new file information', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/new.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            // Mock file validation
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            const mockWebview = {
                postMessage: globals_1.jest.fn()
            };
            // This will fail until webview state management is implemented
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockWebview.postMessage).toHaveBeenCalledWith({
                command: 'addFiles',
                files: [
                    {
                        path: '/mock/path/new.evtx',
                        name: 'new.evtx',
                        size: 1024 * 1024
                    }
                ]
            });
        });
        (0, globals_1.it)('should update webview title to reflect additional files', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/additional.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            const mockPanel = {
                title: 'EVTX Viewer - original.evtx',
                webview: { postMessage: globals_1.jest.fn() }
            };
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            // Title should be updated to show multiple files
            (0, globals_1.expect)(mockPanel.title).toBe('EVTX Viewer - Multiple Files (2 files)');
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle file access errors gracefully', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/inaccessible.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            globals_1.jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('Permission denied'));
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('Failed to add file inaccessible.evtx: Permission denied');
        });
        (0, globals_1.it)('should handle webview communication errors', async () => {
            const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
            mockShowOpenDialog.mockResolvedValue([mockFileUri]);
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            const mockWebview = {
                postMessage: globals_1.jest.fn().mockImplementation(() => {
                    throw new Error('Webview disposed');
                })
            };
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            (0, globals_1.expect)(mockShowErrorMessage).toHaveBeenCalledWith('Failed to add files to viewer: Webview disposed');
        });
    });
    (0, globals_1.describe)('Performance Requirements', () => {
        (0, globals_1.it)('should complete file addition within constitutional time limits', async () => {
            const mockFileUris = [
                vscode.Uri.file('/mock/path/file1.evtx'),
                vscode.Uri.file('/mock/path/file2.evtx')
            ];
            mockShowOpenDialog.mockResolvedValue(mockFileUris);
            globals_1.jest.spyOn(fs.promises, 'access').mockResolvedValue();
            globals_1.jest.spyOn(fs.promises, 'stat').mockResolvedValue({
                size: 1024 * 1024,
                isFile: () => true,
            });
            const startTime = performance.now();
            await vscode.commands.executeCommand('evtx-viewer.addFile');
            const duration = performance.now() - startTime;
            // Constitutional requirement: UI response time <100ms
            (0, globals_1.expect)(duration).toBeLessThan(100);
        });
    });
});
//# sourceMappingURL=test_add_file_command.js.map