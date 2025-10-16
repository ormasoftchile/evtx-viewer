# Master-Detail Layout - Visual Specifications

## Layout Mode Wireframes

### Current Implementation (Modal Mode)

```
┌────────────────────────────────────────────────────────────────────┐
│ EVTX Viewer                                                   [📋] │  Header with toggle
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Event Grid (Full Width)                                          │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ Time │ Level │ Event ID │ Provider │ Channel │ Computer      │ │
│  ├──────┼───────┼──────────┼──────────┼─────────┼────────────────┤ │
│  │ 3:44 │ Info  │ 0        │ AAD      │ AAD/Op  │ DESKTOP-1D5ALF │ │
│  │ 3:44 │ Info  │ 0        │ AAD      │ AAD/Op  │ DESKTOP-1D5ALF │ │
│  │ 3:44 │ Info  │ 0        │ AAD      │ AAD/Op  │ DESKTOP-1D5ALF │ │
│  │ 5:22 │ Info  │ 0        │ AAD      │ AAD/Op  │ DESKTOP-1D5ALF │ │
│  │ 6:35 │ Warn  │ 4001     │ System   │ System  │ DESKTOP-1D5ALF │ │
│  │ 7:12 │ Error │ 8224     │ Security │ Security│ DESKTOP-1D5ALF │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  [Click event to view details]                                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Event Details - Event 1098, AAD                          [X] Close │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│ Event ID: 1098                                                    │
│ Level: 4 (Information)                                            │
│ Provider: Microsoft-Windows-AAD                                   │
│ Channel: Microsoft-Windows-AAD/Operational                        │
│ Computer: DESKTOP-1D5ALF0                                         │
│ Timestamp: 3/3/2025, 2:44:32 AM                                  │
│                                                                    │
│ Message:                                                           │
│ The Internet connection has timed out.                            │
│                                                                    │
│ [Close Modal]                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### New Implementation (Master-Detail Mode)

```
┌────────────────────────────────────────────────────────────────────┐
│ EVTX Viewer                                           [🔲 Modal ▼] │
├──────────────────────────────────┬────────────────────────────────┤
│                                  │ General │ Details │ XML View   │
│  Event Grid (Left Pane)          ├────────────────────────────────┤
│  ┌───────────────────────────┐   │ Event Record ID: 2             │
│  │ Time │ Level │ Event ID  │   │ Event ID: 0                    │
│  ├──────┼───────┼───────────┤   │ Level: 4 (Information)         │
│  │ 3:44 │ Info  │ 0         │   │ Provider: Microsoft-Windows-   │
│  │ 3:44 │ Info  │ 0         │   │           AAD                  │
│  │ 3:44 │ Info  │ 0         │   │ Channel: AAD/Operational       │
│  │ 5:22 │ Info  │ 0         │ ◄─┼─ Computer: DESKTOP-1D5ALF0     │
│  │ 6:35 │ Warn  │ 4001      │   │ Timestamp: 3/3/2025,          │
│  │ 7:12 │ Error │ 8224      │   │           2:44:32 AM           │
│  │ 7:45 │ Info  │ 1097      │   │                                │
│  │ 8:01 │ Info  │ 1098      │   │ Message:                       │
│  │ 8:15 │ Error │ 6001      │   │ Error 2326069478 ErrorMessage: │
│  │       │       │           │   │ Enumeration status set for     │
│  └───────────────────────────┘   │ existing webaccounts success.  │
│                                  │                                │
│                                  │ [scrollable]                   │
│                                  │                                │
└──────────────────────────────────┴────────────────────────────────┘
                                   ↑
                          (Resizable Divider)
```

## Tab Views (Master-Detail Mode)

### General Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ General │ Details │ XML View                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Event Record ID:        2                                       │
│ Event ID:               0                                       │
│ Level:                  4 (Information)                         │
│ Provider:               Microsoft-Windows-AAD                  │
│ Channel:                Microsoft-Windows-AAD/Operational      │
│ Computer:               DESKTOP-1D5ALF0                        │
│ Timestamp:              3/3/2025, 2:44:32 AM                  │
│                                                                 │
│ Message:                                                        │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ Error 2326069478 ErrorMessage: Enumeration status set    │   │
│ │ for existing webaccounts successfully. AdditionalInfo:   │   │
│ │ Logged at AccountEnumerationStateMigration.cpp, line: 69 │   │
│ │ method: AccountEnumerationStateMigration::Apply.         │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Details Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ General │ Details │ XML View                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ EVENT DATA                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Name                    │ Value                             │ │
│ ├─────────────────────────┼───────────────────────────────────┤ │
│ │ Error                   │ 2399942154                        │ │
│ │ ErrorMessage            │ Enumeration status set for        │ │
│ │                         │ existing webaccounts successf...  │ │
│ │ AdditionalInformation   │ Logged at AccountEnumeration...  │ │
│ │ providerId              │ 1098                              │ │
│ │ version                 │ 0                                 │ │
│ │ level                   │ 3                                 │ │
│ │ task                    │ 103                               │ │
│ │ opcode                  │ 0                                 │ │
│ │ keywords                │ 0x4000000000000030                │ │
│ │ timestamp               │                                   │ │
│ │ eventRecordId           │ 2                                 │ │
│ │ correlation             │                                   │ │
│ │ execution               │                                   │ │
│ │ channel                 │ AAD/Operational                   │ │
│ │ computer                │ DESKTOP-1D5ALF0                   │ │
│ │ security                │                                   │ │
│ │ data                    │ 2326069478                        │ │
│ └─────────────────────────┴───────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### XML View Tab

```
┌─────────────────────────────────────────────────────────────────┐
│ General │ Details │ XML View                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ <?xml version="1.0" encoding="utf-8"?>                         │
│ <Event xmlns="http://schemas.microsoft.com/win/2004/08/        │
│        events/event">                                           │
│   <System>                                                      │
│     <Provider Name="Microsoft-Windows-AAD"                     │
│               Guid="{4de9bc9c-b27a-43c9-8994-0915f1a5e24f}"/>  │
│     <EventID>1098</EventID>                                     │
│     <Version>0</Version>                                        │
│     <Level>2</Level>                                            │
│     <Task>103</Task>                                            │
│     <Opcode>0</Opcode>                                          │
│     <Keywords>0x4000000000000012</Keywords>                     │
│     <TimeCreated SystemTime="2025-07-01T23:09:16.061027Z" />   │
│     <EventRecordID>36</EventRecordID>                           │
│     <Correlation ActivityID="{ea3bb2bee-ea35-0002-8f50-        │
│                              c4aa35eadb01}" />                  │
│     <Execution ProcessID="11500" ThreadID="5920" />             │
│     <Channel>Microsoft-Windows-AAD/Operational</Channel>        │
│     <Computer>DESKTOP-1D5ALF0</Computer>                        │
│     <Security UserID="S-1-5-21-349816100-228315292-              │
│                646300561-1001" />                               │
│   </System>                                                     │
│   <EventData>                                                   │
│     <Data Name="Error">3399942154</Data>                        │
│     <Data Name="ErrorMessage">The Internet connection has       │
│     timed out.</Data>                                           │
│   </EventData>                                                  │
│ </Event>                                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Header Layout with Toggle Button

### Modal View (Current)

```
┌────────────────────────────────────────────────────────────────┐
│ [≡ Menu] [Show Filters] [Show Export] [🔲 Modal View ▼]       │
└────────────────────────────────────────────────────────────────┘
```

### Master-Detail View

```
┌────────────────────────────────────────────────────────────────┐
│ [≡ Menu] [Show Filters] [Show Export] [📋 Master-Detail ▼]    │
└────────────────────────────────────────────────────────────────┘
```

## Resizable Divider States

### Normal State
```
Left Pane │ Right Pane
          ▲
          │ Cursor: col-resize
          │ Color: Editor group border
```

### Hover State
```
Left Pane │ Right Pane
          ▲
          │ Cursor: col-resize (emphasized)
          │ Color: Focus border (blue)
          │ Background: Slightly highlighted
```

### Dragging State
```
Left Pane    │  Right Pane
(Resizing)   │
             ↑
             │ Cursor: col-resize (active)
             │ Opacity: 0.8
             │ Visual feedback: Smooth animation
```

## Responsive Breakpoints

### Desktop (> 768px)
- Horizontal master-detail layout
- Resizable divider between columns
- Full-width event grid

### Tablet (600-768px)
- Vertical master-detail layout
- Resizable divider changes to horizontal
- Event grid takes top half
- Details pane takes bottom half

### Mobile (< 600px)
- Stacked layout
- Tabs to switch between list and details
- Full-width each
- No resizable divider

## Color Scheme (VS Code Light Theme)

```
Background:        #FFFFFF (white)
Text:              #333333 (dark gray)
Border:            #CCCCCC (light gray)
Selection:         #0078D4 (VS Code blue)
Hover:             #F3F3F3 (very light gray)
Tab Active:        #0078D4 background
Tab Inactive:      #ECECEC background
Scrollbar:         #CCCCCC
```

## Color Scheme (VS Code Dark Theme)

```
Background:        #1E1E1E (dark gray)
Text:              #D4D4D4 (light gray)
Border:            #3E3E42 (medium dark)
Selection:         #0078D4 (VS Code blue)
Hover:             #2D2D30 (slightly lighter)
Tab Active:        #007ACC (bright blue)
Tab Inactive:      #3E3E42 background
Scrollbar:         #424242
```

## Typography

### Header
- Font Size: 13px
- Weight: 500
- Color: Editor foreground

### Tab Labels
- Font Size: 13px
- Weight: 400
- Active: Bold + Focus border color

### Field Labels (General Tab)
- Font Size: 13px
- Weight: 600
- Color: Editor foreground

### Field Values
- Font Size: 13px
- Weight: 400
- Color: Editor foreground
- Word Break: break-word

### Table Headers (Details Tab)
- Font Size: 12px
- Weight: 600
- Background: Tab inactive background
- Color: Editor foreground

### Table Cells
- Font Size: 12px
- Weight: 400
- Color: Editor foreground

## Spacing & Sizing

```
Header Height:           40px
Tab Height:              36px
Tab Padding:             8px (vertical) x 16px (horizontal)
Field Padding:           12px (gap)
Section Margin:          16px
Resizable Divider:       4px width
Details Pane Min Width:  300px
Details Pane Max Width:  800px
Default Pane Width:      400px
Cell Padding:            6px (vertical) x 8px (horizontal)
Modal Max Width:         600px
Modal Max Height:        80vh
```

## Interactions

### Event Selection in Master-Detail Mode
1. User clicks event in left grid
2. Row highlights (selection color)
3. Details pane updates smoothly
4. First tab (General) displayed
5. Details pane scrolls to top

### Tab Switching
1. User clicks tab button
2. Tab button highlights
3. Previous content fades out
4. New content fades in
5. Content area scrolls to top

### Panel Resizing
1. User hovers over divider → cursor changes
2. User clicks and drags divider
3. Left pane shrinks, right pane expands (or vice versa)
4. Minimum/maximum width constraints enforced
5. On mouse release, width persists in settings

### Layout Mode Toggle
1. User clicks toggle button
2. Current layout fades out
3. New layout fades in
4. Selected event preserved
5. Settings updated

## Animation Timings

```
Tab Switch:          200ms ease-in-out
Layout Toggle:       300ms ease-in-out
Panel Resize:        Smooth (real-time)
Hover Effects:       150ms ease-out
Focus Transitions:   100ms ease-out
```

## Accessibility Features Visual

### Focus Indicators
- 2px solid focus border (color: --vscode-focusBorder)
- Visible on tab buttons, buttons, inputs
- Sufficient contrast ratio (3:1 minimum)

### Keyboard Navigation
- Tab order: Header → Left Grid → Right Details → Tabs
- Arrow keys: Navigate grid vertically
- Enter: Select grid item
- Ctrl+Tab: Switch details tabs
- Escape: Close modal (if applicable)

### Screen Reader Features
- Tab buttons have `role="tab"` and `aria-selected`
- Tab content has `role="tabpanel"`
- Grid has semantic structure
- Labels associated with fields
- ARIA live regions for dynamic updates

---

**Visual Specifications Version**: 1.0  
**Last Updated**: October 16, 2025
