// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * VS Code "Add File to Current View" Command Implementation
 * Handles adding additional EVTX files to an existing webview
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EvtxWebviewProvider } from '../providers/evtx_webview_provider';

export class AddFileCommand {
  private static readonly COMMAND_ID = 'evtx-viewer.addFile';

  constructor(
    private context: vscode.ExtensionContext,
    private webviewProvider: EvtxWebviewProvider
  ) {}

  /**
   * Register the add file command
   */
  public register(): vscode.Disposable {
    return vscode.commands.registerCommand(AddFileCommand.COMMAND_ID, this.execute.bind(this));
  }

  /**
   * Execute the add file command
   */
  private async execute(): Promise<void> {
    try {
      // Check if there's an active EVTX viewer
      const activePanel = this.getActiveEvtxPanel();
      if (!activePanel) {
        vscode.window.showErrorMessage(
          'No active EVTX viewer found. Please open a file or folder first.'
        );
        return;
      }

      // Show file selection dialog
      const fileUris = await this.showOpenDialog();
      if (!fileUris || fileUris.length === 0) {
        // User cancelled the dialog
        return;
      }

      // Show progress for multiple files
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Adding ${fileUris.length} EVTX file${fileUris.length > 1 ? 's' : ''}`,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Validating files...' });

          // Validate selected files
          const validFiles = await this.validateFiles(fileUris);
          if (validFiles.length === 0) {
            throw new Error('No valid EVTX files to add');
          }

          progress.report({
            message: `Adding ${validFiles.length} file${validFiles.length > 1 ? 's' : ''} to viewer...`,
            increment: 50,
          });

          // Add files to current view
          await this.addFilesToWebview(activePanel, validFiles);

          progress.report({ message: 'Files added successfully', increment: 50 });
        }
      );

      // Show success message
      const validFiles = await this.validateFiles(fileUris);
      const fileCount = validFiles.length;
      const message =
        fileCount === 1 && validFiles[0]
          ? `Added ${path.basename(validFiles[0].fsPath)} to current view`
          : `Added ${fileCount} files to current view`;

      vscode.window.showInformationMessage(message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Webview disposed')) {
        vscode.window.showErrorMessage('Failed to add files to viewer: Webview disposed');
      } else if (errorMessage.includes('Permission denied')) {
        vscode.window.showErrorMessage('Failed to add file: Permission denied');
      } else {
        vscode.window.showErrorMessage(`Failed to add files: ${errorMessage}`);
      }
    }
  }

  /**
   * Get the active EVTX webview panel
   */
  private getActiveEvtxPanel(): vscode.WebviewPanel | undefined {
    return this.webviewProvider.getActiveEvtxPanel();
  }

  /**
   * Show file selection dialog for adding files
   */
  private async showOpenDialog(): Promise<vscode.Uri[] | undefined> {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: true, // Allow multiple file selection
      canSelectFiles: true,
      canSelectFolders: false,
      openLabel: 'Add EVTX Files',
      filters: {
        'EVTX Files': ['evtx'],
        'All Files': ['*'],
      },
    };

    const result = await vscode.window.showOpenDialog(options);
    return result;
  }

  /**
   * Validate selected files
   */
  private async validateFiles(fileUris: vscode.Uri[]): Promise<vscode.Uri[]> {
    const validFiles: vscode.Uri[] = [];

    for (const fileUri of fileUris) {
      try {
        await this.validateSingleFile(fileUri);
        validFiles.push(fileUri);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showWarningMessage(
          `Skipping ${path.basename(fileUri.fsPath)}: ${errorMessage}`
        );
      }
    }

    return validFiles;
  }

  /**
   * Validate a single file
   */
  private async validateSingleFile(fileUri: vscode.Uri): Promise<void> {
    const filePath = fileUri.fsPath;

    // Check file extension
    if (!filePath.toLowerCase().endsWith('.evtx')) {
      throw new Error('File must have .evtx extension');
    }

    // Check if file exists and is readable
    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }

      // Test file accessibility
      const handle = await fs.open(filePath, 'r');
      await handle.close();
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        switch ((error as any).code) {
          case 'ENOENT':
            throw new Error('File not found');
          case 'EACCES':
            throw new Error('Permission denied');
          case 'EISDIR':
            throw new Error('Path is a directory, not a file');
          default:
            throw new Error(`File access error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  /**
   * Add files to existing webview
   */
  private async addFilesToWebview(
    panel: vscode.WebviewPanel,
    newFiles: vscode.Uri[]
  ): Promise<void> {
    // Get current files for this panel
    const currentFiles = this.webviewProvider.getFilesForPanel(panel);

    // Filter out duplicate files
    const uniqueNewFiles = newFiles.filter(
      (newFile: vscode.Uri) =>
        !currentFiles.some((existing: vscode.Uri) => existing.fsPath === newFile.fsPath)
    );

    if (uniqueNewFiles.length === 0) {
      vscode.window.showInformationMessage('All selected files are already loaded in the viewer');
      return;
    }

    // Combine files
    const allFiles = [...currentFiles, ...uniqueNewFiles];

    // Update tracking
    this.webviewProvider.updateFilesForPanel(panel, allFiles);

    // Update panel title
    const fileCount = allFiles.length;
    const newTitle =
      fileCount === 1 && allFiles[0]
        ? `EVTX Viewer - ${path.basename(allFiles[0].fsPath)}`
        : `EVTX Viewer - Multiple Files (${fileCount} files)`;

    panel.title = newTitle;

    // Reinitialize webview with all files
    await this.webviewProvider.initializeWebview(panel, allFiles);

    // Send update message to webview
    try {
      await panel.webview.postMessage({
        command: 'filesAdded',
        newFiles: uniqueNewFiles.map((uri) => ({
          path: uri.fsPath,
          name: path.basename(uri.fsPath),
        })),
        totalFiles: allFiles.length,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('disposed')) {
        throw new Error('Webview disposed');
      }
      throw error;
    }
  }

  /**
   * Get command ID for registration
   */
  public static getCommandId(): string {
    return AddFileCommand.COMMAND_ID;
  }
}
