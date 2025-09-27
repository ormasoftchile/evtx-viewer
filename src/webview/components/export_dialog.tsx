/**
 * Export Dialog Component
 *
 * Modal dialog for configuring and initiating event log exports.
 * Part of Phase 3.4 Webview UI Components - T030
 *
 * Constitutional Performance Requirements:
 * - Fast export format selection
 * - Efficient filter application preview
 * - Memory-aware batch processing indicators
 */

import React, { useState, useEffect } from 'react';

/**
 * Supported export formats
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  TSV = 'tsv',
}

/**
 * Export configuration request
 */
export interface ExportRequest {
  /**
   * Export format
   */
  format: ExportFormat;

  /**
   * Output file path
   */
  filePath?: string;

  /**
   * Include filtered events only
   */
  applyCurrentFilter: boolean;

  /**
   * Field selection for export
   */
  includeFields: {
    timestamp: boolean;
    eventId: boolean;
    level: boolean;
    provider: boolean;
    channel: boolean;
    computer: boolean;
    message: boolean;
    eventData: boolean;
    xml: boolean;
  };

  /**
   * Export range options
   */
  range?: {
    startIndex?: number;
    endIndex?: number;
    maxEvents?: number;
  };

  /**
   * Batch processing size for large exports
   */
  batchSize?: number;
}

interface ExportDialogProps {
  /**
   * Whether dialog is visible
   */
  isOpen: boolean;

  /**
   * Total number of events available
   */
  totalEvents: number;

  /**
   * Number of events after current filter
   */
  filteredEvents: number;

  /**
   * Whether a filter is currently applied
   */
  hasActiveFilter: boolean;

  /**
   * Callback when export is requested
   */
  onExport: (request: ExportRequest) => void;

  /**
   * Callback when dialog is cancelled
   */
  onCancel: () => void;
}

/**
 * Default field selection
 */
const DEFAULT_FIELDS = {
  timestamp: true,
  eventId: true,
  level: true,
  provider: true,
  channel: true,
  computer: true,
  message: true,
  eventData: false,
  xml: false,
};

/**
 * Export dialog component
 */
export function ExportDialog({
  isOpen,
  totalEvents,
  filteredEvents,
  hasActiveFilter,
  onExport,
  onCancel,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.CSV);
  const [applyFilter, setApplyFilter] = useState(hasActiveFilter);
  const [includeFields, setIncludeFields] = useState(DEFAULT_FIELDS);
  const [exportRange, setExportRange] = useState<'all' | 'range'>('all');
  const [startIndex, setStartIndex] = useState<string>('1');
  const [endIndex, setEndIndex] = useState<string>('');
  const [maxEvents, setMaxEvents] = useState<string>('');
  const [batchSize, setBatchSize] = useState<string>('1000');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setApplyFilter(hasActiveFilter);
      setIncludeFields(DEFAULT_FIELDS);
      setExportRange('all');
      setStartIndex('1');
      setEndIndex('');
      setMaxEvents('');
      setBatchSize('1000');
    }
  }, [isOpen, hasActiveFilter]);

  if (!isOpen) {
    return null;
  }

  const eventsToExport = applyFilter ? filteredEvents : totalEvents;

  const handleFieldToggle = (field: keyof typeof includeFields) => {
    setIncludeFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleExport = () => {
    const request: ExportRequest = {
      format,
      applyCurrentFilter: applyFilter,
      includeFields,
      batchSize: parseInt(batchSize) || 1000,
    };

    if (exportRange === 'range') {
      const start = parseInt(startIndex) || 1;
      const end = endIndex ? parseInt(endIndex) : undefined;
      const max = maxEvents ? parseInt(maxEvents) : undefined;

      request.range = {
        startIndex: start - 1, // Convert to 0-based index
      };

      if (end !== undefined) {
        request.range.endIndex = end - 1;
      }

      if (max !== undefined) {
        request.range.maxEvents = max;
      }
    }

    onExport(request);
  };

  const isExportDisabled = Object.values(includeFields).every((v) => !v);

  return (
    <div className="export-dialog-overlay">
      <div className="export-dialog">
        <div className="export-dialog-header">
          <h3>Export Events</h3>
          <button className="export-dialog-close" onClick={onCancel} aria-label="Close dialog">
            ×
          </button>
        </div>

        <div className="export-dialog-content">
          {/* Export Format Selection */}
          <div className="export-section">
            <h4>Export Format</h4>
            <div className="format-options">
              {Object.values(ExportFormat).map((fmt) => (
                <label key={fmt} className="format-option">
                  <input
                    type="radio"
                    name="format"
                    value={fmt}
                    checked={format === fmt}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                  />
                  <span className="format-label">{fmt.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filter Application */}
          <div className="export-section">
            <h4>Event Selection</h4>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={applyFilter}
                onChange={(e) => setApplyFilter(e.target.checked)}
                disabled={!hasActiveFilter}
              />
              <span>
                Apply current filter
                {hasActiveFilter && (
                  <span className="event-count">
                    ({filteredEvents.toLocaleString()} of {totalEvents.toLocaleString()} events)
                  </span>
                )}
                {!hasActiveFilter && <span className="disabled-note">(no filter active)</span>}
              </span>
            </label>

            <div className="export-summary">
              <strong>Events to export: {eventsToExport.toLocaleString()}</strong>
            </div>
          </div>

          {/* Range Selection */}
          <div className="export-section">
            <h4>Export Range</h4>
            <label className="radio-option">
              <input
                type="radio"
                name="range"
                value="all"
                checked={exportRange === 'all'}
                onChange={() => setExportRange('all')}
              />
              <span>Export all events</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="range"
                value="range"
                checked={exportRange === 'range'}
                onChange={() => setExportRange('range')}
              />
              <span>Export range</span>
            </label>

            {exportRange === 'range' && (
              <div className="range-inputs">
                <div className="range-input-group">
                  <label>Start Index:</label>
                  <input
                    type="number"
                    min="1"
                    max={eventsToExport}
                    value={startIndex}
                    onChange={(e) => setStartIndex(e.target.value)}
                  />
                </div>
                <div className="range-input-group">
                  <label>End Index (optional):</label>
                  <input
                    type="number"
                    min="1"
                    max={eventsToExport}
                    value={endIndex}
                    onChange={(e) => setEndIndex(e.target.value)}
                    placeholder="End of data"
                  />
                </div>
                <div className="range-input-group">
                  <label>Max Events (optional):</label>
                  <input
                    type="number"
                    min="1"
                    value={maxEvents}
                    onChange={(e) => setMaxEvents(e.target.value)}
                    placeholder="No limit"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Field Selection */}
          <div className="export-section">
            <h4>Fields to Include</h4>
            <div className="field-selection">
              {Object.entries(includeFields).map(([field, enabled]) => (
                <label key={field} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => handleFieldToggle(field as keyof typeof includeFields)}
                  />
                  <span className="field-label">
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
            {isExportDisabled && <div className="warning">At least one field must be selected</div>}
          </div>

          {/* Performance Settings */}
          <div className="export-section">
            <h4>Performance Settings</h4>
            <div className="performance-setting">
              <label>
                Batch Size:
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                />
              </label>
              <div className="setting-note">
                Smaller batches use less memory but may be slower for large exports
              </div>
            </div>
          </div>
        </div>

        <div className="export-dialog-footer">
          <button className="export-button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="export-button-primary"
            onClick={handleExport}
            disabled={isExportDisabled}
          >
            Export {eventsToExport.toLocaleString()} Events
          </button>
        </div>
      </div>
    </div>
  );
}
