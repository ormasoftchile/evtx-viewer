# Master-Detail Layout - Quick Reference

## Overview

Master-Detail layout implementation for EVTX Viewer providing Windows Event Viewer-style UI with user-selectable display modes.

## Key Files

### Configuration
- `package.json` - VS Code settings for layout preferences

### Type Definitions
- `src/shared/types/layout.ts` - Layout mode enums and interfaces

### Extension Services
- `src/extension/services/layout_preference_service.ts` - Layout preference management

### Webview Components
- `src/webview/components/layout/modal_layout.tsx` - Current modal-style layout
- `src/webview/components/layout/master_detail_layout.tsx` - Windows-style split-pane layout
- `src/webview/components/layout/resizable_divider.tsx` - Resizable pane divider
- `src/webview/components/event_details/event_details_tabs.tsx` - Tab navigation
- `src/webview/components/event_details/general_tab.tsx` - General details view
- `src/webview/components/event_details/details_tab.tsx` - Detailed properties view
- `src/webview/components/event_details/xml_view_tab.tsx` - XML representation view

### Styling
- `src/webview/styles/master_detail_layout.css` - Master-detail layout styles
- `src/webview/styles/modal_layout.css` - Modal layout styles
- `src/webview/styles/responsive.css` - Responsive design rules

### Documentation
- `specs/004-master-detail-layout/spec.md` - Full specification
- `specs/004-master-detail-layout/IMPLEMENTATION_PLAN.md` - Detailed implementation plan
- `docs/LAYOUT_MODES.md` - User documentation

## Configuration Options

```json
{
  "evtx-viewer.layoutMode": {
    "type": "string",
    "enum": ["modal", "master-detail"],
    "default": "modal"
  },
  "evtx-viewer.detailsPanelWidth": {
    "type": "number",
    "default": 400,
    "minimum": 300,
    "maximum": 800
  },
  "evtx-viewer.detailsDefaultTab": {
    "type": "string",
    "enum": ["general", "details", "xml"],
    "default": "general"
  }
}
```

## Component Hierarchy

```
App
├── Header (with layout toggle button)
└── Content
    ├── ModalLayout
    │   ├── EventGrid
    │   └── EventDetailsModal (on event select)
    │
    └── MasterDetailLayout
        ├── EventGrid (left pane)
        ├── ResizableDivider
        └── EventDetailsPane (right pane)
            ├── EventDetailsTabs
            ├── GeneralTab
            ├── DetailsTab
            └── XmlViewTab
```

## Message Flow

### Webview → Extension

```typescript
{
  command: 'requestLayoutPreference'
  // or
  command: 'setLayoutMode',
  mode: 'master-detail'
  // or
  command: 'setPanelWidth',
  width: 400
  // or
  command: 'setDetailsTab',
  tab: 'xml'
}
```

### Extension → Webview

```typescript
{
  command: 'layoutPreferenceLoaded',
  data: {
    mode: 'master-detail',
    masterDetailPanelWidth: 400,
    detailsTab: 'general'
  }
  // or
  command: 'layoutPreferenceChanged',
  data: LayoutPreference
}
```

## User Interactions

### Layout Switching
1. Click layout toggle button in header
2. Layout changes immediately
3. Preference saved to VS Code settings
4. Selected event preserved

### Master-Detail Mode
1. Select event from left pane
2. Details appear in right pane
3. Click tabs to switch detail views
4. Drag divider to resize panels
5. Panel width saved to settings

### Modal Mode
1. Click event in grid
2. Modal dialog opens
3. Close modal to return to list
4. Can open another event

## CSS Variables (VS Code Themes)

```css
--vscode-editor-background
--vscode-editor-foreground
--vscode-editorGroup-border
--vscode-focusBorder
--vscode-button-background
--vscode-button-foreground
--vscode-button-hoverBackground
--vscode-button-border
--vscode-tab-activeBackground
--vscode-tab-activeForeground
--vscode-tab-inactiveBackground
--vscode-tab-inactiveForeground
--vscode-tab-hoverBackground
--vscode-editor-lineHighlightBackground
```

## Testing Checklist

- [ ] Layout toggle works
- [ ] Preferences save/load correctly
- [ ] Master-detail mode displays events
- [ ] Tab switching works
- [ ] Panel resizing works with constraints
- [ ] Modal mode still works
- [ ] Theme compatibility verified
- [ ] Responsive design tested
- [ ] Keyboard navigation works
- [ ] Screen reader compatible

## Development Workflow

### Step 1: Implement Types & Service
```bash
# Create type definitions and preference service
npm run compile
npm run test
```

### Step 2: Create Components
```bash
# Build layout container components
npm run build:extension
npm run build:webview
```

### Step 3: Add Styling
```bash
# Update CSS files
npm run lint
```

### Step 4: Test Integration
```bash
# Run test suite
npm run test
npm test:vscode
```

### Step 5: Documentation
```bash
# Create user guides
# Update README
# Generate screenshots
```

## Performance Considerations

1. **Virtualization**: Use react-window for large event lists
2. **Lazy Loading**: Load tab content on-demand
3. **Memoization**: Memoize detail pane components
4. **Debouncing**: Debounce resize events (100ms)
5. **Caching**: Cache formatted event data

## Accessibility Features

- [ ] Tab navigation with arrow keys
- [ ] Focus management for modal
- [ ] ARIA labels for tabs
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard-only navigation support
- [ ] Screen reader compatible
- [ ] Resizable divider keyboard accessible

## Troubleshooting

### Layout not switching
- Check if `requestLayoutPreference` message is sent
- Verify extension service is initialized
- Check VS Code console for errors

### Panel width not saved
- Verify `setPanelWidth` message is sent
- Check VS Code settings scope
- Confirm debouncing is working

### Styling issues
- Clear VS Code cache
- Rebuild webview bundle
- Check CSS variable names
- Verify theme compatibility

### Performance issues
- Check virtual scrolling is enabled
- Verify large event logs are virtualized
- Monitor resize event frequency
- Check for unnecessary re-renders

## Browser DevTools Tips

1. **Inspect Layout**:
   ```js
   document.querySelector('.master-detail-content').style.display = 'grid'
   ```

2. **Test Resize**:
   ```js
   const divider = document.querySelector('.resizable-divider')
   divider.dispatchEvent(new MouseEvent('mousedown'))
   ```

3. **Check Messages**:
   ```js
   window.addEventListener('message', (e) => console.log('Message:', e.data))
   ```

4. **Toggle Theme**:
   In VS Code: Cmd+K Cmd+T (Mac) or Ctrl+K Ctrl+T (Windows/Linux)

## Related Documentation

- [Full Specification](./spec.md)
- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [EVTX Viewer README](../../README.md)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [React Documentation](https://react.dev)

## Useful Commands

```bash
# Build everything
npm run build

# Build just webview
npm run build:webview

# Build just extension
npm run build:extension

# Watch for changes
npm run watch

# Run tests
npm test

# Run linter
npm run lint

# Package extension
npm run package

# Start development
npm run watch:extension & npm run watch:webview
```

## Support

For questions or issues:
1. Check troubleshooting section above
2. Review specification and implementation plan
3. Check VS Code extension logs
4. Open GitHub issue if bug found

---

**Quick Reference Version**: 1.0  
**Last Updated**: October 16, 2025
