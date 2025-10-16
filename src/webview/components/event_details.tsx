// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Simplified Event Details Pane component for EVTX event display
 * Shows detailed information for selected events
 */

import React from 'react';
import { EventRecord } from '../../parsers/models/event_record';

export interface EventDetailsPaneProps {
  /** Selected event to display */
  event?: EventRecord;
  /** Panel visibility */
  isVisible?: boolean;
  /** Callback when panel is closed */
  onClose?: () => void;
}

/**
 * Event details pane for displaying comprehensive event information
 * Constitutional requirement: <100ms UI response time
 */
export const EventDetailsPane: React.FC<EventDetailsPaneProps> = ({
  event,
  isVisible = true,
  onClose,
}) => {
  if (!isVisible || !event) {
    return null;
  }

  const formatTimestamp = (timestamp: Date): string => {
    return timestamp.toLocaleString();
  };

  const formatXmlData = (xml: string): string => {
    try {
      // Simple XML formatting - in production would use proper XML parser
      return xml
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>')
        .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    } catch {
      return xml;
    }
  };

  return (
    <div
      className="event-details-pane"
      style={{
        width: '400px',
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderLeft: '1px solid var(--vscode-panel-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="details-header"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--vscode-panel-background)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Event Details</h3>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--vscode-foreground)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '16px',
            }}
            title="Close Details"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className="details-content"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
        }}
      >
        {/* Basic Information */}
        <div className="details-section" style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold' }}>
            Basic Information
          </h4>
          <div
            className="details-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <span style={{ fontWeight: '500' }}>Record ID:</span>
            <span>{event.eventRecordId.toString()}</span>

            <span style={{ fontWeight: '500' }}>Event ID:</span>
            <span>{event.eventId}</span>

            <span style={{ fontWeight: '500' }}>Level:</span>
            <span className={`event-level-${event.getLevelName().toLowerCase()}`}>
              {event.getLevelName()}
            </span>

            <span style={{ fontWeight: '500' }}>Source:</span>
            <span>{event.provider}</span>

            <span style={{ fontWeight: '500' }}>Timestamp:</span>
            <span>{formatTimestamp(event.timestamp)}</span>

            <span style={{ fontWeight: '500' }}>Computer:</span>
            <span>{event.computer || 'N/A'}</span>

            <span style={{ fontWeight: '500' }}>Channel:</span>
            <span>{event.channel || 'N/A'}</span>
          </div>
        </div>

        {/* Message */}
        <div className="details-section" style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold' }}>Message</h4>
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
              fontSize: '13px',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap',
            }}
          >
            {event.message || 'No message available'}
          </div>
        </div>

        {/* Event Data */}
        {event.eventData && Object.keys(event.eventData).length > 0 && (
          <div className="details-section" style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold' }}>
              Event Data
            </h4>
            <div
              className="event-data"
              style={{
                backgroundColor: 'var(--vscode-textCodeBlock-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                overflow: 'auto',
              }}
            >
              {Object.entries(event.eventData).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--vscode-panel-border)',
                    fontSize: '12px',
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'var(--vscode-list-hoverBackground)',
                      minWidth: '120px',
                      fontWeight: '500',
                      borderRight: '1px solid var(--vscode-panel-border)',
                    }}
                  >
                    {key}
                  </div>
                  <div
                    style={{
                      padding: '8px 12px',
                      flex: 1,
                      fontFamily: 'var(--vscode-editor-font-family)',
                    }}
                  >
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw XML */}
        {event.xml && (
          <div className="details-section" style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold' }}>Raw XML</h4>
            <div
              style={{
                backgroundColor: 'var(--vscode-textCodeBlock-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                padding: '12px',
                fontSize: '12px',
                fontFamily: 'var(--vscode-editor-font-family)',
                overflow: 'auto',
                maxHeight: '300px',
              }}
            >
              <pre dangerouslySetInnerHTML={{ __html: formatXmlData(event.xml) }} />
            </div>
          </div>
        )}

        {/* System Information */}
        <div className="details-section" style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold' }}>
            System Information
          </h4>
          <div
            className="details-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <span style={{ fontWeight: '500' }}>Process ID:</span>
            <span>{event.processId || 'N/A'}</span>

            <span style={{ fontWeight: '500' }}>Thread ID:</span>
            <span>{event.threadId || 'N/A'}</span>

            <span style={{ fontWeight: '500' }}>User ID:</span>
            <span>{event.userId || 'N/A'}</span>

            {event.version !== undefined && (
              <>
                <span style={{ fontWeight: '500' }}>Version:</span>
                <span>{event.version}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="details-actions"
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--vscode-panel-border)',
          display: 'flex',
          gap: '8px',
          backgroundColor: 'var(--vscode-panel-background)',
        }}
      >
        <button
          onClick={() => navigator.clipboard?.writeText(JSON.stringify(event, null, 2))}
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--vscode-button-background)',
            color: 'var(--vscode-button-foreground)',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Copy JSON
        </button>

        {event.xml && (
          <button
            onClick={() => navigator.clipboard?.writeText(event.xml || '')}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Copy XML
          </button>
        )}
      </div>
    </div>
  );
};

export default EventDetailsPane;
