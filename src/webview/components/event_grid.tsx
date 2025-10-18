// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * React virtual scrolling grid component for displaying EVTX event records
 * Handles large datasets efficiently with virtualization
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { EventRecord } from '../../parsers/models/event_record';
import { FilterCriteria } from '../../shared/models/filter_criteria';

export interface EventGridProps {
  /** Array of event records to display */
  events: EventRecord[];
  /** Currently applied filter criteria */
  filter: FilterCriteria;
  /** Callback when an event row is selected */
  onEventSelect?: (event: EventRecord) => void;
  /** Currently selected event ID */
  selectedEventId?: string;
  /** Loading state */
  isLoading?: boolean;
  /** Virtual scrolling configuration */
  rowHeight?: number;
  /** Grid container height */
  containerHeight?: number;
}

interface VirtualScrollState {
  scrollTop: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
}

/**
 * High-performance virtual scrolling grid for EVTX events
 * Constitutional requirement: <100ms UI response time
 */
export const EventGrid: React.FC<EventGridProps> = ({
  events,
  filter,
  onEventSelect,
  selectedEventId,
  isLoading = false,
  rowHeight = 32,
  containerHeight = 400,
}) => {
  const [virtualState, setVirtualState] = useState<VirtualScrollState>({
    scrollTop: 0,
    visibleStartIndex: 0,
    visibleEndIndex: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate virtual scrolling parameters
  const visibleRowCount = Math.ceil(containerHeight / rowHeight);
  const totalHeight = events.length * rowHeight;
  const overscan = 5; // Render extra rows for smooth scrolling

  // Filter events based on criteria
  const filteredEvents = useMemo(() => {
    if (!filter || Object.keys(filter).length === 0) {
      return events;
    }

    return events.filter((event) => {
      // Level filter
      if (filter.levels && filter.levels.length > 0) {
        if (!filter.levels.includes(event.level)) {
          return false;
        }
      }

      // Event ID filter
      if (filter.eventIds && filter.eventIds.length > 0) {
        if (!filter.eventIds.includes(event.eventId)) {
          return false;
        }
      }

      // Provider filter (using providers instead of sources)
      if (filter.providers && filter.providers.length > 0) {
        if (
          !filter.providers.some((provider: string) =>
            event.provider.toLowerCase().includes(provider.toLowerCase())
          )
        ) {
          return false;
        }
      }

      // Date range filter
      if (filter.timeRange?.start && event.timestamp < filter.timeRange.start) {
        return false;
      }
      if (filter.timeRange?.end && event.timestamp > filter.timeRange.end) {
        return false;
      }

      // Text search filter
      if (filter.textSearch?.query && filter.textSearch.query.trim()) {
        const searchLower = filter.textSearch.query.toLowerCase();
        const searchableText = [
          event.provider,
          event.message || '',
          event.getLevelName(),
          event.eventId.toString(),
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [events, filter]);

  // Update virtual scroll state based on scroll position
  const updateVirtualState = useCallback(
    (scrollTop: number) => {
      const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
      const endIndex = Math.min(
        filteredEvents.length - 1,
        Math.floor((scrollTop + containerHeight) / rowHeight) + overscan
      );

      setVirtualState({
        scrollTop,
        visibleStartIndex: startIndex,
        visibleEndIndex: endIndex,
      });
    },
    [containerHeight, rowHeight, filteredEvents.length, overscan]
  );

  // Handle scroll events
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const element = e.currentTarget as HTMLElement;
      const scrollTop = element.scrollTop;
      updateVirtualState(scrollTop);
    },
    [updateVirtualState]
  );

  // Initialize virtual scroll on mount and when events change
  useEffect(() => {
    updateVirtualState(0);
  }, [updateVirtualState]);

  // Handle row selection
  const handleRowClick = useCallback(
    (event: EventRecord) => {
      onEventSelect?.(event);
    },
    [onEventSelect]
  );

  // Format timestamp for display
  const formatTimestamp = useCallback((timestamp: Date): string => {
    return timestamp.toLocaleString();
  }, []);

  // Format level with appropriate styling
  const getLevelClassName = useCallback((level: string): string => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'event-level-critical';
      case 'error':
        return 'event-level-error';
      case 'warning':
        return 'event-level-warning';
      case 'information':
        return 'event-level-info';
      case 'verbose':
        return 'event-level-verbose';
      default:
        return 'event-level-default';
    }
  }, []);

  // Render visible rows
  const visibleRows = [];
  for (let i = virtualState.visibleStartIndex; i <= virtualState.visibleEndIndex; i++) {
    if (i >= filteredEvents.length) break;

    const event = filteredEvents[i];
    if (!event) continue; // Skip if event is undefined

    const isSelected = selectedEventId === event.eventRecordId.toString();
    const top = i * rowHeight;

    visibleRows.push(
      <div
        key={event.eventRecordId.toString()}
        className={`event-row ${isSelected ? 'selected' : ''}`}
        style={{
          position: 'absolute',
          top: `${top}px`,
          height: `${rowHeight}px`,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          borderBottom: '1px solid var(--vscode-panel-border)',
          backgroundColor: isSelected
            ? 'var(--vscode-list-activeSelectionBackground)'
            : i % 2 === 0
              ? 'var(--vscode-list-evenBackground)'
              : 'var(--vscode-list-oddBackground)',
        }}
        onClick={() => handleRowClick(event)}
      >
        <div className="event-cell timestamp" style={{ width: '150px', paddingLeft: '8px' }}>
          {formatTimestamp(event.timestamp)}
        </div>
        <div
          className={`event-cell level ${getLevelClassName(event.getLevelName())}`}
          style={{ width: '100px' }}
        >
          {event.getLevelName()}
        </div>
        <div className="event-cell event-id" style={{ width: '80px' }}>
          {event.eventId}
        </div>
        <div
          className="event-cell source"
          style={{ width: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {event.provider}
        </div>
        <div
          className="event-cell message"
          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '8px' }}
        >
          {event.message || '(No message)'}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className="event-grid loading"
        style={{
          height: `${containerHeight}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div className="loading-spinner">Loading events...</div>
      </div>
    );
  }

  return (
    <div
      className="event-grid"
      style={{ height: `${containerHeight}px`, position: 'relative', overflow: 'hidden' }}
    >
      {/* Header */}
      <div
        className="event-grid-header"
        style={{
          position: 'sticky',
          top: 0,
          height: `${rowHeight}px`,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--vscode-panel-background)',
          borderBottom: '2px solid var(--vscode-panel-border)',
          fontWeight: 'bold',
          zIndex: 1,
        }}
      >
        <div style={{ width: '150px', paddingLeft: '8px' }}>Timestamp</div>
        <div style={{ width: '100px' }}>Level</div>
        <div style={{ width: '80px' }}>Event ID</div>
        <div style={{ width: '150px' }}>Source</div>
        <div style={{ flex: 1, paddingRight: '8px' }}>Message</div>
      </div>

      {/* Virtual scroll container */}
      <div
        ref={scrollElementRef}
        className="event-grid-scroll-container"
        style={{
          height: `${containerHeight - rowHeight}px`,
          overflow: 'auto',
          position: 'relative',
        }}
        onScroll={handleScroll}
      >
        {/* Virtual content spacer */}
        <div style={{ height: `${filteredEvents.length * rowHeight}px`, position: 'relative' }}>
          {visibleRows}
        </div>
      </div>

      {/* Status bar */}
      <div
        className="event-grid-status"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '24px',
          backgroundColor: 'var(--vscode-statusBar-background)',
          color: 'var(--vscode-statusBar-foreground)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '8px',
          fontSize: '12px',
          borderTop: '1px solid var(--vscode-panel-border)',
        }}
      >
        {filteredEvents.length} / {events.length} events
        {filter && Object.keys(filter).length > 0 && ' (filtered)'}
      </div>
    </div>
  );
};

export default EventGrid;
