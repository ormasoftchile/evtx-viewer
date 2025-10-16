/**
 * EVTX Data Normalization Utilities
 *
 * Based on proven working implementation from evtx-wasm viewer.
 * Handles Binary XML quirks and data structure normalization.
 */

import { EvtxRecord, EvtxSystemData /*, EvtxEventData */ } from '../types/evtx_types';

/**
 * Normalizes an EVTX record to handle Binary XML quirks
 * Based on the proven working normalization from the WASM viewer
 */
export function normalizeEvtxRecord(record: any): EvtxRecord {
  // Helper to deeply convert Map instances produced by binary XML parsing
  // into plain JavaScript objects so React/TS accessors work as expected.
  const mapToObject = (input: unknown): unknown => {
    if (input instanceof Map) {
      const out: Record<string, unknown> = {};
      input.forEach((v, k) => {
        out[k as string] = mapToObject(v);
      });
      return out;
    }
    if (Array.isArray(input)) {
      return input.map((el) => mapToObject(el));
    }
    return input;
  };

  // Convert Map → object recursively if needed
  const normalized = mapToObject(record) as EvtxRecord;

  // Normalize Provider name so downstream code can simply access
  // `sys.Provider?.Name` without worrying about the nested
  // `#attributes` object that the Binary XML parsing sometimes emits.
  try {
    const sys: any = normalized?.Event?.System ?? {};
    if (sys.Provider && typeof sys.Provider === 'object') {
      const prov: any = sys.Provider;
      const attrs: any = prov['#attributes'];

      // Copy over the embedded Name to a flat field if missing
      if (attrs && attrs.Name && prov.Name === undefined) {
        prov.Name = attrs.Name;
      }

      // Copy over the embedded Guid to a flat field if missing
      if (attrs && attrs.Guid && prov.Guid === undefined) {
        prov.Guid = attrs.Guid;
      }

      // Expose the attributes object under a predictable property so
      // that existing fallbacks `Provider_attributes?.Name` still work.
      if (attrs && sys.Provider_attributes === undefined) {
        sys.Provider_attributes = attrs;
      }
    }

    // Normalize TimeCreated similarly
    if (sys.TimeCreated && typeof sys.TimeCreated === 'object') {
      const timeCreated: any = sys.TimeCreated;
      const attrs: any = timeCreated['#attributes'];

      if (attrs && attrs.SystemTime && timeCreated.SystemTime === undefined) {
        timeCreated.SystemTime = attrs.SystemTime;
      }

      if (attrs && sys.TimeCreated_attributes === undefined) {
        sys.TimeCreated_attributes = attrs;
      }
    }

    // Normalize Execution similarly
    if (sys.Execution && typeof sys.Execution === 'object') {
      const execution: any = sys.Execution;
      const attrs: any = execution['#attributes'];

      if (attrs && attrs.ProcessID && execution.ProcessID === undefined) {
        execution.ProcessID = attrs.ProcessID;
      }

      if (attrs && attrs.ThreadID && execution.ThreadID === undefined) {
        execution.ThreadID = attrs.ThreadID;
      }

      if (attrs && sys.Execution_attributes === undefined) {
        sys.Execution_attributes = attrs;
      }
    }

    // Normalize Security similarly
    if (sys.Security && typeof sys.Security === 'object') {
      const security: any = sys.Security;
      const attrs: any = security['#attributes'];

      if (attrs && attrs.UserID && security.UserID === undefined) {
        security.UserID = attrs.UserID;
      }

      if (attrs && sys.Security_attributes === undefined) {
        sys.Security_attributes = attrs;
      }
    }
  } catch {
    /* ignore – best-effort normalization */
  }

  return normalized;
}

/**
 * Extracts a readable message from EventData
 * Handles the Error/ErrorMessage/AdditionalInformation pattern you need
 */
export function extractEventMessage(record: EvtxRecord): string | undefined {
  const eventData = record.Event.EventData;
  if (!eventData) return undefined;

  // Handle Data array or single Data element
  const dataElements = Array.isArray(eventData.Data)
    ? eventData.Data
    : eventData.Data
      ? [eventData.Data]
      : [];

  if (dataElements.length === 0) {
    // Fallback to #text if no Data elements
    return eventData['#text'] ? String(eventData['#text']) : undefined;
  }

  // Build message from Data elements
  const messageParts: string[] = [];

  for (const element of dataElements) {
    const name = element['#attributes']?.Name;
    const text = element['#text'];

    if (name && text) {
      messageParts.push(`${name} ${text}`);
    } else if (text) {
      messageParts.push(String(text));
    }
  }

  return messageParts.length > 0 ? messageParts.join(' ') : undefined;
}

/**
 * Gets provider name with fallback handling
 */
export function getProviderName(system: EvtxSystemData): string | undefined {
  return system.Provider?.Name || system.Provider_attributes?.Name || undefined;
}

/**
 * Gets timestamp with fallback handling
 */
export function getTimestamp(system: EvtxSystemData): Date | undefined {
  const timeString = system.TimeCreated?.SystemTime || system.TimeCreated_attributes?.SystemTime;

  return timeString ? new Date(timeString) : undefined;
}

/**
 * Gets process and thread IDs with fallback handling
 */
export function getExecutionInfo(system: EvtxSystemData): {
  processId?: number;
  threadId?: number;
} {
  const processId = system.Execution?.ProcessID || system.Execution_attributes?.ProcessID;
  const threadId = system.Execution?.ThreadID || system.Execution_attributes?.ThreadID;

  const result: { processId?: number; threadId?: number } = {};
  if (processId !== undefined) result.processId = processId;
  if (threadId !== undefined) result.threadId = threadId;

  return result;
}

/**
 * Gets user ID with fallback handling
 */
export function getUserId(system: EvtxSystemData): string | undefined {
  return system.Security?.UserID || system.Security_attributes?.UserID || undefined;
}
