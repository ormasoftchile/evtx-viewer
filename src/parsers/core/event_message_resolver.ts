/**
 * Event Message Resolver
 *
 * Maps technical event strings to user-friendly messages for common Windows events.
 * This compensates for the lack of access to Windows message resources.
 */

/**
 * Common AAD event message mappings
 */
const AAD_MESSAGE_MAPPINGS: { [key: string]: string } = {
  // Authentication operations
  Enumerationstatussetforexistingwebaccountssuccessfully: 'AAD authentication operation started',
  Clientidnormalizationupdatesucceeded: 'AAD client ID normalization succeeded',
  BrowserSSOdataformatsuccessfullyupdated: 'Browser SSO data format updated successfully',
  Upgradedefaultpawntaskcomplete: 'Default pawn task upgrade completed',
  Thecachehasbeenpartitionedsuccessfully: 'The cache has been partitioned successfully',
  CachePartitioning: 'Cache partitioning operation',
  AccountEnumerationStateMigration: 'Account enumeration state migration',
  ClientIdNormalizationUpgrade: 'Client ID normalization upgrade',
  CookieStoreFormatV2: 'Cookie store format update',
  UpdateDefaultPawn: 'Default pawn update',
};

/**
 * Extract user-friendly message from technical event data
 */
export function resolveEventMessage(
  eventId: number,
  provider: string,
  rawMessage: string | undefined,
  _eventData: { [key: string]: any }
): string {
  // If we have no raw message, return a generic message
  if (!rawMessage) {
    return getGenericMessage(eventId, provider);
  }

  // Clean up the raw message for analysis
  const cleanMessage = rawMessage.replace(/[^\w\s]/g, ' ').toLowerCase();

  // Try to find a mapping for AAD events
  if (provider?.toLowerCase().includes('aad')) {
    for (const [pattern, message] of Object.entries(AAD_MESSAGE_MAPPINGS)) {
      if (cleanMessage.includes(pattern.toLowerCase())) {
        return message;
      }
    }
  }

  // Extract error information if present
  const errorMatch = rawMessage.match(/Error:\s*(0x[0-9A-Fa-f]+)/);
  const errorCode = errorMatch ? errorMatch[1] : null;

  // Look for operation descriptions in the message
  const operationMatch = rawMessage.match(/(\w+)\s*\.\s*cpp\s*,\s*line/);
  const operation = operationMatch ? operationMatch[1] : null;

  // Try to create a meaningful message from components
  if (operation && AAD_MESSAGE_MAPPINGS[operation]) {
    let message = AAD_MESSAGE_MAPPINGS[operation];
    if (errorCode) {
      message += ` (${errorCode})`;
    }
    return message;
  }

  // Fall back to generic message
  return getGenericMessage(eventId, provider);
}

/**
 * Extract technical details from raw message for details section
 */
export function extractTechnicalDetails(rawMessage: string | undefined): string | undefined {
  if (!rawMessage) return undefined;

  // Look for C++ logging details
  const cppMatch = rawMessage.match(/Logged\s*at\s*([^.]+\.cpp[^.]+\.[^.]+)/i);
  if (cppMatch && cppMatch[1]) {
    return cppMatch[1].trim();
  }

  // Look for method information
  const methodMatch = rawMessage.match(/method\s*:\s*([^:]+)::\s*Apply/i);
  if (methodMatch && methodMatch[1]) {
    return `Method: ${methodMatch[1].trim()}::Apply`;
  }

  return undefined;
}

/**
 * Generate generic message for unknown events
 */
function getGenericMessage(eventId: number, provider: string): string {
  const providerName = provider || 'Unknown';

  // Common Windows event ID patterns
  switch (eventId) {
    case 1097:
      return `${providerName} operation completed`;
    case 1000:
      return `${providerName} application error`;
    case 1001:
      return `${providerName} application hang`;
    case 4624:
      return 'An account was successfully logged on';
    case 4625:
      return 'An account failed to log on';
    default:
      return `${providerName} event ${eventId}`;
  }
}
