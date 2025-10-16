# Specification 004: Master-Detail Layout Mode

**Status**: 📋 Specification & Planning  
**Version**: 1.0  
**Created**: October 16, 2025  
**Type**: Feature Specification

## Overview

This specification outlines the implementation of a Windows Event Viewer-style master-detail layout for the EVTX Viewer VS Code extension, providing users with an alternative to the current modal-based event detail viewing.

## Problem Statement

Currently, the EVTX Viewer displays events in a list format with event details shown in a modal dialog when clicked. While functional, this approach differs from the Windows Event Viewer's native master-detail interface, which many users expect:

- **Current**: Event list → Click to open modal → View details
- **Windows Style**: Event list (left) + Details pane (right) with tabs

## Proposed Solution

Implement **dual layout modes** with user-selectable preference:

1. **Modal Mode** (Current) - Maintains existing functionality
2. **Master-Detail Mode** (New) - Windows Event Viewer-style split-pane

Users can:
- ✅ Switch between modes at any time
- ✅ Configure default mode in settings
- ✅ Customize details pane width
- ✅ Select default detail tab
- ✅ Persist preferences across sessions

## Key Features

### Layout Modes

| Feature | Modal Mode | Master-Detail Mode |
|---------|------------|-------------------|
| **Display** | List + Modal | Split pane (left/right) |
| **Interaction** | Click to open | Click to select |
| **Detail Tabs** | N/A | General, Details, XML |
| **Resizing** | N/A | Resizable divider |
| **Screen Use** | Overlay | Side-by-side |
| **Familiar To** | Power users | Windows users |

### Detail Tabs in Master-Detail Mode

1. **General Tab**
   - User-friendly summary view
   - Key fields: Event ID, Provider, Channel, Computer, Timestamp, Message
   - Similar to Windows Event Viewer General tab

2. **Details Tab**
   - Structured view of all properties
   - Table format with Name/Value pairs
   - Hierarchical event data

3. **XML View Tab**
   - Raw XML representation
   - Syntax highlighting
   - Similar to Windows Event Viewer XML View

### Configuration Options

```json
{
  "evtx-viewer.layoutMode": "modal" | "master-detail"        // Default: "modal"
  "evtx-viewer.detailsPanelWidth": 300-800 pixels            // Default: 400px
  "evtx-viewer.detailsDefaultTab": "general" | "details" | "xml"  // Default: "general"
}
```

## Document Structure

This specification consists of four comprehensive documents:

### 1. **spec.md** - Full Technical Specification
   - Detailed feature description
   - Component architecture
   - Message protocol definition
   - Testing strategy
   - **Length**: ~400 lines

### 2. **IMPLEMENTATION_PLAN.md** - Detailed Implementation Roadmap
   - Phased approach (5 phases)
   - Task breakdown with acceptance criteria
   - Resource requirements
   - Risk assessment
   - Timeline (3-4 weeks, ~52 hours)
   - **Length**: ~600 lines

### 3. **VISUAL_SPECS.md** - UI/UX Wireframes & Design
   - ASCII wireframes of both layouts
   - Tab view mockups
   - Responsive design specs
   - Color schemes (light & dark themes)
   - Typography and spacing guide
   - Animation timings
   - **Length**: ~350 lines

### 4. **QUICK_REFERENCE.md** - Developer Quick Reference
   - File structure overview
   - Configuration options
   - Component hierarchy
   - Message flow diagrams
   - Keyboard shortcuts
   - Troubleshooting guide
   - Useful commands
   - **Length**: ~300 lines

## Implementation Timeline

**Estimated Effort**: 3-4 weeks (52 hours)

```
Week 1: Foundation & Component Structure
├─ Mon-Tue: Phase 1 - Types, Config, Service
└─ Wed-Fri: Phase 2 - Layout Containers, Toggle Button

Week 2: Master-Detail & Styling
├─ Mon-Wed: Phase 3 - Tab Components & Content
└─ Thu-Fri: Phase 4 - CSS & Styling

Week 3: Testing & Documentation
├─ Mon-Tue: Phase 5 - Unit & Integration Tests
└─ Wed-Fri: Documentation & Code Review
```

## Phase Overview

### Phase 1: Foundation (8 hours)
- Create TypeScript types and enums
- Add VS Code configuration
- Implement LayoutPreferenceService
- Setup message passing

### Phase 2: Component Structure (12 hours)
- Create layout container components
- Implement resizable divider
- Modify App.tsx for dual-mode support
- Add layout toggle button

### Phase 3: Master-Detail Implementation (16 hours)
- Create MasterDetailLayout component
- Implement tab navigation
- Build General, Details, and XML tab components
- Integrate tab content

### Phase 4: Styling & Polish (8 hours)
- CSS styling for both layouts
- Responsive design rules
- Theme compatibility
- Visual feedback & interactions

### Phase 5: Testing & Documentation (8 hours)
- Unit tests for layout logic
- Integration tests for messaging
- User documentation
- README updates

## File Structure

```
specs/004-master-detail-layout/
├── README.md                  [This file]
├── spec.md                    [Full technical specification]
├── IMPLEMENTATION_PLAN.md     [Detailed implementation roadmap]
├── VISUAL_SPECS.md            [UI/UX wireframes & design]
├── QUICK_REFERENCE.md         [Developer quick reference]
└── plan.md                    [Related planning doc]
```

### Component Files (to be created)

```
src/
├── shared/
│   └── types/
│       └── layout.ts                    [NEW]
├── extension/
│   └── services/
│       └── layout_preference_service.ts [NEW]
└── webview/
    └── components/
        ├── layout/                      [NEW DIR]
        │   ├── modal_layout.tsx         [NEW]
        │   ├── master_detail_layout.tsx [NEW]
        │   └── resizable_divider.tsx    [NEW]
        ├── event_details/               [NEW DIR]
        │   ├── event_details_tabs.tsx   [NEW]
        │   ├── general_tab.tsx          [NEW]
        │   ├── details_tab.tsx          [NEW]
        │   └── xml_view_tab.tsx         [NEW]
        └── app.tsx                      [MODIFIED]
```

## Success Criteria

- ✅ Users can toggle between layout modes without restart
- ✅ Master-detail mode matches Windows Event Viewer UX
- ✅ All three detail tabs function correctly
- ✅ Panel resizing works with constraints (300-800px)
- ✅ Layout preference persists across sessions
- ✅ 100% backward compatibility with modal mode
- ✅ No performance degradation with large logs
- ✅ Test coverage > 80%

## Technology Stack

- **Frontend**: React 18, TypeScript
- **Styling**: CSS with VS Code theme variables
- **State Management**: React Hooks
- **Build**: Webpack 5
- **Testing**: Jest, React Testing Library

## Related Files

- `package.json` - VS Code configuration and build scripts
- `README.md` - Main project documentation
- `.vscodeignore` - Extension packaging excludes

## Development Process

1. **Read** the full spec.md for context
2. **Review** IMPLEMENTATION_PLAN.md for detailed tasks
3. **Reference** VISUAL_SPECS.md for UI requirements
4. **Consult** QUICK_REFERENCE.md during development
5. **Follow** each phase sequentially

## Getting Started

### For Reviewers
1. Read `spec.md` for requirements understanding
2. Check `VISUAL_SPECS.md` for UI expectations
3. Review `IMPLEMENTATION_PLAN.md` for technical approach

### For Developers
1. Start with `QUICK_REFERENCE.md`
2. Follow `IMPLEMENTATION_PLAN.md` tasks
3. Reference `VISUAL_SPECS.md` for styling
4. Use `spec.md` for detailed API info

### For Project Managers
1. See timeline in `IMPLEMENTATION_PLAN.md`
2. Check phase breakdown and resource requirements
3. Review risk assessment and mitigation

## Dependencies

### External Dependencies
- None (uses existing stack)

### Internal Dependencies
- VS Code Extension API
- React Component Library
- MessageService (existing)
- EventRecord Model (existing)

## Future Enhancements

Potential improvements post-implementation:
- Multi-event comparison view
- Custom detail layout configuration
- Event timeline visualization
- Advanced filtering in master-detail mode
- Drag-drop filter application
- Event search highlighting

## Questions & Support

### For Specification Questions
- See `spec.md` Problem Statement and Solution sections

### For Implementation Questions
- See `IMPLEMENTATION_PLAN.md` Detailed Tasks section

### For UI/UX Questions
- See `VISUAL_SPECS.md` Wireframes and Design sections

### For Development Questions
- See `QUICK_REFERENCE.md` Troubleshooting section

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Oct 16, 2025 | Initial specification and planning |

---

**Document**: Master-Detail Layout Mode Specification  
**Status**: Ready for Implementation Review  
**Last Updated**: October 16, 2025  
**Maintainer**: EVTX Viewer Team
