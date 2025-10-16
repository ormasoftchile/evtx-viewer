# Master-Detail Layout Mode Implementation

**Document Status**: Specification  
**Last Updated**: October 16, 2025  
**Version**: 1.0

## Overview

This specification outlines the implementation of a Windows Event Viewer-style master-detail layout for the EVTX Viewer extension, with user-selectable display modes and configurable preferences.

## Problem Statement

Currently, the EVTX Viewer displays events in a list with a modal dialog for details. While functional, this differs from the Windows Event Viewer's native master-detail layout which many users are familiar with.

**Current limitations**:
- Modal dialogs interrupt workflow
- No side-by-side viewing of list and details
- Cannot compare multiple events easily
- No tab-based detail view (General/Details/XML)

## Solution

Implement two complementary layout modes with user preference settings:

1. **Modal Mode** (current default) - List with detail modal
2. **Master-Detail Mode** (Windows-style) - Split-pane with tabbed details

## Layout Modes

### Mode 1: Modal Layout (Current)

```
┌─────────────────────────────────┐
│  Header & Controls              │
├─────────────────────────────────┤
│                                 │
│  Event List (Grid)              │
│  ┌──────────────────────────┐   │
│  │ Event 1    │ Event 2     │   │
│  │ Event 3    │ Event 4     │   │
│  │ Event 5    │ Event 6     │   │
│  └──────────────────────────┘   │
│  [Click event to open modal]     │
│                                 │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Event Details Modal             │
│ ┌─────────────────────────────┐ │
│ │ Event ID: 1098              │ │
│ │ Provider: Microsoft-AAD      │ │
│ │ Message: [content]           │ │
│ └─────────────────────────────┘ │
│ [Close]                          │
└─────────────────────────────────┘
```

**Characteristics**:
- All events visible in grid
- Details shown in modal overlay
- Familiar for users of current implementation
- Less screen real estate for details

### Mode 2: Master-Detail Layout (Windows-style)

```
┌─────────────────────────────────────────────────────────────────┐
│ Header & Controls (with Layout Toggle Button)                  │
├────────────────────────────┬─────────────────────────────────────┤
│                            │                                     │
│  Event Grid                │  Details Pane                       │
│  ┌──────────────────────┐  │  ┌─────────────────────────────────┐│
│  │ Event 1              │  │  │ ⊡ General │ Details │ XML View  ││
│  │ Event 2 (selected)   │◄─┼─►├─────────────────────────────────┤│
│  │ Event 3              │  │  │ Event Record ID: 2              ││
│  │ Event 4              │  │  │ Event ID: 0                     ││
│  │ Event 5              │  │  │ Level: 4 (Information)          ││
│  │ Event 6              │  │  │ Provider: Microsoft-Windows-AAD ││
│  │                      │  │  │ Channel: AAD/Operational        ││
│  │                      │  │  │ Computer: DESKTOP-1D5ALF0       ││
│  │                      │  │  │ Timestamp: 3/3/2025, 2:44:32 AM││
│  └──────────────────────┘  │  │ Message:                        ││
│                            │  │ [scrollable content]            ││
│                            │  │                                 ││
│                            │  │                                 ││
│                            │  └─────────────────────────────────┘│
│                            │         ▲                           │
│                            │    (Resizable)                      │
└────────────────────────────┴─────────────────────────────────────┘
```

**Characteristics**:
- Split-pane layout with resizable divider
- Event list on left, details on right
- Tabbed detail view (General/Details/XML)
- No modal dialog needed
- Windows Event Viewer parity
- Better for detailed analysis

## Features

### 1. Layout Enumeration

```typescript
export enum LayoutMode {
  MODAL = 'modal',
  MASTER_DETAIL = 'master-detail',
}
```

### 2. Layout Preference Model

```typescript
export interface LayoutPreference {
  mode: LayoutMode;
  masterDetailPanelWidth?: number;
  detailsTab?: 'general' | 'details' | 'xml';
}
```

### 3. VS Code Configuration Settings

New configuration options in `package.json`:

```json
{
  "configuration": {
    "title": "EVTX Viewer",
    "properties": {
      "evtx-viewer.layoutMode": {
        "type": "string",
        "enum": ["modal", "master-detail"],
        "default": "modal",
        "markdownDescription": "Display mode for event details:\n- `modal`: List with detail modal dialog\n- `master-detail`: Windows-style split-pane with tabbed details"
      },
      "evtx-viewer.detailsPanelWidth": {
        "type": "number",
        "default": 400,
        "minimum": 300,
        "maximum": 800,
        "markdownDescription": "Width of details panel in master-detail mode (pixels)"
      },
      "evtx-viewer.detailsDefaultTab": {
        "type": "string",
        "enum": ["general", "details", "xml"],
        "default": "general",
        "markdownDescription": "Default active tab when switching to master-detail mode"
      }
    }
  }
}
```

### 4. Runtime Layout Toggle

Users can switch layouts without restarting:
- Header button toggles between modes
- Active mode persists in VS Code settings
- Smooth transition between layouts
- Details panel width preserved

### 5. Master-Detail Tabs

#### General Tab
- User-friendly view similar to Windows Event Viewer
- Key fields displayed: Event ID, Level, Provider, Channel, Computer, Timestamp
- Formatted message display
- Easy-to-read layout

#### Details Tab
- Structured view of all event properties
- Name-value pairs
- Hierarchical event data
- XML attribute inspection

#### XML View Tab
- Raw XML representation
- Syntax highlighting
- Similar to Windows Event Viewer XML view
- Collapsible XML nodes

### 6. Resizable Divider

- Drag handle between list and details pane
- Smooth resizing with visual feedback
- Minimum width constraints (300-800px for details)
- Width saved in settings

## Component Architecture

### New/Modified Components

```
src/webview/components/
├── app.tsx                          [MODIFIED]
│   └── Render appropriate layout mode
├── layout/                          [NEW]
│   ├── master_detail_layout.tsx     [NEW]
│   │   └── Main master-detail container
│   ├── modal_layout.tsx             [NEW]
│   │   └── Current modal layout
│   └── resizable_divider.tsx        [NEW]
│       └── Resizable pane divider
├── event_details/                   [MODIFIED/NEW]
│   ├── event_details_pane.tsx       [MODIFIED]
│   │   └── Support both modal and embedded
│   ├── event_details_tabs.tsx       [NEW]
│   │   └── Tab navigation
│   ├── general_tab.tsx              [NEW]
│   │   └── General tab content
│   ├── details_tab.tsx              [NEW]
│   │   └── Details tab content
│   └── xml_view_tab.tsx             [NEW]
│       └── XML view tab content
└── event_grid.tsx                   [MODIFIED]
    └── Add selection styling for master-detail mode
```

### Service Layer

```
src/extension/services/
├── layout_preference_service.ts     [NEW]
│   ├── getLayoutPreference()
│   ├── setLayoutPreference()
│   └── onLayoutPreferenceChanged()
└── [existing services]
```

## Implementation Details

### Phase 1: Core Structure

1. Create layout mode enum and types
2. Add VS Code configuration
3. Create `LayoutPreferenceService`
4. Create base layout components
5. Update `App.tsx` to support both modes

### Phase 2: Master-Detail Implementation

1. Implement `MasterDetailLayout` component
2. Create resizable divider component
3. Implement tabbed details panel
4. Add tab content components (General, Details, XML)
5. Implement tab switching logic

### Phase 3: Styling & Polish

1. Add CSS for master-detail layout
2. Style tab navigation
3. Style resizable divider
4. Add hover and selection states
5. Ensure responsive design

### Phase 4: User Preferences

1. Load preferences on extension init
2. Persist layout preference changes
3. Save panel width on resize
4. Remember active tab
5. Message passing between extension and webview

### Phase 5: Testing & Documentation

1. Unit tests for layout switching
2. Integration tests for preference persistence
3. User documentation
4. Keyboard navigation support

## Message Protocol

### Extension → Webview

```typescript
// Request layout preference on load
{
  command: 'requestLayoutPreference'
}

// Response with preference data
{
  command: 'layoutPreferenceLoaded',
  data: {
    mode: 'master-detail',
    panelWidth: 400,
    defaultTab: 'general'
  }
}

// Layout preference changed (from settings)
{
  command: 'layoutPreferenceChanged',
  data: LayoutPreference
}
```

### Webview → Extension

```typescript
// User changed layout mode
{
  command: 'setLayoutMode',
  mode: 'master-detail'
}

// User resized panel
{
  command: 'setPanelWidth',
  width: 450
}

// User changed active tab
{
  command: 'setDetailsTab',
  tab: 'xml'
}
```

## UI/UX Considerations

### Layout Toggle Button

```
┌─────────────────────────────────────────────────────┐
│ [Show Filters] [Show Export] [📋 Master-Detail ▼]   │
│        or                                           │
│ [Show Filters] [Show Export] [🔲 Modal View ▼]      │
└─────────────────────────────────────────────────────┘
```

- Placed in header
- Shows current mode with icon
- Dropdown menu with both options
- Keyboard shortcut available

### Selection Indicators

In master-detail mode:
- Currently selected row highlighted
- Details pane updates in real-time
- Keyboard navigation support (arrow keys)

In modal mode:
- Click to select and open modal
- Existing behavior preserved

### Panel Resizing

- Visual cursor change on divider hover
- Smooth resize animation
- Width constraints enforced (300-800px)
- Width persists in settings

## Accessibility

- [ ] Keyboard navigation between modes
- [ ] Tab order proper in both layouts
- [ ] ARIA labels for tab navigation
- [ ] Screen reader support for layout mode
- [ ] Sufficient color contrast for UI elements
- [ ] Resizable divider keyboard accessible

## Performance Considerations

- Lazy-load details content in master-detail mode
- Virtualize event list if >1000 items
- Memoize detail pane components to prevent unnecessary re-renders
- Debounce resize events during panel resizing

## Backward Compatibility

- Modal mode remains default
- Existing modal layout code preserved
- No breaking changes to existing APIs
- Graceful degradation if settings unavailable

## Testing Strategy

### Unit Tests

- Layout mode switching
- Preference loading/saving
- Tab switching logic
- Resizable divider calculations

### Integration Tests

- Extension ↔ Webview messaging
- Settings persistence
- Layout preference synchronization
- Event selection in both modes

### E2E Tests

- User workflow: open file → select event → view details
- Layout toggle workflow
- Panel resize workflow
- Tab switching workflow

## Documentation Requirements

1. User guide for layout modes
2. Settings configuration documentation
3. Keyboard shortcuts reference
4. Screenshots of both modes
5. Migration guide from modal to master-detail

## Future Enhancements

- [ ] Multi-event comparison view
- [ ] Event filtering within master-detail mode
- [ ] Export details to JSON/CSV
- [ ] Custom detail pane layout
- [ ] Event timeline view
- [ ] Search highlighting in details
- [ ] Drag-drop filter application
- [ ] Remember last selected event

## Success Criteria

- ✅ Users can switch between layout modes without restart
- ✅ Layout preference persists across sessions
- ✅ Master-detail mode matches Windows Event Viewer UX
- ✅ Panel resizing works smoothly
- ✅ All three detail tabs function correctly
- ✅ No performance degradation with large event logs
- ✅ 100% backward compatibility with modal mode
- ✅ Comprehensive test coverage (>80%)

## Related Issues/PRs

- Feature Request: Master-detail layout support
- Issue: Windows Event Viewer parity

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 16, 2025 | Team | Initial specification |
