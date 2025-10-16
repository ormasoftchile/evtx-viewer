// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * VS Code "Open Folder" Command Implementation
 * Handles opening folders and scanning for EVTX files
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EvtxWebviewProvider } from '../providers/evtx_webview_provider';

export class OpenFolderCommand {
  private static readonly COMMAND_ID = 'evtx-viewer.openFolder';
  private static readonly MAX_FILES = 100; // Constitutional performance limit

  constructor(
    private context: vscode.ExtensionContext,
    private webviewProvider: EvtxWebviewProvider
  ) {}

  /**
   * Register the open folder command
   */
  public register(): vscode.Disposable {
    return vscode.commands.registerCommand(OpenFolderCommand.COMMAND_ID, this.execute.bind(this));
  }

  /**
   * Execute the open folder command
   */
  private async execute(): Promise<void> {
    try {
      // Show folder selection dialog
      const folderUri = await this.showOpenDialog();
      if (!folderUri) {
        // User cancelled the dialog
        return;
      }

      // Scan folder for EVTX files
      const evtxFiles = await this.scanFolderForEvtxFiles(folderUri);

      if (evtxFiles.length === 0) {
        vscode.window.showErrorMessage(
          `No EVTX files found in the selected folder: ${folderUri.fsPath}`
        );
        return;
      }

      // Handle file count limits
      const filesToProcess = await this.handleFileCountLimits(evtxFiles);
      if (filesToProcess.length === 0) {
        return; // User cancelled
      }

      // Create webview for multiple files
      await this.createWebviewForFolder(folderUri, filesToProcess);

      // Show success message
      vscode.window.showInformationMessage(
        `Found ${evtxFiles.length} EVTX files in the selected folder. Opening combined view...`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Permission denied') || errorMessage.includes('EACCES')) {
        vscode.window.showErrorMessage('Unable to access folder: Permission denied');
      } else {
        vscode.window.showErrorMessage(`Failed to open folder: ${errorMessage}`);
      }
    }
  }

  /**
   * Show folder selection dialog
   */
  private async showOpenDialog(): Promise<vscode.Uri | undefined> {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      canSelectFiles: false,
      canSelectFolders: true,
      openLabel: 'Select Folder with EVTX Files',
    };

    const result = await vscode.window.showOpenDialog(options);
    return result?.[0];
  }

  /**
   * Scan folder recursively for EVTX files
   */
  private async scanFolderForEvtxFiles(folderUri: vscode.Uri): Promise<vscode.Uri[]> {
    const evtxFiles: vscode.Uri[] = [];

    try {
      await this.scanDirectoryRecursive(folderUri.fsPath, evtxFiles);
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        switch ((error as any).code) {
          case 'EACCES':
            throw new Error('Permission denied - cannot access folder');
          case 'ENOENT':
            throw new Error('Folder not found');
          default:
            throw new Error(`Folder access error: ${error.message}`);
        }
      }
      throw error;
    }

    return evtxFiles;
  }

  /**
   * Recursively scan directory for EVTX files
   */
  private async scanDirectoryRecursive(dirPath: string, evtxFiles: vscode.Uri[]): Promise<void> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        await this.scanDirectoryRecursive(fullPath, evtxFiles);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.evtx')) {
        evtxFiles.push(vscode.Uri.file(fullPath));
      }
    }
  }

  /**
   * Handle file count limits and user confirmation
   */
  private async handleFileCountLimits(evtxFiles: vscode.Uri[]): Promise<vscode.Uri[]> {
    if (evtxFiles.length > OpenFolderCommand.MAX_FILES) {
      const response = await vscode.window.showInformationMessage(
        `Found ${evtxFiles.length} EVTX files. Processing first ${OpenFolderCommand.MAX_FILES} files for performance`,
        'OK',
        'Cancel'
      );

      if (response !== 'OK') {
        return [];
      }

      return evtxFiles.slice(0, OpenFolderCommand.MAX_FILES);
    }

    return evtxFiles;
  }

  /**
   * Create webview panel for multiple files
   */
  private async createWebviewForFolder(
    folderUri: vscode.Uri,
    fileUris: vscode.Uri[]
  ): Promise<void> {
    const folderName = path.basename(folderUri.fsPath);
    const fileCount = fileUris.length;
    const title =
      fileCount === 1
        ? `EVTX Viewer - ${folderName} (1 file)`
        : `EVTX Viewer - ${folderName} (${fileCount} files)`;

    // Create webview panel
    const panel = vscode.window.createWebviewPanel(
      'evtx-viewer.editor',
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'out'),
          vscode.Uri.joinPath(this.context.extensionUri, 'resources'),
        ],
      }
    );

    // Initialize webview with files
    await this.webviewProvider.initializeWebview(panel, fileUris);
  }

  /**
   * Get command ID for registration
   */
  public static getCommandId(): string {
    return OpenFolderCommand.COMMAND_ID;
  }
}
