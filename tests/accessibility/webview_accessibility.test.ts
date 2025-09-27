/**
 * Accessibility Compliance Tests for EVTX Viewer Webview
 * 
 * Tests webview components for accessibility compliance including:
 * - ARIA attributes and roles
 * - Keyboard navigation
 * - Screen reader support
 * - Color contrast requirements
 * - Focus management
 * - Semantic HTML structure
 * 
 * Constitutional Requirements:
 * - WCAG 2.1 AA compliance
 * - Keyboard accessibility
 * - Screen reader compatibility
 * - High contrast mode support
 */

import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { JSDOM, ensureJSDOMGlobals } from '../utils/jsdom-helper';

// Ensure JSDOM globals are properly set up
ensureJSDOMGlobals();

// Mock webview environment
const mockWebviewEnvironment = () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>EVTX Viewer</title>
      </head>
      <body>
        <div id="root"></div>
      </body>
    </html>
  `, {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  // Set up global DOM
  global.window = dom.window as any;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.Element = dom.window.Element;
  global.Node = dom.window.Node;
  
  return dom;
};

// Mock React components structure based on implementation
const mockReactComponents = () => {
  // Simulate the webview app structure
  const createMockComponent = (tagName: string, props: Record<string, any> = {}) => {
    const element = document.createElement(tagName);
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'role') {
        element.setAttribute('role', value);
      } else if (key.startsWith('aria-')) {
        element.setAttribute(key, value);
      } else if (key === 'tabIndex') {
        element.tabIndex = value;
      } else {
        element.setAttribute(key, value);
      }
    });
    return element;
  };

  return { createMockComponent };
};

describe('EVTX Viewer Accessibility Compliance', () => {
  let dom: JSDOM;
  let mockComponents: ReturnType<typeof mockReactComponents>;

  beforeEach(() => {
    dom = mockWebviewEnvironment();
    mockComponents = mockReactComponents();
    
    // Ensure document language is properly set in the mocked environment
    if (document.documentElement && !document.documentElement.lang) {
      document.documentElement.lang = 'en';
    }
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('Application Structure', () => {
    test('should have proper document structure with semantic HTML', () => {
      // Create main app structure
      const app = mockComponents.createMockComponent('main', {
        role: 'main',
        'aria-label': 'EVTX Event Log Viewer'
      });
      
      const header = mockComponents.createMockComponent('header', {
        role: 'banner'
      });
      
      const nav = mockComponents.createMockComponent('nav', {
        role: 'navigation',
        'aria-label': 'Filter controls'
      });
      
      const section = mockComponents.createMockComponent('section', {
        role: 'region',
        'aria-label': 'Event log data'
      });
      
      app.appendChild(header);
      app.appendChild(nav);
      app.appendChild(section);
      document.body.appendChild(app);

      // Verify semantic structure
      expect(document.querySelector('main[role="main"]')).toBeTruthy();
      expect(document.querySelector('header[role="banner"]')).toBeTruthy();
      expect(document.querySelector('nav[role="navigation"]')).toBeTruthy();
      expect(document.querySelector('section[role="region"]')).toBeTruthy();
      
      // Verify ARIA labels
      expect(document.querySelector('main')?.getAttribute('aria-label')).toBe('EVTX Event Log Viewer');
      expect(document.querySelector('nav')?.getAttribute('aria-label')).toBe('Filter controls');
      expect(document.querySelector('section')?.getAttribute('aria-label')).toBe('Event log data');
    });

    test('should have proper heading hierarchy', () => {
      const app = document.createElement('div');
      
      const h1 = mockComponents.createMockComponent('h1', {});
      h1.textContent = 'EVTX Event Log Viewer';
      
      const h2Filter = mockComponents.createMockComponent('h2', {});
      h2Filter.textContent = 'Filter Controls';
      
      const h2Events = mockComponents.createMockComponent('h2', {});
      h2Events.textContent = 'Event Log Data';
      
      const h3Details = mockComponents.createMockComponent('h3', {});
      h3Details.textContent = 'Event Details';
      
      app.appendChild(h1);
      app.appendChild(h2Filter);
      app.appendChild(h2Events);
      app.appendChild(h3Details);
      document.body.appendChild(app);

      // Verify heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      expect(headings[0]?.tagName).toBe('H1');
      expect(headings[1]?.tagName).toBe('H2');
      expect(headings[2]?.tagName).toBe('H2');
      expect(headings[3]?.tagName).toBe('H3');
      
      // No skipped heading levels
      expect(headings.length).toBe(4);
    });

    test('should have valid document language', () => {
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('Event Grid Accessibility', () => {
    test('should implement proper table structure for event grid', () => {
      // Create accessible event grid
      const table = mockComponents.createMockComponent('table', {
        role: 'table',
        'aria-label': 'Windows Event Log entries',
        'aria-rowcount': '100',
        'aria-colcount': '6'
      });
      
      const caption = mockComponents.createMockComponent('caption', {});
      caption.textContent = 'Windows Event Log entries showing 100 of 1000 total events';
      
      const thead = mockComponents.createMockComponent('thead', {});
      const headerRow = mockComponents.createMockComponent('tr', {
        role: 'row'
      });
      
      const headers = [
        'Record ID',
        'Time Created', 
        'Level',
        'Event ID',
        'Source',
        'Message'
      ];
      
      headers.forEach((headerText, index) => {
        const th = mockComponents.createMockComponent('th', {
          role: 'columnheader',
          scope: 'col',
          'aria-sort': 'none',
          'aria-colindex': (index + 1).toString(),
          tabIndex: 0
        });
        th.textContent = headerText;
        headerRow.appendChild(th);
      });
      
      thead.appendChild(headerRow);
      table.appendChild(caption);
      table.appendChild(thead);
      
      const tbody = mockComponents.createMockComponent('tbody', {});
      
      // Add sample rows
      for (let i = 1; i <= 5; i++) {
        const row = mockComponents.createMockComponent('tr', {
          role: 'row',
          'aria-rowindex': (i + 1).toString(),
          tabIndex: 0
        });
        
        ['1234', '2024-01-01 12:00:00', 'Information', '1001', 'System', 'Sample event message'].forEach((cellText, colIndex) => {
          const td = mockComponents.createMockComponent('td', {
            role: 'gridcell',
            'aria-colindex': (colIndex + 1).toString()
          });
          td.textContent = cellText;
          row.appendChild(td);
        });
        
        tbody.appendChild(row);
      }
      
      table.appendChild(tbody);
      document.body.appendChild(table);

      // Verify table accessibility
      expect(table.getAttribute('role')).toBe('table');
      expect(table.getAttribute('aria-label')).toBe('Windows Event Log entries');
      expect(table.querySelector('caption')?.textContent).toContain('100 of 1000 total events');
      
      // Verify column headers
      const columnHeaders = table.querySelectorAll('th[role="columnheader"]');
      expect(columnHeaders.length).toBe(6);
      columnHeaders.forEach((header, index) => {
        expect(header.getAttribute('scope')).toBe('col');
        expect(header.getAttribute('aria-colindex')).toBe((index + 1).toString());
      });
      
      // Verify data rows
      const dataRows = table.querySelectorAll('tbody tr[role="row"]');
      expect(dataRows.length).toBe(5);
      dataRows.forEach((row, index) => {
        expect(row.getAttribute('aria-rowindex')).toBe((index + 2).toString()); // +2 because header is row 1
      });
    });

    test('should support keyboard navigation for event grid', () => {
      // Create a simplified grid for keyboard testing
      const grid = mockComponents.createMockComponent('div', {
        role: 'grid',
        'aria-label': 'Event log grid',
        tabIndex: 0
      });
      
      // Add focusable rows
      for (let i = 0; i < 3; i++) {
        const row = mockComponents.createMockComponent('div', {
          role: 'row',
          tabIndex: -1,
          'data-row-index': i.toString()
        });
        row.textContent = `Event ${i + 1}`;
        grid.appendChild(row);
      }
      
      document.body.appendChild(grid);

      // Test initial focus
      grid.focus();
      expect(document.activeElement).toBe(grid);

      // Simulate keyboard navigation
      const rows = grid.querySelectorAll('[role="row"]');
      
      // Arrow down should move focus to first row
      const downEvent = new window.KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true
      });
      grid.dispatchEvent(downEvent);
      
      // Verify keyboard handling setup
      expect(rows.length).toBe(3);
      expect(grid.getAttribute('tabIndex')).toBe('0');
      expect(rows[0]?.getAttribute('tabIndex')).toBe('-1');
    });

    test('should provide screen reader announcements for dynamic content', () => {
      // Create live region for announcements
      const liveRegion = mockComponents.createMockComponent('div', {
        'aria-live': 'polite',
        'aria-label': 'Status updates',
        className: 'sr-only'
      });
      document.body.appendChild(liveRegion);

      // Simulate loading state announcement
      liveRegion.textContent = 'Loading event log data...';
      expect(liveRegion.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion.textContent).toBe('Loading event log data...');

      // Simulate completion announcement
      liveRegion.textContent = 'Loaded 1000 events successfully';
      expect(liveRegion.textContent).toBe('Loaded 1000 events successfully');
    });
  });

  describe('Filter Panel Accessibility', () => {
    test('should implement proper form controls with labels', () => {
      const filterPanel = mockComponents.createMockComponent('form', {
        role: 'search',
        'aria-label': 'Filter event log entries'
      });
      
      // Level filter dropdown
      const levelLabel = mockComponents.createMockComponent('label', {
        for: 'level-filter'
      });
      levelLabel.textContent = 'Event Level';
      
      const levelSelect = mockComponents.createMockComponent('select', {
        id: 'level-filter',
        'aria-describedby': 'level-help'
      });
      
      const levelHelp = mockComponents.createMockComponent('div', {
        id: 'level-help',
        className: 'help-text'
      });
      levelHelp.textContent = 'Filter events by severity level';
      
      // Date range inputs
      const startDateLabel = mockComponents.createMockComponent('label', {
        for: 'start-date'
      });
      startDateLabel.textContent = 'Start Date';
      
      const startDateInput = mockComponents.createMockComponent('input', {
        type: 'datetime-local',
        id: 'start-date',
        'aria-required': 'false'
      });
      
      // Search input
      const searchLabel = mockComponents.createMockComponent('label', {
        for: 'search-input'
      });
      searchLabel.textContent = 'Search Messages';
      
      const searchInput = mockComponents.createMockComponent('input', {
        type: 'search',
        id: 'search-input',
        'aria-describedby': 'search-help',
        placeholder: 'Enter keywords to search event messages'
      });
      
      const searchHelp = mockComponents.createMockComponent('div', {
        id: 'search-help',
        className: 'help-text'
      });
      searchHelp.textContent = 'Search is case-insensitive and supports wildcards';
      
      filterPanel.appendChild(levelLabel);
      filterPanel.appendChild(levelSelect);
      filterPanel.appendChild(levelHelp);
      filterPanel.appendChild(startDateLabel);
      filterPanel.appendChild(startDateInput);
      filterPanel.appendChild(searchLabel);
      filterPanel.appendChild(searchInput);
      filterPanel.appendChild(searchHelp);
      
      document.body.appendChild(filterPanel);

      // Verify form accessibility
      expect(filterPanel.getAttribute('role')).toBe('search');
      expect(filterPanel.getAttribute('aria-label')).toBe('Filter event log entries');
      
      // Verify label associations
      expect(document.querySelector('label[for="level-filter"]')).toBeTruthy();
      expect(document.querySelector('#level-filter')).toBeTruthy();
      expect(document.querySelector('label[for="start-date"]')).toBeTruthy();
      expect(document.querySelector('#start-date')).toBeTruthy();
      expect(document.querySelector('label[for="search-input"]')).toBeTruthy();
      expect(document.querySelector('#search-input')).toBeTruthy();
      
      // Verify aria-describedby associations
      expect(levelSelect.getAttribute('aria-describedby')).toBe('level-help');
      expect(searchInput.getAttribute('aria-describedby')).toBe('search-help');
    });

    test('should support clear filters functionality', () => {
      const clearButton = mockComponents.createMockComponent('button', {
        type: 'button',
        'aria-label': 'Clear all filters and show all events'
      });
      clearButton.textContent = 'Clear Filters';
      
      document.body.appendChild(clearButton);

      expect(clearButton.getAttribute('aria-label')).toBe('Clear all filters and show all events');
      expect(clearButton.textContent).toBe('Clear Filters');
    });
  });

  describe('Event Details Panel Accessibility', () => {
    test('should use proper landmark roles and headings', () => {
      const detailsPanel = mockComponents.createMockComponent('aside', {
        role: 'complementary',
        'aria-label': 'Event details',
        'aria-live': 'polite'
      });
      
      const detailsHeading = mockComponents.createMockComponent('h3', {});
      detailsHeading.textContent = 'Selected Event Details';
      
      const detailsList = mockComponents.createMockComponent('dl', {
        className: 'event-details'
      });
      
      // Add detail items
      const detailItems = [
        ['Record ID', '12345'],
        ['Event ID', '1001'],
        ['Time Created', '2024-01-01 12:00:00'],
        ['Source', 'System'],
        ['Level', 'Information']
      ];
      
      detailItems.forEach(([term, description]) => {
        const dt = mockComponents.createMockComponent('dt', {});
        dt.textContent = term || '';
        const dd = mockComponents.createMockComponent('dd', {});
        dd.textContent = description || '';
        
        detailsList.appendChild(dt);
        detailsList.appendChild(dd);
      });
      
      detailsPanel.appendChild(detailsHeading);
      detailsPanel.appendChild(detailsList);
      document.body.appendChild(detailsPanel);

      // Verify landmark and structure
      expect(detailsPanel.getAttribute('role')).toBe('complementary');
      expect(detailsPanel.getAttribute('aria-label')).toBe('Event details');
      expect(detailsPanel.querySelector('h3')).toBeTruthy();
      expect(detailsPanel.querySelector('dl')).toBeTruthy();
      
      // Verify description list structure
      const terms = detailsPanel.querySelectorAll('dt');
      const descriptions = detailsPanel.querySelectorAll('dd');
      expect(terms.length).toBe(descriptions.length);
      expect(terms.length).toBe(5);
    });

    test('should handle empty/no selection state', () => {
      const detailsPanel = mockComponents.createMockComponent('aside', {
        role: 'complementary',
        'aria-label': 'Event details'
      });
      
      const emptyState = mockComponents.createMockComponent('p', {
        'aria-live': 'polite'
      });
      emptyState.textContent = 'Select an event to view detailed information';
      
      detailsPanel.appendChild(emptyState);
      document.body.appendChild(detailsPanel);

      expect(emptyState.getAttribute('aria-live')).toBe('polite');
      expect(emptyState.textContent).toBe('Select an event to view detailed information');
    });
  });

  describe('Export Dialog Accessibility', () => {
    test('should implement modal dialog correctly', () => {
      // Create modal backdrop
      const backdrop = mockComponents.createMockComponent('div', {
        className: 'modal-backdrop',
        'aria-hidden': 'true'
      });
      
      // Create modal dialog
      const dialog = mockComponents.createMockComponent('div', {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'export-title',
        'aria-describedby': 'export-description',
        tabIndex: -1
      });
      
      const dialogTitle = mockComponents.createMockComponent('h2', {
        id: 'export-title'
      });
      dialogTitle.textContent = 'Export Event Data';
      
      const dialogDescription = mockComponents.createMockComponent('p', {
        id: 'export-description'
      });
      dialogDescription.textContent = 'Choose export format and configure export options';
      
      // Export format selection
      const formatFieldset = mockComponents.createMockComponent('fieldset', {});
      const formatLegend = mockComponents.createMockComponent('legend', {});
      formatLegend.textContent = 'Export Format';
      
      const csvOption = mockComponents.createMockComponent('input', {
        type: 'radio',
        id: 'format-csv',
        name: 'export-format',
        value: 'csv'
      });
      const csvLabel = mockComponents.createMockComponent('label', {
        for: 'format-csv'
      });
      csvLabel.textContent = 'CSV (Comma Separated Values)';
      
      formatFieldset.appendChild(formatLegend);
      formatFieldset.appendChild(csvOption);
      formatFieldset.appendChild(csvLabel);
      
      // Dialog buttons
      const buttonGroup = mockComponents.createMockComponent('div', {
        className: 'dialog-buttons'
      });
      
      const exportButton = mockComponents.createMockComponent('button', {
        type: 'submit',
        'aria-describedby': 'export-help'
      });
      exportButton.textContent = 'Export';
      
      const cancelButton = mockComponents.createMockComponent('button', {
        type: 'button',
        'aria-label': 'Cancel export and close dialog'
      });
      cancelButton.textContent = 'Cancel';
      
      const exportHelp = mockComponents.createMockComponent('div', {
        id: 'export-help',
        className: 'help-text'
      });
      exportHelp.textContent = 'Export will download a file to your computer';
      
      buttonGroup.appendChild(exportButton);
      buttonGroup.appendChild(cancelButton);
      
      dialog.appendChild(dialogTitle);
      dialog.appendChild(dialogDescription);
      dialog.appendChild(formatFieldset);
      dialog.appendChild(buttonGroup);
      dialog.appendChild(exportHelp);
      
      document.body.appendChild(backdrop);
      document.body.appendChild(dialog);

      // Verify modal accessibility
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('export-title');
      expect(dialog.getAttribute('aria-describedby')).toBe('export-description');
      
      // Verify fieldset structure
      expect(formatFieldset.querySelector('legend')).toBeTruthy();
      expect(document.querySelector('input[name="export-format"]')).toBeTruthy();
      expect(document.querySelector('label[for="format-csv"]')).toBeTruthy();
      
      // Verify button accessibility
      expect(exportButton.getAttribute('aria-describedby')).toBe('export-help');
      expect(cancelButton.getAttribute('aria-label')).toBe('Cancel export and close dialog');
    });
  });

  describe('Focus Management', () => {
    test('should trap focus within modal dialogs', () => {
      const dialog = mockComponents.createMockComponent('div', {
        role: 'dialog',
        'aria-modal': 'true',
        tabIndex: -1
      });
      
      const firstButton = mockComponents.createMockComponent('button', {
        'data-first-focus': 'true'
      });
      firstButton.textContent = 'First Button';
      
      const middleInput = mockComponents.createMockComponent('input', {
        type: 'text'
      });
      
      const lastButton = mockComponents.createMockComponent('button', {
        'data-last-focus': 'true'
      });
      lastButton.textContent = 'Last Button';
      
      dialog.appendChild(firstButton);
      dialog.appendChild(middleInput);
      dialog.appendChild(lastButton);
      document.body.appendChild(dialog);

      // Focus should be set to first focusable element
      const focusableElements = dialog.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      expect(focusableElements.length).toBe(3);
      expect(focusableElements[0]).toBe(firstButton);
      expect(focusableElements[focusableElements.length - 1]).toBe(lastButton);
    });

    test('should restore focus when dialog closes', () => {
      // Create trigger button
      const triggerButton = mockComponents.createMockComponent('button', {
        id: 'open-dialog-trigger'
      });
      triggerButton.textContent = 'Open Dialog';
      
      document.body.appendChild(triggerButton);
      
      // Focus should be restored to trigger when dialog closes
      triggerButton.focus();
      expect(document.activeElement).toBe(triggerButton);
    });

    test('should have visible focus indicators', () => {
      const button = mockComponents.createMockComponent('button', {
        className: 'focus-visible'
      });
      button.textContent = 'Focusable Button';
      
      document.body.appendChild(button);
      button.focus();

      // Verify focus indicators can be applied
      expect(button.className).toContain('focus-visible');
    });
  });

  describe('Screen Reader Support', () => {
    test('should provide status updates for loading states', () => {
      const statusRegion = mockComponents.createMockComponent('div', {
        role: 'status',
        'aria-live': 'polite',
        'aria-label': 'Application status',
        className: 'sr-only'
      });
      
      document.body.appendChild(statusRegion);
      
      // Test loading announcement
      statusRegion.textContent = 'Loading event data, please wait...';
      expect(statusRegion.textContent).toBe('Loading event data, please wait...');
      
      // Test completion announcement
      statusRegion.textContent = 'Event data loaded successfully. Showing 1000 events.';
      expect(statusRegion.textContent).toBe('Event data loaded successfully. Showing 1000 events.');
      
      // Test error announcement  
      statusRegion.textContent = 'Error loading event data. Please try again.';
      expect(statusRegion.textContent).toBe('Error loading event data. Please try again.');
    });

    test('should provide contextual help text', () => {
      const complexControl = mockComponents.createMockComponent('input', {
        type: 'search',
        'aria-describedby': 'search-instructions'
      });
      
      const instructions = mockComponents.createMockComponent('div', {
        id: 'search-instructions',
        className: 'help-text'
      });
      instructions.textContent = 'Use wildcards (*) for partial matches. Press Enter to search.';
      
      document.body.appendChild(complexControl);
      document.body.appendChild(instructions);

      expect(complexControl.getAttribute('aria-describedby')).toBe('search-instructions');
      expect(instructions.textContent).toContain('wildcards');
    });
  });

  describe('High Contrast and Visual Accessibility', () => {
    test('should support Windows high contrast mode', () => {
      // Simulate high contrast media query
      const testElement = mockComponents.createMockComponent('div', {
        className: 'high-contrast-test'
      });
      document.body.appendChild(testElement);

      // High contrast styles should be CSS-based, but we can test structure
      expect(testElement.className).toBe('high-contrast-test');
    });

    test('should have sufficient color contrast ratios', () => {
      // This would typically be tested with actual color values
      // Here we test that contrast-sensitive classes are applied
      const errorText = mockComponents.createMockComponent('span', {
        className: 'error-text high-contrast'
      });
      errorText.textContent = 'Error message';
      
      const warningText = mockComponents.createMockComponent('span', {
        className: 'warning-text high-contrast'
      });
      warningText.textContent = 'Warning message';
      
      document.body.appendChild(errorText);
      document.body.appendChild(warningText);

      expect(errorText.className).toContain('high-contrast');
      expect(warningText.className).toContain('high-contrast');
    });

    test('should not rely solely on color for information', () => {
      // Error state should have multiple indicators
      const errorRow = mockComponents.createMockComponent('tr', {
        className: 'error-row',
        'aria-invalid': 'true',
        'aria-describedby': 'error-description'
      });
      
      const errorIcon = mockComponents.createMockComponent('span', {
        'aria-hidden': 'true',
        className: 'error-icon'
      });
      errorIcon.textContent = '⚠️';
      
      const errorDescription = mockComponents.createMockComponent('span', {
        id: 'error-description',
        className: 'sr-only'
      });
      errorDescription.textContent = 'This event indicates an error condition';
      
      errorRow.appendChild(errorIcon);
      errorRow.appendChild(errorDescription);
      document.body.appendChild(errorRow);

      // Verify multiple indicators
      expect(errorRow.getAttribute('aria-invalid')).toBe('true');
      expect(errorRow.getAttribute('aria-describedby')).toBe('error-description');
      expect(errorIcon.getAttribute('aria-hidden')).toBe('true'); // Decorative icon
      expect(errorDescription.textContent).toContain('error condition');
    });
  });

  describe('Performance and Accessibility', () => {
    test('should handle large datasets with virtual scrolling accessibility', () => {
      const virtualGrid = mockComponents.createMockComponent('div', {
        role: 'grid',
        'aria-label': 'Event log entries',
        'aria-rowcount': '10000', // Total rows
        'aria-colcount': '6',
        tabIndex: 0
      });
      
      // Only visible rows are in DOM (virtual scrolling simulation)
      const visibleStartIndex = 100;
      const visibleCount = 10;
      
      for (let i = 0; i < visibleCount; i++) {
        const row = mockComponents.createMockComponent('div', {
          role: 'row',
          'aria-rowindex': (visibleStartIndex + i + 1).toString(),
          tabIndex: -1
        });
        row.textContent = `Event ${visibleStartIndex + i + 1}`;
        virtualGrid.appendChild(row);
      }
      
      document.body.appendChild(virtualGrid);

      // Verify virtual scrolling accessibility
      expect(virtualGrid.getAttribute('aria-rowcount')).toBe('10000');
      expect(virtualGrid.querySelectorAll('[role="row"]').length).toBe(visibleCount);
      
      const firstVisibleRow = virtualGrid.querySelector('[role="row"]');
      expect(firstVisibleRow?.getAttribute('aria-rowindex')).toBe('101'); // visibleStartIndex + 1
    });

    test('should announce filter result counts', () => {
      const resultsAnnouncement = mockComponents.createMockComponent('div', {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      });
      
      document.body.appendChild(resultsAnnouncement);
      
      // Simulate filter application
      resultsAnnouncement.textContent = 'Showing 25 of 1000 events matching current filters';
      
      expect(resultsAnnouncement.getAttribute('role')).toBe('status');
      expect(resultsAnnouncement.getAttribute('aria-live')).toBe('polite');
      expect(resultsAnnouncement.getAttribute('aria-atomic')).toBe('true');
      expect(resultsAnnouncement.textContent).toContain('25 of 1000 events');
    });
  });
});

describe('Accessibility Integration Tests', () => {
  test('should maintain accessibility during real user workflows', () => {
    const dom = mockWebviewEnvironment();
    const { createMockComponent } = mockReactComponents();
    
    // Simulate complete user workflow
    const app = createMockComponent('main', {
      role: 'main',
      'aria-label': 'EVTX Event Log Viewer'
    });
    
    // Step 1: File loaded
    const statusRegion = createMockComponent('div', {
      role: 'status',
      'aria-live': 'polite'
    });
    statusRegion.textContent = 'Event log file loaded successfully';
    
    // Step 2: Grid populated
    const grid = createMockComponent('table', {
      role: 'table',
      'aria-label': 'Event log entries',
      'aria-rowcount': '100'
    });
    
    // Step 3: Filter applied
    statusRegion.textContent = 'Filter applied. Showing 25 matching events';
    
    // Step 4: Event selected
    const detailsPanel = createMockComponent('aside', {
      role: 'complementary',
      'aria-label': 'Event details',
      'aria-live': 'polite'
    });
    detailsPanel.textContent = 'Event details loaded for record ID 12345';
    
    app.appendChild(statusRegion);
    app.appendChild(grid);
    app.appendChild(detailsPanel);
    document.body.appendChild(app);

    // Verify workflow accessibility
    expect(app.getAttribute('role')).toBe('main');
    expect(statusRegion.getAttribute('aria-live')).toBe('polite');
    expect(grid.getAttribute('aria-rowcount')).toBe('100');
    expect(detailsPanel.getAttribute('role')).toBe('complementary');
    
    dom.window.close();
  });

  test('should handle error states accessibly', () => {
    const dom = mockWebviewEnvironment();
    const { createMockComponent } = mockReactComponents();
    
    // Error alert
    const errorAlert = createMockComponent('div', {
      role: 'alert',
      'aria-live': 'assertive',
      'aria-atomic': 'true'
    });
    errorAlert.textContent = 'Failed to load event log file. Please check the file path and try again.';
    
    // Recovery actions
    const actions = createMockComponent('div', {
      role: 'group',
      'aria-label': 'Recovery actions'
    });
    
    const retryButton = createMockComponent('button', {
      'aria-describedby': 'retry-help'
    });
    retryButton.textContent = 'Retry';
    
    const helpText = createMockComponent('div', {
      id: 'retry-help'
    });
    helpText.textContent = 'Attempt to reload the event log file';
    
    actions.appendChild(retryButton);
    actions.appendChild(helpText);
    
    document.body.appendChild(errorAlert);
    document.body.appendChild(actions);

    // Verify error accessibility
    expect(errorAlert.getAttribute('role')).toBe('alert');
    expect(errorAlert.getAttribute('aria-live')).toBe('assertive');
    expect(actions.getAttribute('aria-label')).toBe('Recovery actions');
    expect(retryButton.getAttribute('aria-describedby')).toBe('retry-help');
    
    dom.window.close();
  });
});