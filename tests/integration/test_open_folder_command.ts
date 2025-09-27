/**
 * Integration Tests for EVTX: Open Folder Command
 * 
 * TDD Approach: These tests MUST FAIL initially before implementation
 * Tests VS Code command for opening folders containing EVTX files
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';

describe('EVTX: Open Folder Command Integration Tests', () => {
  let mockShowOpenDialog: jest.MockedFunction<typeof vscode.window.showOpenDialog>;
  let mockShowErrorMessage: jest.MockedFunction<typeof vscode.window.showErrorMessage>;
  let mockShowInformationMessage: jest.MockedFunction<typeof vscode.window.showInformationMessage>;
  let mockCreateWebviewPanel: jest.MockedFunction<typeof vscode.window.createWebviewPanel>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockShowOpenDialog = vscode.window.showOpenDialog as jest.MockedFunction<typeof vscode.window.showOpenDialog>;
    mockShowErrorMessage = vscode.window.showErrorMessage as jest.MockedFunction<typeof vscode.window.showErrorMessage>;
    mockShowInformationMessage = vscode.window.showInformationMessage as jest.MockedFunction<typeof vscode.window.showInformationMessage>;
    mockCreateWebviewPanel = vscode.window.createWebviewPanel as jest.MockedFunction<typeof vscode.window.createWebviewPanel>;
  });

  describe('Command Registration', () => {
    it('should register the evtx-viewer.openFolder command', async () => {
      const commands = await vscode.commands.getCommands();
      expect(commands).toContain('evtx-viewer.openFolder');
    });
  });

  describe('Folder Selection Dialog', () => {
    it('should show open dialog for folder selection', async () => {
      const mockFolderUri = vscode.Uri.file('/mock/folder/path');
      mockShowOpenDialog.mockResolvedValue([mockFolderUri]);

      await vscode.commands.executeCommand('evtx-viewer.openFolder');

      expect(mockShowOpenDialog).toHaveBeenCalledWith({
        canSelectMany: false,
        canSelectFolders: true,
        canSelectFiles: false,
        openLabel: 'Select Folder with EVTX Files'
      });
    });

    it('should handle user cancellation gracefully', async () => {
      mockShowOpenDialog.mockResolvedValue(undefined);

      await vscode.commands.executeCommand('evtx-viewer.openFolder');

      expect(mockShowErrorMessage).not.toHaveBeenCalled();
    });
  });

  describe('Folder Processing', () => {
    it('should scan folder for .evtx files recursively', async () => {
      const mockFolderUri = vscode.Uri.file('/mock/folder');
      mockShowOpenDialog.mockResolvedValue([mockFolderUri]);

      // Mock directory structure with EVTX files
      const mockFiles = [
        '/mock/folder/system.evtx',
        '/mock/folder/application.evtx',
        '/mock/folder/security.evtx',
        '/mock/folder/subfolder/setup.evtx'
      ];

      jest.spyOn(fs.promises, 'readdir').mockImplementation(async (dirPath: any) => {
        if (dirPath === '/mock/folder') {
          return [
            { name: 'system.evtx', isFile: () => true, isDirectory: () => false },
            { name: 'application.evtx', isFile: () => true, isDirectory: () => false },
            { name: 'security.evtx', isFile: () => true, isDirectory: () => false },
            { name: 'subfolder', isFile: () => false, isDirectory: () => true },
            { name: 'readme.txt', isFile: () => true, isDirectory: () => false }
          ] as any;
        }
        if (dirPath.includes('subfolder')) {
          return [
            { name: 'setup.evtx', isFile: () => true, isDirectory: () => false }
          ] as any;
        }
        return [];
      });

      await vscode.commands.executeCommand('evtx-viewer.openFolder');

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'Found 4 EVTX files in the selected folder. Opening combined view...'
      );
    });

    it('should handle empty folder appropriately', async () => {
      const mockFolderUri = vscode.Uri.file('/mock/empty-folder');
      mockShowOpenDialog.mockResolvedValue([mockFolderUri]);

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue([] as any);

      await vscode.commands.executeCommand('evtx-viewer.openFolder');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'No EVTX files found in the selected folder: /mock/empty-folder'
      );
    });

    it('should validate folder accessibility', async () => {
      const mockFolderUri = vscode.Uri.file('/mock/inaccessible-folder');
      mockShowOpenDialog.mockResolvedValue([mockFolderUri]);

      jest.spyOn(fs.promises, 'readdir').mockRejectedValue(new Error('Permission denied'));

      await vscode.commands.executeCommand('evtx-viewer.openFolder');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Unable to access folder: Permission denied'
      );
    });

    it('should limit number of files processed for performance', async () => {
      const mockFolderUri = vscode.Uri.file('/mock/large-folder');
      mockShowOpenDialog.mockResolvedValue([mockFolderUri]);

      // Mock folder with 150 EVTX files (exceeds limit of 100)
      const mockFiles = Array.from({ length: 150 }, (_, i) => ({
        name: `file${i}.evtx`,
        isFile: () => true,
        isDirectory: () => false
      }));

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles as any);

      await vscode.commands.executeCommand('evtx-viewer.openFolder');

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Found 150 EVTX files. Processing first 100 files for performance')
      );
    });
  });

  describe('Webview Creation for Multiple Files', () => {
    it('should create webview panel for multiple EVTX files', async () => {
      const mockFolderUri = vscode.Uri.file('/mock/folder');
      mockShowOpenDialog.mockResolvedValue([mockFolderUri]);

      const mockFiles = [
        { name: 'system.evtx', isFile: () => true, isDirectory: () => false },
        { name: 'application.evtx', isFile: () => true, isDirectory: () => false }
      ];

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles as any);

      const mockWebviewPanel = {
        webview: { html: '', postMessage: jest.fn(), onDidReceiveMessage: jest.fn() },
        title: '',
        dispose: jest.fn(),
        reveal: jest.fn(),
      };

      mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel as any);

      await vscode.commands.executeCommand('evtx-viewer.openFolder');

      expect(mockCreateWebviewPanel).toHaveBeenCalledWith(
        'evtx-viewer.editor',
        'EVTX Viewer - Multiple Files (2 files)',
        vscode.ViewColumn.One,
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: true
        })
      );
    });

    it('should include folder name in webview title', async () => {
      const mockFolderUri = vscode.Uri.file('/system/logs/windows-events');
      mockShowOpenDialog.mockResolvedValue([mockFolderUri]);

      const mockFiles = [
        { name: 'system.evtx', isFile: () => true, isDirectory: () => false }
      ];

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles as any);

      const mockWebviewPanel = {
        webview: { html: '', postMessage: jest.fn(), onDidReceiveMessage: jest.fn() },
        title: '',
        dispose: jest.fn(),
        reveal: jest.fn(),
      };

      mockCreateWebviewPanel.mockReturnValue(mockWebviewPanel as any);

      await vscode.commands.executeCommand('evtx-viewer.openFolder');

      expect(mockCreateWebviewPanel).toHaveBeenCalledWith(
        expect.any(String),
        'EVTX Viewer - windows-events (1 file)',
        expect.any(Number),
        expect.any(Object)
      );
    });
  });

  describe('Performance Requirements', () => {
    it('should complete folder scanning within reasonable time for large directories', async () => {
      const mockFolderUri = vscode.Uri.file('/mock/large-folder');
      mockShowOpenDialog.mockResolvedValue([mockFolderUri]);

      // Mock folder with many files
      const mockFiles = Array.from({ length: 50 }, (_, i) => ({
        name: `file${i}.evtx`,
        isFile: () => true,
        isDirectory: () => false
      }));

      jest.spyOn(fs.promises, 'readdir').mockResolvedValue(mockFiles as any);

      const startTime = performance.now();
      await vscode.commands.executeCommand('evtx-viewer.openFolder');
      const duration = performance.now() - startTime;

      // Should complete folder scanning quickly
      expect(duration).toBeLessThan(1000); // 1 second for folder scanning
    });
  });
});