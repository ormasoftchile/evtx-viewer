/**
 * Integration Tests for EVTX: Open File Command
 * 
 * TDD Approach: These tests MUST FAIL initially before implementation
 * Tests VS Code command registration and file opening workflow
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';

describe('EVTX: Open File Command Integration Tests', () => {
  let mockExtensionContext: vscode.ExtensionContext;
  let mockShowOpenDialog: jest.MockedFunction<typeof vscode.window.showOpenDialog>;
  let mockShowErrorMessage: jest.MockedFunction<typeof vscode.window.showErrorMessage>;
  let mockCreateWebviewPanel: jest.MockedFunction<typeof vscode.window.createWebviewPanel>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock VS Code APIs
    mockShowOpenDialog = vscode.window.showOpenDialog as jest.MockedFunction<typeof vscode.window.showOpenDialog>;
    mockShowErrorMessage = vscode.window.showErrorMessage as jest.MockedFunction<typeof vscode.window.showErrorMessage>;
    mockCreateWebviewPanel = vscode.window.createWebviewPanel as jest.MockedFunction<typeof vscode.window.createWebviewPanel>;

    // Mock extension context
    mockExtensionContext = {
      subscriptions: [],
      workspaceState: {
        get: jest.fn() as any,
        update: jest.fn() as any,
        keys: jest.fn() as any,
      },
      globalState: {
        get: jest.fn() as any,
        update: jest.fn() as any,
        keys: jest.fn() as any,
        setKeysForSync: jest.fn() as any,
      },
      extensionPath: '/mock/extension/path',
      asAbsolutePath: jest.fn((relativePath: string) => path.join('/mock/extension/path', relativePath)),
      storageUri: vscode.Uri.parse('file:///mock/storage'),
      globalStorageUri: vscode.Uri.parse('file:///mock/global-storage'),
      logUri: vscode.Uri.parse('file:///mock/logs'),
      environmentVariableCollection: {} as any,
      extensionUri: vscode.Uri.parse('file:///mock/extension'),
      globalStoragePath: '/mock/global-storage',
      logPath: '/mock/logs',
      extension: {} as any,
      languageModelAccessInformation: {} as any,
      storagePath: '/mock/storage',
      secrets: {} as any,
      extensionMode: vscode.ExtensionMode.Development,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Registration', () => {
    it('should register the evtx-viewer.openFile command', async () => {
      // This test will fail until the command is implemented
      const commands = await vscode.commands.getCommands();
      expect(commands).toContain('evtx-viewer.openFile');
    });

    it('should have command visible in command palette', async () => {
      // This test will fail until the command is properly configured
      const allCommands = await vscode.commands.getCommands(true);
      const evtxCommand = allCommands.find(cmd => cmd === 'evtx-viewer.openFile');
      expect(evtxCommand).toBeDefined();
    });
  });

  describe('File Selection Dialog', () => {
    it('should show open dialog with correct file filters when command is executed', async () => {
      // Mock dialog to return a file selection
      const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Execute the command - this will fail until implemented
      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockShowOpenDialog).toHaveBeenCalledWith({
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

    it('should handle user cancellation of file dialog gracefully', async () => {
      // Mock dialog to return undefined (user cancelled)
      mockShowOpenDialog.mockResolvedValue(undefined);

      // Execute the command - this should not show error
      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockShowErrorMessage).not.toHaveBeenCalled();
    });

    it('should validate selected file has .evtx extension', async () => {
      // Mock dialog to return non-evtx file
      const mockFileUri = vscode.Uri.file('/mock/path/test.txt');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Execute the command
      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Selected file is not a valid EVTX file. Please select a file with .evtx extension.'
      );
    });
  });

  describe('File Processing', () => {
    it('should verify file exists before attempting to open', async () => {
      // Mock dialog to return non-existent file
      const mockFileUri = vscode.Uri.file('/nonexistent/path/test.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock fs.access to throw error for non-existent file
      jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('File not found'));

      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Unable to access the selected file: /nonexistent/path/test.evtx'
      );
    });

    it('should check file is readable before opening', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock fs.access to succeed for existence but fail for readability
      jest.spyOn(fs.promises, 'access')
        .mockImplementation((path: fs.PathLike, mode?: number) => {
          if (mode === fs.constants.F_OK) {
            return Promise.resolve();
          }
          if (mode === fs.constants.R_OK) {
            return Promise.reject(new Error('Permission denied'));
          }
          return Promise.resolve();
        });

      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'File is not readable. Please check file permissions: /mock/path/test.evtx'
      );
    });

    it('should validate file size is reasonable for processing', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/huge.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock file system calls
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 5 * 1024 * 1024 * 1024, // 5GB file
        isFile: () => true,
      } as fs.Stats);

      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'File size (5.00 GB) exceeds maximum supported size of 2.00 GB. Please use a smaller file.'
      );
    });
  });

  describe('Webview Creation', () => {
    it('should create webview panel for valid EVTX file', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock successful file system calls
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024, // 1MB file
        isFile: () => true,
      } as fs.Stats);

      const mockWebviewPanel = {
        webview: {
          html: '',
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn(),
        },
        title: '',
        dispose: jest.fn(),
        reveal: jest.fn(),
      };

      mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel as any);

      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockCreateWebviewPanel).toHaveBeenCalledWith(
        'evtx-viewer.editor',
        'EVTX Viewer - test.evtx',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(mockExtensionContext.extensionPath, 'out', 'webview'))
          ]
        }
      );
    });

    it('should set correct webview title based on filename', async () => {
      const mockFileUri = vscode.Uri.file('/path/to/security-logs.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock successful file system calls
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      const mockWebviewPanel = {
        webview: { html: '', postMessage: jest.fn(), onDidReceiveMessage: jest.fn() },
        title: '',
        dispose: jest.fn(),
        reveal: jest.fn(),
      };

      mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel as any);

      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockCreateWebviewPanel).toHaveBeenCalledWith(
        expect.any(String),
        'EVTX Viewer - security-logs.evtx',
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock fs.access to throw unexpected error
      jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('Unexpected file system error'));

      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Failed to open EVTX file: Unexpected file system error'
      );
    });

    it('should handle webview creation errors', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock successful file system calls
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      // Mock webview creation to throw error
      mockCreateWebviewPanel.mockImplementation(() => {
        throw new Error('Failed to create webview panel');
      });

      await vscode.commands.executeCommand('evtx-viewer.openFile');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Failed to create EVTX viewer: Failed to create webview panel'
      );
    });
  });

  describe('Performance Requirements', () => {
    it('should complete file opening workflow within constitutional time limit (<100ms UI response)', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock successful file system calls
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      const mockWebviewPanel = {
        webview: { html: '', postMessage: jest.fn(), onDidReceiveMessage: jest.fn() },
        title: '',
        dispose: jest.fn(),
        reveal: jest.fn(),
      };
      mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel as any);

      const startTime = performance.now();
      await vscode.commands.executeCommand('evtx-viewer.openFile');
      const duration = performance.now() - startTime;

      // Constitutional requirement: UI response time <100ms
      expect(duration).toBeLessThan(100);
    });
  });
});