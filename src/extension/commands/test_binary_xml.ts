/**
 * EVTX Binary XML Test Command
 *
 * Diagnostic command to test Binary XML integration with real EVTX files
 * and report on field extraction improvements.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { EvtxParser } from '../../parsers/core/evtx_parser';
import { EventExtractor } from '../../parsers/core/event_extractor';
import { EvtxFile } from '../../parsers/models/evtx_file';

export class TestBinaryXmlCommand {
  private static readonly COMMAND_ID = 'evtx-viewer.testBinaryXml';

  constructor(private context: vscode.ExtensionContext) {}

  public register(): vscode.Disposable {
    return vscode.commands.registerCommand(
      TestBinaryXmlCommand.COMMAND_ID,
      this.execute.bind(this)
    );
  }

  private async execute(): Promise<void> {
    try {
      // Show file picker
      const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'EVTX Files': ['evtx'],
        },
        title: 'Select EVTX file to test Binary XML parsing',
      });

      if (!fileUris || fileUris.length === 0) {
        return;
      }

      const filePath = fileUris[0]!.fsPath;
      const fileName = path.basename(filePath);

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Testing Binary XML parsing on ${fileName}`,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 10, message: 'Loading EVTX file...' });

          // Parse EVTX file
          const evtxFile = new EvtxFile(filePath);
          const eventRecords = await EvtxParser.parseFile(evtxFile);

          progress.report({ increment: 40, message: 'Extracting without Binary XML...' });

          // Extract without Binary XML
          const normalResult = EventExtractor.extractBatch(eventRecords.slice(0, 100), {
            enableBinaryXml: false,
            includeRawXml: false,
          });

          progress.report({ increment: 30, message: 'Extracting with Binary XML...' });

          // Extract with Binary XML
          const enhancedResult = EventExtractor.extractBatch(eventRecords.slice(0, 100), {
            enableBinaryXml: true,
            includeBinaryXmlDebug: true,
            includeRawXml: false,
          });

          progress.report({ increment: 20, message: 'Analyzing results...' });

          // Compare results
          const results = this.compareExtractionResults(normalResult, enhancedResult, fileName);

          // Show results
          const panel = vscode.window.createWebviewPanel(
            'evtxBinaryXmlTest',
            `Binary XML Test Results - ${fileName}`,
            vscode.ViewColumn.One,
            {
              enableScripts: true,
              retainContextWhenHidden: true,
            }
          );

          panel.webview.html = this.getResultsHtml(results);
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Binary XML test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private compareExtractionResults(normalResult: any, enhancedResult: any, fileName: string) {
    const results = {
      fileName,
      normalCount: normalResult.data.length,
      enhancedCount: enhancedResult.data.length,
      normalWarnings: normalResult.statistics.warnings,
      enhancedWarnings: enhancedResult.statistics.warnings,
      fieldDifferences: [] as any[],
      enhancedFields: [] as any[],
      processingTimeDiff:
        enhancedResult.statistics.processingTime - normalResult.statistics.processingTime,
    };

    // Compare first few events to find field differences
    for (let i = 0; i < Math.min(5, normalResult.data.length, enhancedResult.data.length); i++) {
      const normalEvent = normalResult.data[i];
      const enhancedEvent = enhancedResult.data[i];

      const normalFields = normalEvent.eventData ? Object.keys(normalEvent.eventData) : [];
      const enhancedFields = enhancedEvent.eventData ? Object.keys(enhancedEvent.eventData) : [];

      const newFields = enhancedFields.filter((field) => !normalFields.includes(field));

      if (newFields.length > 0) {
        results.fieldDifferences.push({
          eventIndex: i,
          eventId: enhancedEvent.core.eventId,
          newFields: newFields.map((field) => ({
            name: field,
            value: enhancedEvent.eventData[field],
          })),
        });
      }

      // Check for fields with different values
      for (const field of normalFields) {
        if (enhancedFields.includes(field)) {
          const normalValue = normalEvent.eventData[field];
          const enhancedValue = enhancedEvent.eventData[field];

          if (JSON.stringify(normalValue) !== JSON.stringify(enhancedValue)) {
            results.enhancedFields.push({
              eventIndex: i,
              eventId: enhancedEvent.core.eventId,
              field,
              normalValue,
              enhancedValue,
            });
          }
        }
      }
    }

    return results;
  }

  private getResultsHtml(results: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Binary XML Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        .card { border: 1px solid #dee2e6; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .field-diff { background-color: #f8f9fa; padding: 10px; margin: 5px 0; border-left: 4px solid #28a745; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #dee2e6; padding: 8px; text-align: left; }
        th { background-color: #f8f9fa; }
        pre { background-color: #f8f9fa; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>🔥 Binary XML Integration Test Results</h1>
    <h2>File: ${results.fileName}</h2>

    <div class="card">
        <h3>📊 Extraction Summary</h3>
        <table>
            <tr><th>Metric</th><th>Without Binary XML</th><th>With Binary XML</th><th>Improvement</th></tr>
            <tr>
                <td>Events Processed</td>
                <td>${results.normalCount}</td>
                <td>${results.enhancedCount}</td>
                <td>${results.enhancedCount === results.normalCount ? '✅ Same' : '⚠️ Different'}</td>
            </tr>
            <tr>
                <td>Warnings/Enhancements</td>
                <td>${results.normalWarnings}</td>
                <td class="success">${results.enhancedWarnings}</td>
                <td class="success">+${results.enhancedWarnings - results.normalWarnings} enhanced</td>
            </tr>
            <tr>
                <td>Processing Time</td>
                <td>-</td>
                <td>+${results.processingTimeDiff}ms</td>
                <td>${results.processingTimeDiff < 100 ? '✅ Acceptable' : '⚠️ Slow'}</td>
            </tr>
        </table>
    </div>

    ${
      results.fieldDifferences.length > 0
        ? `
    <div class="card">
        <h3 class="success">🎉 New Fields Discovered (Previously Missing)</h3>
        <p>These fields were extracted by Binary XML parsing but missed by regular parsing:</p>
        ${results.fieldDifferences
          .map(
            (diff: any) => `
            <h4>Event ID: ${diff.eventId}</h4>
            <h5>New Fields Found:</h5>
            <ul>
                ${diff.newFields
                  .map(
                    (field: any) => `
                    <li><strong>${field.name}:</strong> ${field.value}</li>
                `
                  )
                  .join('')}
            </ul>
        `
          )
          .join('')}
    </div>
    `
        : `
    <div class="card">
        <h3 class="warning">⚠️ No New Fields Found</h3>
        <p>Binary XML parsing didn't discover additional fields in the tested events. This could mean:</p>
        <ul>
            <li>The EVTX file doesn't contain Binary XML records</li>
            <li>The events tested don't have complex Binary XML structures</li>
            <li>All fields were already being extracted correctly</li>
        </ul>
    </div>
    `
    }

    ${
      results.enhancedFields.length > 0
        ? `
    <div class="card">
        <h3 class="info">🔧 Enhanced Field Values</h3>
        <p>These fields had different values when processed with Binary XML:</p>
        ${results.enhancedFields
          .map(
            (field: any) => `
            <div class="field-diff">
                <strong>Event ${field.eventIndex + 1} (ID: ${field.eventId}) - ${field.field}</strong><br>
                Normal: <code>${JSON.stringify(field.normalValue)}</code><br>
                Enhanced: <code>${JSON.stringify(field.enhancedValue)}</code>
            </div>
        `
          )
          .join('')}
    </div>
    `
        : ''
    }

    <div class="card">
        <h3>🎯 Recommendations</h3>
        ${
          results.enhancedWarnings > results.normalWarnings
            ? `
            <p class="success">✅ Binary XML integration is working! ${results.enhancedWarnings - results.normalWarnings} events were enhanced.</p>
        `
            : `
            <p class="warning">⚠️ Limited Binary XML enhancement detected. Try testing with:</p>
            <ul>
                <li>System event logs (System.evtx)</li>
                <li>Security event logs (Security.evtx)</li>
                <li>Application event logs with complex EventData</li>
                <li>Event logs from Windows Server systems</li>
            </ul>
        `
        }
        
        <p><strong>Binary XML integration is now enabled by default in the EVTX Viewer.</strong></p>
    </div>
</body>
</html>`;
  }
}
