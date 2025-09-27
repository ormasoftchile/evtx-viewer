/**
 * Filter Panel Component - Simplified Version
 *
 * Modal dialog for configuring and initiating event log exports.
 * Part of Phase 3.4 Webview UI Components - T028 (Simplified)
 *
 * Constitutional Performance Requirements:
 * - Fast filter selection
 * - <100ms UI response time
 * - Memory-aware filter applications
 */

import React, { useState, useCallback, useEffect } from 'react';

// Simplified interfaces for webview usage to avoid exactOptionalPropertyTypes issues
export interface SimpleFilterCriteria {
  levels?: number[] | undefined;
  eventIds?: number[] | undefined;
  providers?: string[] | undefined;
  channels?: string[] | undefined;
  computers?: string[] | undefined;
  timeRange?:
    | {
        start?: Date;
        end?: Date;
      }
    | undefined;
  textSearch?:
    | {
        query: string;
        isRegex?: boolean;
        caseSensitive?: boolean;
      }
    | undefined;
}

export interface FilterPanelProps {
  /** Current filter criteria */
  filter: SimpleFilterCriteria;
  /** Callback when filter changes */
  onFilterChange: (filter: SimpleFilterCriteria) => void;
  /** Available event IDs from current dataset */
  availableEventIds?: number[];
  /** Available providers from current dataset */
  availableProviders?: string[];
  /** Available channels from current dataset */
  availableChannels?: string[];
  /** Panel collapsed state */
  isCollapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapseChange?: (collapsed: boolean) => void;
}

const EVENT_LEVELS = [
  { value: 1, label: 'Critical', className: 'critical' },
  { value: 2, label: 'Error', className: 'error' },
  { value: 3, label: 'Warning', className: 'warning' },
  { value: 4, label: 'Information', className: 'information' },
  { value: 5, label: 'Verbose', className: 'verbose' },
];

/**
 * Comprehensive filter panel for EVTX events
 * Constitutional requirement: <100ms UI response time
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  filter,
  onFilterChange,
  availableEventIds = [],
  availableProviders = [],
  availableChannels = [],
  isCollapsed = false,
  onCollapseChange,
}) => {
  const [localFilter, setLocalFilter] = useState<SimpleFilterCriteria>(filter);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update local filter when prop changes
  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  // Auto-apply filter changes whenever localFilter updates
  useEffect(() => {
    onFilterChange(localFilter);
  }, [localFilter, onFilterChange]);

  // Reset filters
  const resetFilters = useCallback(() => {
    const emptyFilter: SimpleFilterCriteria = {};
    setLocalFilter(emptyFilter);
    onFilterChange(emptyFilter);
  }, [onFilterChange]);

  // Level change handler
  const handleLevelChange = useCallback(
    (level: number, checked: boolean) => {
      const levels = localFilter.levels || [];
      const newLevels = checked ? [...levels, level] : levels.filter((l) => l !== level);

      setLocalFilter((prev) => ({
        ...prev,
        levels: newLevels.length > 0 ? newLevels : undefined,
      }));
    },
    [localFilter.levels]
  );

  // Text search handler
  const handleTextSearchChange = useCallback((query: string) => {
    setLocalFilter((prev) => ({
      ...prev,
      textSearch: query.trim() ? { query: query.trim() } : undefined,
    }));
  }, []);

  if (isCollapsed) {
    return (
      <div
        className="filter-panel collapsed"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'var(--vscode-sideBar-background)',
          cursor: 'pointer',
        }}
      >
        <button
          className="filter-panel-toggle"
          onClick={() => onCollapseChange?.(false)}
          title="Expand filter panel"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--vscode-foreground)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
          }}
        >
          <span className="codicon codicon-filter"></span>
          <span>Filters</span>
          <span className="codicon codicon-chevron-right"></span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="filter-panel"
      style={{
        borderBottom: '1px solid var(--vscode-panel-border)',
        backgroundColor: 'var(--vscode-sideBar-background)',
      }}
    >
      <div
        className="filter-panel-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid var(--vscode-panel-border)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--vscode-foreground)',
          }}
        >
          Event Filters
        </h3>
        <div
          className="filter-panel-actions"
          style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          <button
            className="filter-action-button secondary"
            onClick={resetFilters}
            title="Clear all filters"
            style={{
              background: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: '1px solid var(--vscode-button-border)',
              borderRadius: '2px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            className="filter-panel-toggle"
            onClick={() => onCollapseChange?.(true)}
            title="Collapse filter panel"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--vscode-foreground)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <span className="codicon codicon-chevron-left"></span>
          </button>
        </div>
      </div>

      <div
        className="filter-panel-content"
        style={{
          padding: '16px',
        }}
      >
        {/* Quick Text Search */}
        <div className="filter-group" style={{ marginBottom: '16px' }}>
          <label
            className="filter-group-label"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--vscode-foreground)',
            }}
          >
            <span className="codicon codicon-search"></span>
            Quick Search
          </label>
          <input
            type="text"
            className="filter-input"
            placeholder="Search in messages..."
            value={localFilter.textSearch?.query || ''}
            onChange={(e) => handleTextSearchChange(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              padding: '6px 8px',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Event Levels */}
        <div className="filter-group" style={{ marginBottom: '16px' }}>
          <label
            className="filter-group-label"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '12px',
              fontWeight: '500',
              color: 'var(--vscode-foreground)',
            }}
          >
            <span className="codicon codicon-warning"></span>
            Event Levels
          </label>
          <div
            className="filter-checkbox-group"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {EVENT_LEVELS.map(({ value, label, className }) => (
              <label
                key={value}
                className="filter-checkbox-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={localFilter.levels?.includes(value) || false}
                  onChange={(e) => handleLevelChange(value, e.target.checked)}
                  style={{
                    cursor: 'pointer',
                  }}
                />
                <span
                  className={`level-indicator ${className}`}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor:
                      {
                        critical: '#f14c4c',
                        error: '#f14c4c',
                        warning: '#ff8c00',
                        information: '#0e639c',
                        verbose: '#6c6c6c',
                      }[className] || '#6c6c6c',
                  }}
                ></span>
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="filter-group" style={{ marginBottom: '16px' }}>
          <button
            className="filter-toggle-button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: 'var(--vscode-foreground)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              padding: 0,
            }}
          >
            <span
              className={`codicon ${showAdvanced ? 'codicon-chevron-down' : 'codicon-chevron-right'}`}
            ></span>
            Advanced Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <>
            {/* Event IDs */}
            <div className="filter-group" style={{ marginBottom: '16px' }}>
              <label
                className="filter-group-label"
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--vscode-foreground)',
                }}
              >
                Event IDs
              </label>
              <input
                type="text"
                className="filter-input"
                placeholder="e.g., 1001,1002,1003"
                value={localFilter.eventIds?.join(',') || ''}
                onChange={(e) => {
                  const ids = e.target.value
                    .split(',')
                    .map((id) => parseInt(id.trim()))
                    .filter((id) => !isNaN(id));
                  setLocalFilter((prev) => ({
                    ...prev,
                    eventIds: ids.length > 0 ? ids : undefined,
                  }));
                }}
                style={{
                  width: '100%',
                  background: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  padding: '6px 8px',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Providers */}
            <div className="filter-group" style={{ marginBottom: '16px' }}>
              <label
                className="filter-group-label"
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: 'var(--vscode-foreground)',
                }}
              >
                Providers
              </label>
              <input
                type="text"
                className="filter-input"
                placeholder="e.g., Microsoft-Windows-Kernel-General"
                value={localFilter.providers?.join(',') || ''}
                onChange={(e) => {
                  const providers = e.target.value
                    .split(',')
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  setLocalFilter((prev) => ({
                    ...prev,
                    providers: providers.length > 0 ? providers : undefined,
                  }));
                }}
                style={{
                  width: '100%',
                  background: 'var(--vscode-input-background)',
                  color: 'var(--vscode-input-foreground)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '2px',
                  padding: '6px 8px',
                  fontSize: '13px',
                }}
              />
            </div>
          </>
        )}

        {/* Filter Summary */}
        <div
          className="filter-summary"
          style={{
            padding: '8px',
            backgroundColor: 'var(--vscode-textCodeBlock-background)',
            border: '1px solid var(--vscode-panel-border)',
            borderRadius: '2px',
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          <div className="filter-summary-text">
            <strong>Active filters (auto-applied):</strong>{' '}
            {[
              localFilter.levels?.length && `${localFilter.levels.length} levels`,
              localFilter.eventIds?.length && `${localFilter.eventIds.length} event IDs`,
              localFilter.providers?.length && `${localFilter.providers.length} providers`,
              localFilter.textSearch && 'text search',
            ]
              .filter(Boolean)
              .join(', ') || 'None'}
          </div>
        </div>
      </div>
    </div>
  );
};
