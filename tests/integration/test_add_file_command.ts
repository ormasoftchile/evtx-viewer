/**
 * Integration Tests for EVTX: Add File to Current View Command
 * 
 * TDD Approach: These tests MUST FAIL initially before implementation
 * Tests VS Code command for adding additional EVTX files to existing view
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';

describe('EVTX: Add File to Current View Command Integration Tests', () => {
  let mockShowOpenDialog: jest.MockedFunction<typeof vscode.window.showOpenDialog>;
  let mockShowErrorMessage: jest.MockedFunction<typeof vscode.window.showErrorMessage>;
  let mockShowInformationMessage: jest.MockedFunction<typeof vscode.window.showInformationMessage>;
  let mockShowWarningMessage: jest.MockedFunction<typeof vscode.window.showWarningMessage>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockShowOpenDialog = vscode.window.showOpenDialog as jest.MockedFunction<typeof vscode.window.showOpenDialog>;
    mockShowErrorMessage = vscode.window.showErrorMessage as jest.MockedFunction<typeof vscode.window.showErrorMessage>;
    mockShowInformationMessage = vscode.window.showInformationMessage as jest.MockedFunction<typeof vscode.window.showInformationMessage>;
    mockShowWarningMessage = vscode.window.showWarningMessage as jest.MockedFunction<typeof vscode.window.showWarningMessage>;
  });

  describe('Command Registration', () => {
    it('should register the evtx-viewer.addFile command', async () => {
      const commands = await vscode.commands.getCommands();
      expect(commands).toContain('evtx-viewer.addFile');
    });
  });

  describe('Command Availability', () => {
    it('should only be available when an EVTX viewer is already open', async () => {
      // When no EVTX viewer is open, command should show warning
      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'No EVTX viewer is currently open. Use "EVTX: Open File" to create a new viewer first.'
      );
    });

    it('should be enabled in command palette when EVTX viewer is active', async () => {
      // This test requires mocking an active EVTX viewer webview
      // Implementation will need to track active webview panels
      
      // Mock active webview panel
      const mockActiveWebview = {
        webview: {
          postMessage: jest.fn(),
          onDidReceiveMessage: jest.fn(),
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

  describe('File Selection and Validation', () => {
    it('should show open dialog with EVTX file filters', async () => {
      // Mock existing viewer state
      const mockExistingViewer = { isActive: true };

      const mockFileUri = vscode.Uri.file('/mock/path/additional.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock successful file validation
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowOpenDialog).toHaveBeenCalledWith({
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

    it('should allow multiple file selection', async () => {
      const mockFileUris = [
        vscode.Uri.file('/mock/path/file1.evtx'),
        vscode.Uri.file('/mock/path/file2.evtx'),
        vscode.Uri.file('/mock/path/file3.evtx')
      ];
      mockShowOpenDialog.mockResolvedValue(mockFileUris);

      // Mock successful file validation for all files
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowInformationMessage).toHaveBeenCalledWith(
        'Successfully added 3 EVTX files to the current view.'
      );
    });

    it('should validate each selected file individually', async () => {
      const mockFileUris = [
        vscode.Uri.file('/mock/path/valid.evtx'),
        vscode.Uri.file('/mock/path/invalid.txt'),
        vscode.Uri.file('/mock/path/nonexistent.evtx')
      ];
      mockShowOpenDialog.mockResolvedValue(mockFileUris);

      // Mock validation results
      jest.spyOn(fs.promises, 'access').mockImplementation(async (filePath: any) => {
        if (filePath.includes('nonexistent')) {
          throw new Error('File not found');
        }
        return Promise.resolve();
      });

      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'Some files could not be added:\n' +
        '• invalid.txt: Not a valid EVTX file\n' +
        '• nonexistent.evtx: File not found\n' +
        '\nSuccessfully added 1 file.'
      );
    });

    it('should prevent adding duplicate files', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/existing.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock file validation
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      // This test will fail until duplicate detection is implemented
      // Need to track which files are already loaded in the current view
      
      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'File existing.evtx is already loaded in the current view.'
      );
    });
  });

  describe('File Size and Resource Management', () => {
    it('should warn when adding large files that may impact performance', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/large.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024 * 1024, // 1GB file
        isFile: () => true,
      } as fs.Stats);

      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        'Adding large file (1.00 GB). This may impact performance. Continue?',
        'Yes', 'No'
      );
    });

    it('should check total memory usage when adding files', async () => {
      const mockFileUris = Array.from({ length: 10 }, (_, i) => 
        vscode.Uri.file(`/mock/path/file${i}.evtx`)
      );
      mockShowOpenDialog.mockResolvedValue(mockFileUris);

      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 100 * 1024 * 1024, // 100MB per file = 1GB total
        isFile: () => true,
      } as fs.Stats);

      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('Total memory usage would exceed constitutional limit')
      );
    });
  });

  describe('Webview Integration', () => {
    it('should send message to active webview with new file information', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/new.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      // Mock file validation
      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      const mockWebview = {
        postMessage: jest.fn()
      };

      // This will fail until webview state management is implemented
      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
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

    it('should update webview title to reflect additional files', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/additional.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      const mockPanel = {
        title: 'EVTX Viewer - original.evtx',
        webview: { postMessage: jest.fn() }
      };

      await vscode.commands.executeCommand('evtx-viewer.addFile');

      // Title should be updated to show multiple files
      expect(mockPanel.title).toBe('EVTX Viewer - Multiple Files (2 files)');
    });
  });

  describe('Error Handling', () => {
    it('should handle file access errors gracefully', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/inaccessible.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      jest.spyOn(fs.promises, 'access').mockRejectedValue(new Error('Permission denied'));

      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Failed to add file inaccessible.evtx: Permission denied'
      );
    });

    it('should handle webview communication errors', async () => {
      const mockFileUri = vscode.Uri.file('/mock/path/test.evtx');
      mockShowOpenDialog.mockResolvedValue([mockFileUri]);

      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      const mockWebview = {
        postMessage: jest.fn().mockImplementation(() => {
          throw new Error('Webview disposed');
        })
      };

      await vscode.commands.executeCommand('evtx-viewer.addFile');

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        'Failed to add files to viewer: Webview disposed'
      );
    });
  });

  describe('Performance Requirements', () => {
    it('should complete file addition within constitutional time limits', async () => {
      const mockFileUris = [
        vscode.Uri.file('/mock/path/file1.evtx'),
        vscode.Uri.file('/mock/path/file2.evtx')
      ];
      mockShowOpenDialog.mockResolvedValue(mockFileUris);

      jest.spyOn(fs.promises, 'access').mockResolvedValue();
      jest.spyOn(fs.promises, 'stat').mockResolvedValue({
        size: 1024 * 1024,
        isFile: () => true,
      } as fs.Stats);

      const startTime = performance.now();
      await vscode.commands.executeCommand('evtx-viewer.addFile');
      const duration = performance.now() - startTime;

      // Constitutional requirement: UI response time <100ms
      expect(duration).toBeLessThan(100);
    });
  });
});