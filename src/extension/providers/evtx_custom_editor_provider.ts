/**
 * EVTX Custom Editor Provider
 * 
 * Implements VS Code's CustomReadonlyEditorProvider interface to handle .evtx files automatically
 * when they are opened in the editor. This enables seamless integration where clicking
 * on an .evtx file directly opens it in the EVTX Viewer.
 */

import * as vscode from 'vscode';
import { EvtxWebviewProvider } from './evtx_webview_provider';

export class EvtxCustomEditorProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'evtx-viewer.editor';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly webviewProvider: EvtxWebviewProvider
  ) {}

  /**
   * Called when a custom editor is opened.
   */
  public async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.CustomDocument> {
    console.log(`Opening EVTX document: ${uri.fsPath}`);
    
    return {
      uri,
      dispose: () => {
        console.log(`Disposing EVTX document: ${uri.fsPath}`);
      }
    };
  }

  /**
   * Called to resolve the editor for a custom document
   */
  public async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    console.log(`Resolving EVTX custom editor for: ${document.uri.fsPath}`);

    // Configure webview options to match the working command exactly
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
        vscode.Uri.joinPath(this.context.extensionUri, 'resources')
      ]
    };

    // Set the webview title
    webviewPanel.title = `EVTX Viewer - ${document.uri.path.split('/').pop()}`;

    try {
      console.log(`Starting webview initialization...`);
      
      // Use the exact same call as the working command
      await this.webviewProvider.initializeWebview(webviewPanel, [document.uri]);
      
      console.log(`initializeWebview completed, now making webview active...`);
      
      // Try to make the webview active/visible - this might be the difference
      webviewPanel.reveal();
      
      // Add a small delay to let the webview settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`Successfully opened EVTX file in custom editor: ${document.uri.fsPath}`);
    } catch (error) {
      console.error(`Failed to open EVTX file in custom editor:`, error);
      
      webviewPanel.webview.html = `<h1>Error: ${error}</h1>`;
    }
  }
}