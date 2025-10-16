# Master-Detail Layout - Implementation Plan

**Status**: Planning  
**Created**: October 16, 2025  
**Estimated Complexity**: Medium  
**Estimated Effort**: 3-4 sprints

## Table of Contents

1. [Overview](#overview)
2. [Phased Breakdown](#phased-breakdown)
3. [Task Dependencies](#task-dependencies)
4. [Detailed Tasks](#detailed-tasks)
5. [Resource Requirements](#resource-requirements)
6. [Risk Assessment](#risk-assessment)
7. [Timeline](#timeline)

## Overview

This document details the step-by-step implementation plan for adding master-detail layout support to EVTX Viewer, alongside the existing modal layout.

## Phased Breakdown

### Phase 1: Foundation (Sprint 1)
- [ ] Create layout enums and TypeScript types
- [ ] Add configuration to `package.json`
- [ ] Create `LayoutPreferenceService`
- [ ] Setup message passing infrastructure

### Phase 2: Component Structure (Sprint 1-2)
- [ ] Create base layout container components
- [ ] Modify `App.tsx` for dual-mode support
- [ ] Implement layout mode detection
- [ ] Add layout toggle button

### Phase 3: Master-Detail Implementation (Sprint 2-3)
- [ ] Create `MasterDetailLayout` component
- [ ] Implement resizable divider
- [ ] Create tab navigation
- [ ] Implement tab content components

### Phase 4: Styling & UX Polish (Sprint 3)
- [ ] Add CSS styling
- [ ] Implement responsive design
- [ ] Add visual feedback
- [ ] Keyboard navigation

### Phase 5: Testing & Documentation (Sprint 4)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Create user documentation
- [ ] Update README

## Task Dependencies

```
Phase 1: Foundation
├── Types & Enums
├── Configuration
└── LayoutPreferenceService
    ↓
Phase 2: Component Structure
├── Layout Containers
├── App.tsx Integration
└── Layout Toggle
    ↓
Phase 3: Master-Detail
├── MasterDetailLayout
├── Resizable Divider
├── Tab Navigation
└── Tab Content Components
    ↓
Phase 4: Styling & Polish
├── CSS/Styling
├── Responsive Design
└── Interactions
    ↓
Phase 5: Testing & Documentation
├── Unit Tests
├── Integration Tests
└── Documentation
```

## Detailed Tasks

### Phase 1: Foundation (1-2 days)

#### Task 1.1: Create Type Definitions

**File**: `src/shared/types/layout.ts` (NEW)

```typescript
export enum LayoutMode {
  MODAL = 'modal',
  MASTER_DETAIL = 'master-detail',
}

export type DetailTab = 'general' | 'details' | 'xml';

export interface LayoutPreference {
  mode: LayoutMode;
  masterDetailPanelWidth?: number;
  detailsTab?: DetailTab;
}

export interface LayoutState {
  currentMode: LayoutMode;
  selectedEventId?: string;
  panelWidth: number;
  activeTab: DetailTab;
}
```

**Acceptance Criteria**:
- [ ] Types compile without errors
- [ ] Types exported from barrel index
- [ ] Used in webview components

#### Task 1.2: Add VS Code Configuration

**File**: `package.json` (MODIFIED)

Add to `contributes.configuration`:

```json
{
  "title": "EVTX Viewer",
  "properties": {
    "evtx-viewer.layoutMode": {
      "type": "string",
      "enum": ["modal", "master-detail"],
      "default": "modal",
      "scope": "application",
      "markdownDescription": "Display mode for event details"
    },
    "evtx-viewer.detailsPanelWidth": {
      "type": "number",
      "default": 400,
      "minimum": 300,
      "maximum": 800,
      "scope": "application"
    },
    "evtx-viewer.detailsDefaultTab": {
      "type": "string",
      "enum": ["general", "details", "xml"],
      "default": "general"
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Settings appear in VS Code settings UI
- [ ] Settings can be configured
- [ ] Default values applied correctly

#### Task 1.3: Create LayoutPreferenceService

**File**: `src/extension/services/layout_preference_service.ts` (NEW)

```typescript
import * as vscode from 'vscode';
import { LayoutPreference, LayoutMode } from '../../shared/types/layout';

export class LayoutPreferenceService {
  private static instance: LayoutPreferenceService;
  private onPreferenceChangedEmitter = new vscode.EventEmitter<LayoutPreference>();
  public onPreferenceChanged = this.onPreferenceChangedEmitter.event;

  constructor() {}

  static getInstance(): LayoutPreferenceService {
    if (!LayoutPreferenceService.instance) {
      LayoutPreferenceService.instance = new LayoutPreferenceService();
    }
    return LayoutPreferenceService.instance;
  }

  getPreference(): LayoutPreference {
    const config = vscode.workspace.getConfiguration('evtx-viewer');
    return {
      mode: (config.get('layoutMode') || 'modal') as LayoutMode,
      masterDetailPanelWidth: config.get('detailsPanelWidth') || 400,
      detailsTab: (config.get('detailsDefaultTab') || 'general') as 'general' | 'details' | 'xml',
    };
  }

  async setPreference(preference: Partial<LayoutPreference>): Promise<void> {
    const config = vscode.workspace.getConfiguration('evtx-viewer');
    
    if (preference.mode) {
      await config.update('layoutMode', preference.mode, vscode.ConfigurationTarget.Global);
    }
    if (preference.masterDetailPanelWidth) {
      await config.update('detailsPanelWidth', preference.masterDetailPanelWidth, vscode.ConfigurationTarget.Global);
    }
    if (preference.detailsTab) {
      await config.update('detailsDefaultTab', preference.detailsTab, vscode.ConfigurationTarget.Global);
    }

    this.onPreferenceChangedEmitter.fire(this.getPreference());
  }

  dispose(): void {
    this.onPreferenceChangedEmitter.dispose();
  }
}
```

**Acceptance Criteria**:
- [ ] Service loads current preferences
- [ ] Service persists preference changes
- [ ] Events emitted on preference changes
- [ ] Singleton pattern working

#### Task 1.4: Setup Webview Message Types

**File**: `src/shared/types/messages.ts` (MODIFIED)

Add message types:

```typescript
export interface LayoutMessages {
  'requestLayoutPreference': {
    request: {};
    response: LayoutPreference;
  };
  'setLayoutMode': {
    request: { mode: LayoutMode };
    response: void;
  };
  'setPanelWidth': {
    request: { width: number };
    response: void;
  };
  'setDetailsTab': {
    request: { tab: DetailTab };
    response: void;
  };
}
```

**Acceptance Criteria**:
- [ ] Message types compile
- [ ] Used in webview message service
- [ ] Type-safe messaging implementation

---

### Phase 2: Component Structure (2-3 days)

#### Task 2.1: Create Layout Container Components

**File**: `src/webview/components/layout/modal_layout.tsx` (NEW)

```typescript
import React, { FC } from 'react';
import { EventRecord } from '../../shared/models/event_record';
import { EventGrid } from '../event_grid';
import { EventDetailsModal } from '../event_details/event_details_modal';

interface ModalLayoutProps {
  events: EventRecord[];
  selectedEvent: EventRecord | null;
  onEventSelect: (event: EventRecord) => void;
  onDetailsClose: () => void;
}

export const ModalLayout: FC<ModalLayoutProps> = ({
  events,
  selectedEvent,
  onEventSelect,
  onDetailsClose,
}) => {
  return (
    <div className="layout-container modal-layout">
      <EventGrid
        events={events}
        onEventSelect={onEventSelect}
      />
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={onDetailsClose}
        />
      )}
    </div>
  );
};
```

**File**: `src/webview/components/layout/master_detail_layout.tsx` (NEW)

```typescript
import React, { FC, useState } from 'react';
import { EventRecord } from '../../shared/models/event_record';
import { DetailTab } from '../../shared/types/layout';
import { EventGrid } from '../event_grid';
import { EventDetailsPane } from '../event_details/event_details_pane';
import { ResizableDivider } from './resizable_divider';

interface MasterDetailLayoutProps {
  events: EventRecord[];
  selectedEvent: EventRecord | null;
  onEventSelect: (event: EventRecord) => void;
  panelWidth: number;
  onPanelWidthChange: (width: number) => void;
  defaultTab?: DetailTab;
}

export const MasterDetailLayout: FC<MasterDetailLayoutProps> = ({
  events,
  selectedEvent,
  onEventSelect,
  panelWidth,
  onPanelWidthChange,
  defaultTab = 'general',
}) => {
  const [activeTab, setActiveTab] = useState<DetailTab>(defaultTab);

  return (
    <div className="layout-container master-detail-layout">
      <div className="master-detail-content">
        {/* Event Grid */}
        <div className="master-section">
          <EventGrid
            events={events}
            selectedEventId={selectedEvent?.eventRecordId.toString()}
            onEventSelect={onEventSelect}
          />
        </div>

        {/* Resizable Divider */}
        <ResizableDivider
          onResize={onPanelWidthChange}
        />

        {/* Details Pane */}
        {selectedEvent && (
          <div 
            className="detail-section"
            style={{ width: `${panelWidth}px` }}
          >
            <EventDetailsPane
              event={selectedEvent}
              mode="master-detail"
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        )}
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Both layout components render correctly
- [ ] Props typed properly
- [ ] No console errors
- [ ] Modal layout preserves existing functionality

#### Task 2.2: Create Resizable Divider Component

**File**: `src/webview/components/layout/resizable_divider.tsx` (NEW)

```typescript
import React, { FC, useRef, useEffect } from 'react';

interface ResizableDividerProps {
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
}

export const ResizableDivider: FC<ResizableDividerProps> = ({
  onResize,
  minWidth = 300,
  maxWidth = 800,
}) => {
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const startX = e.clientX;
      const detailSection = (e.target as HTMLElement)
        .parentElement
        ?.querySelector('.detail-section') as HTMLElement;

      if (!detailSection) return;

      const startWidth = detailSection.offsetWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = startX - moveEvent.clientX;
        const newWidth = startWidth + deltaX;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
          onResize(newWidth);
        }
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const divider = dividerRef.current;
    if (divider) {
      divider.addEventListener('mousedown', handleMouseDown);
      return () => divider.removeEventListener('mousedown', handleMouseDown);
    }
  }, [onResize, minWidth, maxWidth]);

  return (
    <div
      ref={dividerRef}
      className="resizable-divider"
      title="Drag to resize"
    />
  );
};
```

**Acceptance Criteria**:
- [ ] Divider renders as vertical bar
- [ ] Resizing works smoothly
- [ ] Width constraints enforced
- [ ] No horizontal scrolling during resize

#### Task 2.3: Modify App.tsx for Layout Support

**File**: `src/webview/components/app.tsx` (MODIFIED)

```typescript
import React, { useState, useEffect } from 'react';
import { LayoutMode, LayoutPreference, DetailTab } from '../shared/types/layout';
import { ModalLayout } from './layout/modal_layout';
import { MasterDetailLayout } from './layout/master_detail_layout';
import { MessageService } from './services/message_service';

export const App: React.FC = () => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(LayoutMode.MODAL);
  const [panelWidth, setPanelWidth] = useState(400);
  const [defaultTab, setDefaultTab] = useState<DetailTab>('general');
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);

  // Load layout preference on mount
  useEffect(() => {
    MessageService.getInstance().postMessage({
      command: 'requestLayoutPreference',
    });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      if (message.command === 'layoutPreferenceLoaded') {
        setLayoutMode(message.data.mode);
        setPanelWidth(message.data.masterDetailPanelWidth || 400);
        setDefaultTab(message.data.detailsTab || 'general');
      } else if (message.command === 'layoutPreferenceChanged') {
        setLayoutMode(message.data.mode);
        setPanelWidth(message.data.masterDetailPanelWidth || 400);
        setDefaultTab(message.data.detailsTab || 'general');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLayoutToggle = () => {
    const newMode = layoutMode === LayoutMode.MODAL 
      ? LayoutMode.MASTER_DETAIL 
      : LayoutMode.MODAL;
    
    setLayoutMode(newMode);
    MessageService.getInstance().postMessage({
      command: 'setLayoutMode',
      mode: newMode,
    });
  };

  const handlePanelWidthChange = (width: number) => {
    setPanelWidth(width);
    MessageService.getInstance().postMessage({
      command: 'setPanelWidth',
      width,
    });
  };

  return (
    <div className="app">
      {/* Header with toggle button */}
      <header className="app-header">
        <button
          className="layout-toggle-btn"
          onClick={handleLayoutToggle}
          title="Toggle layout mode"
        >
          {layoutMode === LayoutMode.MODAL ? '📋 Master-Detail' : '🔲 Modal'}
        </button>
      </header>

      {/* Content */}
      <main className="app-content">
        {layoutMode === LayoutMode.MODAL ? (
          <ModalLayout
            events={events}
            selectedEvent={selectedEvent}
            onEventSelect={setSelectedEvent}
            onDetailsClose={() => setSelectedEvent(null)}
          />
        ) : (
          <MasterDetailLayout
            events={events}
            selectedEvent={selectedEvent}
            onEventSelect={setSelectedEvent}
            panelWidth={panelWidth}
            onPanelWidthChange={handlePanelWidthChange}
            defaultTab={defaultTab}
          />
        )}
      </main>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Layout mode switching works
- [ ] Preferences load from extension
- [ ] Panel width changes persist
- [ ] Events update both layouts

#### Task 2.4: Add Layout Toggle Button to Header

**File**: `src/webview/components/app.tsx` (MODIFIED)

Add to header:

```typescript
<button
  className="layout-toggle-btn"
  onClick={handleLayoutToggle}
  title={`Switch to ${layoutMode === LayoutMode.MODAL ? 'Master-Detail' : 'Modal'} view`}
  aria-label="Toggle layout mode"
>
  {layoutMode === LayoutMode.MODAL ? '📋 Master-Detail View' : '🔲 Modal View'}
</button>
```

**Acceptance Criteria**:
- [ ] Button visible in header
- [ ] Button toggles layout mode
- [ ] Icon changes based on current mode
- [ ] Tooltip shows correctly

---

### Phase 3: Master-Detail Implementation (3-4 days)

#### Task 3.1: Create Tab Navigation Component

**File**: `src/webview/components/event_details/event_details_tabs.tsx` (NEW)

```typescript
import React, { FC } from 'react';
import { DetailTab } from '../../shared/types/layout';

interface EventDetailsTabsProps {
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}

export const EventDetailsTabs: FC<EventDetailsTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'details', label: 'Details' },
    { id: 'xml', label: 'XML View' },
  ];

  return (
    <div className="event-details-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Tabs render correctly
- [ ] Tab switching works
- [ ] Active tab highlighted
- [ ] Accessible (ARIA roles)

#### Task 3.2: Create General Tab Content Component

**File**: `src/webview/components/event_details/general_tab.tsx` (NEW)

```typescript
import React, { FC } from 'react';
import { EventRecord } from '../../shared/models/event_record';

interface GeneralTabProps {
  event: EventRecord;
}

export const GeneralTab: FC<GeneralTabProps> = ({ event }) => {
  return (
    <div className="general-tab-content">
      <div className="event-field">
        <label>Event Record ID:</label>
        <span>{event.eventRecordId}</span>
      </div>
      <div className="event-field">
        <label>Event ID:</label>
        <span>{event.eventId}</span>
      </div>
      <div className="event-field">
        <label>Level:</label>
        <span>{event.level} ({getLevelName(event.level)})</span>
      </div>
      <div className="event-field">
        <label>Provider:</label>
        <span>{event.provider}</span>
      </div>
      <div className="event-field">
        <label>Channel:</label>
        <span>{event.channel}</span>
      </div>
      <div className="event-field">
        <label>Computer:</label>
        <span>{event.computer}</span>
      </div>
      <div className="event-field">
        <label>Timestamp:</label>
        <span>{formatTimestamp(event.timestamp)}</span>
      </div>
      <div className="event-field full-width">
        <label>Message:</label>
        <div className="message-content">
          {event.message || 'No message available'}
        </div>
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Displays all core event fields
- [ ] Formats data appropriately
- [ ] Message text wraps correctly
- [ ] Looks like Windows Event Viewer

#### Task 3.3: Create Details Tab Content Component

**File**: `src/webview/components/event_details/details_tab.tsx` (NEW)

```typescript
import React, { FC } from 'react';
import { EventRecord } from '../../shared/models/event_record';

interface DetailsTabProps {
  event: EventRecord;
}

export const DetailsTab: FC<DetailsTabProps> = ({ event }) => {
  return (
    <div className="details-tab-content">
      <div className="details-section">
        <h3>Event Data</h3>
        {event.eventData ? (
          <table className="event-data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(event.eventData).map(([key, value]) => (
                <tr key={key}>
                  <td className="name">{key}</td>
                  <td className="value">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No event data available</p>
        )}
      </div>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Displays event data in table
- [ ] Handles missing data gracefully
- [ ] Table has proper headers
- [ ] Values formatted correctly

#### Task 3.4: Create XML View Tab Component

**File**: `src/webview/components/event_details/xml_view_tab.tsx` (NEW)

```typescript
import React, { FC } from 'react';
import { EventRecord } from '../../shared/models/event_record';

interface XmlViewTabProps {
  event: EventRecord;
}

export const XmlViewTab: FC<XmlViewTabProps> = ({ event }) => {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  const toggleNode = (nodePath: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodePath)) {
      newExpanded.delete(nodePath);
    } else {
      newExpanded.add(nodePath);
    }
    setExpandedNodes(newExpanded);
  };

  return (
    <div className="xml-view-tab-content">
      <pre className="xml-content">
        <code>{event.rawXml || 'No XML data available'}</code>
      </pre>
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] XML displays with syntax highlighting
- [ ] Text is selectable
- [ ] Scrollable for long XML
- [ ] Handles missing XML gracefully

#### Task 3.5: Modify EventDetailsPaneComponent for Master-Detail Mode

**File**: `src/webview/components/event_details/event_details_pane.tsx` (MODIFIED)

```typescript
import React, { FC, useState } from 'react';
import { EventRecord } from '../../shared/models/event_record';
import { DetailTab } from '../../shared/types/layout';
import { EventDetailsTabs } from './event_details_tabs';
import { GeneralTab } from './general_tab';
import { DetailsTab } from './details_tab';
import { XmlViewTab } from './xml_view_tab';

interface EventDetailsPaneProps {
  event: EventRecord | null;
  mode?: 'modal' | 'master-detail';
  activeTab?: DetailTab;
  onTabChange?: (tab: DetailTab) => void;
  onClose?: () => void;
}

export const EventDetailsPane: FC<EventDetailsPaneProps> = ({
  event,
  mode = 'modal',
  activeTab = 'general',
  onTabChange,
  onClose,
}) => {
  const [localTab, setLocalTab] = useState<DetailTab>(activeTab);
  const currentTab = onTabChange ? activeTab : localTab;
  const handleTabChange = onTabChange || setLocalTab;

  if (!event) {
    return <div className="event-details-pane empty">No event selected</div>;
  }

  if (mode === 'master-detail') {
    return (
      <div className="event-details-pane master-detail-mode">
        <EventDetailsTabs
          activeTab={currentTab}
          onTabChange={handleTabChange}
        />
        <div className="details-content">
          {currentTab === 'general' && <GeneralTab event={event} />}
          {currentTab === 'details' && <DetailsTab event={event} />}
          {currentTab === 'xml' && <XmlViewTab event={event} />}
        </div>
      </div>
    );
  }

  // Modal mode (existing code)
  return (
    <div className="event-details-pane modal-mode">
      {/* existing modal content */}
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Tab switching works in master-detail mode
- [ ] Tab content displays correctly
- [ ] Modal mode still works
- [ ] Props handled correctly

---

### Phase 4: Styling & Polish (2 days)

#### Task 4.1: Add Master-Detail Layout CSS

**File**: `src/webview/styles/master_detail_layout.css` (NEW)

```css
/* Master-Detail Layout */
.master-detail-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.master-detail-content {
  display: flex;
  flex: 1;
  gap: 0;
  overflow: hidden;
}

.master-section {
  flex: 1;
  overflow: auto;
  border-right: 1px solid var(--vscode-editorGroup-border);
}

.detail-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--vscode-editorGroup-border);
  background-color: var(--vscode-editor-background);
}

.resizable-divider {
  width: 4px;
  cursor: col-resize;
  background-color: var(--vscode-editorGroup-border);
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.resizable-divider:hover {
  background-color: var(--vscode-focusBorder);
}

/* Event Details Pane */
.event-details-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.event-details-pane.master-detail-mode {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

/* Tab Navigation */
.event-details-tabs {
  display: flex;
  border-bottom: 1px solid var(--vscode-editorGroup-border);
  background-color: var(--vscode-tab-inactiveBackground);
}

.event-details-tabs .tab {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: none;
  color: var(--vscode-tab-inactiveForeground);
  cursor: pointer;
  font-size: 13px;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.event-details-tabs .tab:hover {
  background-color: var(--vscode-tab-hoverBackground);
}

.event-details-tabs .tab.active {
  color: var(--vscode-tab-activeForeground);
  background-color: var(--vscode-tab-activeBackground);
  border-bottom-color: var(--vscode-focusBorder);
}

/* Details Content */
.details-content {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

/* General Tab */
.general-tab-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-field {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 8px;
  align-items: start;
}

.event-field label {
  font-weight: 600;
  color: var(--vscode-editor-foreground);
}

.event-field.full-width {
  grid-column: 1 / -1;
}

.message-content {
  padding: 8px;
  background-color: var(--vscode-editor-lineHighlightBackground);
  border-radius: 4px;
  line-height: 1.5;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

/* Details Tab */
.details-tab-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.details-section h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vscode-editor-foreground);
}

.event-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.event-data-table th {
  text-align: left;
  padding: 8px;
  background-color: var(--vscode-tab-inactiveBackground);
  border-bottom: 1px solid var(--vscode-editorGroup-border);
  font-weight: 600;
}

.event-data-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--vscode-editorGroup-border);
}

.event-data-table .name {
  font-weight: 600;
  width: 30%;
}

.event-data-table .value {
  word-break: break-word;
}

/* XML View Tab */
.xml-view-tab-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.xml-content {
  flex: 1;
  margin: 0;
  padding: 8px;
  overflow: auto;
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.xml-content code {
  display: block;
  white-space: pre-wrap;
  word-wrap: break-word;
}

/* Layout Toggle Button */
.layout-toggle-btn {
  padding: 6px 12px;
  border: 1px solid var(--vscode-button-border);
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: background-color 0.2s;
}

.layout-toggle-btn:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.layout-toggle-btn:active {
  background-color: var(--vscode-button-background);
  opacity: 0.8;
}
```

**Acceptance Criteria**:
- [ ] Master-detail layout displays correctly
- [ ] Tab styling matches VS Code
- [ ] Resizable divider visible and functional
- [ ] All elements properly colored
- [ ] Responsive to theme changes

#### Task 4.2: Add Modal Layout CSS

**File**: `src/webview/styles/modal_layout.css` (NEW)

```css
/* Modal Layout */
.modal-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Modal Dialog */
.event-details-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  max-height: 80vh;
  overflow: auto;
  padding: 16px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--vscode-editorGroup-border);
  padding-bottom: 8px;
}

.modal-close-btn {
  background: none;
  border: none;
  color: var(--vscode-editor-foreground);
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

.modal-close-btn:hover {
  opacity: 0.8;
}
```

**Acceptance Criteria**:
- [ ] Modal styling looks professional
- [ ] Modal closes properly
- [ ] Modal content readable

#### Task 4.3: Responsive Design

**File**: `src/webview/styles/responsive.css` (MODIFIED)

Add media queries for smaller screens:

```css
@media (max-width: 768px) {
  .master-detail-content {
    flex-direction: column;
  }

  .master-section {
    flex: 0.5;
    border-right: none;
    border-bottom: 1px solid var(--vscode-editorGroup-border);
  }

  .detail-section {
    flex: 0.5;
    border-left: none;
    border-top: 1px solid var(--vscode-editorGroup-border);
  }

  .resizable-divider {
    width: 100%;
    height: 4px;
    cursor: row-resize;
  }

  .event-field {
    grid-template-columns: 1fr;
  }
}
```

**Acceptance Criteria**:
- [ ] Layout adapts to screen size
- [ ] Touch-friendly divider sizing
- [ ] No horizontal scroll on mobile

---

### Phase 5: Testing & Documentation (2 days)

#### Task 5.1: Unit Tests

**File**: `tests/unit/layout/layout_preference_service.test.ts` (NEW)

Tests for:
- Load preference
- Set preference
- Preference change events
- Configuration updates

#### Task 5.2: Integration Tests

**File**: `tests/integration/layout_switching.test.ts` (NEW)

Tests for:
- Switch between layouts
- Persist preferences
- Message passing
- Event selection in both modes

#### Task 5.3: User Documentation

**File**: `docs/LAYOUT_MODES.md` (NEW)

Document:
- How to use each layout mode
- Layout switching
- Customization options
- Keyboard shortcuts

#### Task 5.4: Update README

**File**: `README.md` (MODIFIED)

Add:
- Layout modes section
- Configuration options
- Screenshots of both modes

---

## Resource Requirements

### Development Resources
- **Frontend Developer**: 60% (main implementation)
- **QA/Tester**: 20% (testing)
- **Technical Writer**: 10% (documentation)
- **Code Reviewer**: 10% (review/guidance)

### Time Breakdown
- **Phase 1**: 8 hours
- **Phase 2**: 12 hours
- **Phase 3**: 16 hours
- **Phase 4**: 8 hours
- **Phase 5**: 8 hours
- **Total**: 52 hours (~2.6 weeks @ 20 hrs/week)

### Tools/Dependencies
- No new external dependencies needed
- Existing React/TypeScript stack sufficient
- VS Code API for preferences
- Webpack for bundling (already in place)

## Risk Assessment

### High Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Performance with large event logs | High | Medium | Implement virtualization, lazy-loading |
| Message passing delays | High | Low | Use async/await, debounce resize events |
| CSS conflicts between modes | Medium | Medium | Isolated CSS classes, test both themes |

### Medium Priority Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Keyboard navigation issues | Medium | Low | Test with screen readers, keyboard-only nav |
| Theme compatibility | Medium | Low | Test with all VS Code themes |
| Resize divider UX | Low | Medium | Add cursor feedback, min/max constraints |

## Timeline

### Week 1: Foundation & Component Structure
- Monday-Tuesday: Phase 1 (types, config, service)
- Wednesday-Friday: Phase 2 (containers, toggle button)

### Week 2: Master-Detail & Styling
- Monday-Wednesday: Phase 3 (tab components, content)
- Thursday-Friday: Phase 4 (CSS, styling, polish)

### Week 3: Testing & Documentation
- Monday-Tuesday: Phase 5 (unit/integration tests)
- Wednesday-Friday: Documentation, code review, bug fixes

## Acceptance Criteria (All Phases)

- [ ] All code passes linting (ESLint)
- [ ] All code passes TypeScript compilation
- [ ] Unit test coverage > 80%
- [ ] Integration tests passing
- [ ] Manual QA sign-off
- [ ] Documentation complete
- [ ] Code reviewed and approved
- [ ] No performance degradation
- [ ] Backward compatibility maintained

## Post-Implementation

### Monitoring
- Track usage of both layout modes via telemetry
- Monitor performance metrics
- Collect user feedback

### Future Enhancements
- Multi-event comparison view
- Custom layout configurations
- Event timeline view
- Advanced filtering in master-detail mode

---

**Document Version**: 1.0  
**Last Updated**: October 16, 2025  
**Approved By**: [Team Lead]  
**Status**: Ready for Implementation
