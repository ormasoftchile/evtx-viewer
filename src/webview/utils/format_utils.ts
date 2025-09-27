/**
 * Data Formatting Utilities
 * Provides consistent formatting for EVTX event data display
 */

/**
 * Format timestamp for display
 */
export function formatTimestamp(
  timestamp: Date,
  options?: {
    includeMilliseconds?: boolean;
    useUTC?: boolean;
    format?: 'short' | 'medium' | 'long' | 'full';
  }
): string {
  if (!timestamp || !(timestamp instanceof Date)) {
    return 'Invalid Date';
  }

  const { includeMilliseconds = false, useUTC = false, format = 'medium' } = options || {};

  try {
    const formatOptions: Intl.DateTimeFormatOptions = {
      timeZone: useUTC ? 'UTC' : undefined,
    };

    switch (format) {
      case 'short':
        formatOptions.dateStyle = 'short';
        formatOptions.timeStyle = 'short';
        break;
      case 'medium':
        formatOptions.dateStyle = 'medium';
        formatOptions.timeStyle = 'medium';
        break;
      case 'long':
        formatOptions.dateStyle = 'long';
        formatOptions.timeStyle = 'long';
        break;
      case 'full':
        formatOptions.dateStyle = 'full';
        formatOptions.timeStyle = 'full';
        break;
    }

    let formatted = timestamp.toLocaleString(undefined, formatOptions);

    if (includeMilliseconds && !formatted.includes('AM') && !formatted.includes('PM')) {
      const ms = timestamp.getMilliseconds().toString().padStart(3, '0');
      formatted += `.${ms}`;
    }

    return formatted;
  } catch {
    return timestamp.toString();
  }
}

/**
 * Format event level with appropriate styling class
 */
export function formatEventLevel(level: number | string): {
  text: string;
  className: string;
  priority: number;
} {
  let levelText: string;
  let className: string;
  let priority: number;

  if (typeof level === 'number') {
    switch (level) {
      case 1:
        levelText = 'Critical';
        className = 'event-level-critical';
        priority = 5;
        break;
      case 2:
        levelText = 'Error';
        className = 'event-level-error';
        priority = 4;
        break;
      case 3:
        levelText = 'Warning';
        className = 'event-level-warning';
        priority = 3;
        break;
      case 4:
        levelText = 'Information';
        className = 'event-level-info';
        priority = 2;
        break;
      case 5:
        levelText = 'Verbose';
        className = 'event-level-verbose';
        priority = 1;
        break;
      default:
        levelText = `Level ${level}`;
        className = 'event-level-unknown';
        priority = 0;
    }
  } else {
    levelText = level || 'Unknown';
    switch (levelText.toLowerCase()) {
      case 'critical':
        className = 'event-level-critical';
        priority = 5;
        break;
      case 'error':
        className = 'event-level-error';
        priority = 4;
        break;
      case 'warning':
        className = 'event-level-warning';
        priority = 3;
        break;
      case 'information':
      case 'info':
        className = 'event-level-info';
        priority = 2;
        break;
      case 'verbose':
        className = 'event-level-verbose';
        priority = 1;
        break;
      default:
        className = 'event-level-unknown';
        priority = 0;
    }
  }

  return { text: levelText, className, priority };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 0) return 'Invalid Size';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const base = 1024;
  const decimals = 2;

  const i = Math.floor(Math.log(bytes) / Math.log(base));
  const size = bytes / Math.pow(base, i);

  return `${size.toFixed(decimals)} ${units[i]}`;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(milliseconds: number): string {
  if (milliseconds < 0) return 'Invalid Duration';
  if (milliseconds === 0) return '0ms';

  const units = [
    { name: 'ms', value: 1 },
    { name: 's', value: 1000 },
    { name: 'min', value: 60 * 1000 },
    { name: 'h', value: 60 * 60 * 1000 },
    { name: 'd', value: 24 * 60 * 60 * 1000 },
  ];

  let remaining = milliseconds;
  const parts: string[] = [];

  // Process from largest to smallest unit
  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i];
    if (unit && (remaining >= unit.value || (i === 0 && parts.length === 0))) {
      const count = Math.floor(remaining / unit.value);
      if (count > 0 || unit.name === 'ms') {
        parts.push(`${count}${unit.name}`);
        remaining -= count * unit.value;
      }

      // Only show two most significant units
      if (parts.length >= 2) break;
    }
  }

  return parts.join(' ');
}

/**
 * Format numbers with locale-specific formatting
 */
export function formatNumber(
  value: number,
  options?: {
    decimals?: number;
    useGrouping?: boolean;
    locale?: string;
  }
): string {
  const { decimals, useGrouping = true, locale = 'en-US' } = options || {};

  try {
    return value.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping,
    });
  } catch {
    return value.toString();
  }
}

/**
 * Format XML string with basic indentation
 */
export function formatXML(
  xml: string,
  options?: {
    indent?: string;
    maxLength?: number;
  }
): string {
  const { indent = '  ', maxLength } = options || {};

  if (!xml || typeof xml !== 'string') {
    return '';
  }

  try {
    // Basic XML formatting - in production would use proper XML parser
    let formatted = xml.replace(/></g, '>\n<').replace(/^\s+|\s+$/g, '');

    // Simple indentation
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const formattedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('</')) {
        indentLevel--;
      }

      formattedLines.push(indent.repeat(Math.max(0, indentLevel)) + trimmed);

      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>')) {
        indentLevel++;
      }
    }

    formatted = formattedLines.join('\n');

    // Truncate if too long
    if (maxLength && formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength - 3) + '...';
    }

    return formatted;
  } catch {
    return xml;
  }
}

/**
 * Format JSON with syntax highlighting classes
 */
export function formatJSON(
  data: any,
  options?: {
    indent?: number;
    maxLength?: number;
  }
): string {
  const { indent = 2, maxLength } = options || {};

  if (data === null || data === undefined) {
    return 'null';
  }

  try {
    let formatted = JSON.stringify(data, null, indent);

    // Truncate if too long
    if (maxLength && formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength - 3) + '...';
    }

    return formatted;
  } catch {
    return String(data);
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(
  text: string,
  maxLength: number,
  options?: {
    wordBoundary?: boolean;
    ellipsis?: string;
  }
): string {
  const { wordBoundary = false, ellipsis = '...' } = options || {};

  if (!text || text.length <= maxLength) {
    return text;
  }

  let truncated = text.substring(0, maxLength - ellipsis.length);

  if (wordBoundary) {
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      truncated = truncated.substring(0, lastSpace);
    }
  }

  return truncated + ellipsis;
}

/**
 * Escape HTML entities
 */
export function escapeHTML(text: string): string {
  if (!text) return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format event data for display
 */
export function formatEventData(
  data: any,
  options?: {
    format?: 'json' | 'table' | 'text';
  }
): string {
  const { format = 'json' } = options || {};

  if (!data) return '';

  try {
    switch (format) {
      case 'json':
        return formatJSON(data);

      case 'table':
        if (typeof data === 'object' && !Array.isArray(data)) {
          return Object.entries(data)
            .map(([key, value]) => `${key}: ${String(value)}`)
            .join('\n');
        }
        return String(data);

      case 'text':
      default:
        return String(data);
    }
  } catch {
    return String(data);
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(timestamp: Date, now: Date = new Date()): string {
  const diff = now.getTime() - timestamp.getTime();

  if (diff < 0) return 'in the future';
  if (diff < 1000) return 'just now';
  if (diff < 60 * 1000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;

  return formatTimestamp(timestamp, { format: 'short' });
}

export default {
  formatTimestamp,
  formatEventLevel,
  formatFileSize,
  formatDuration,
  formatNumber,
  formatXML,
  formatJSON,
  truncateText,
  escapeHTML,
  formatEventData,
  getRelativeTime,
};
