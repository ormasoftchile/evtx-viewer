/**
 * Event Data Extractor for EVTX Files
 *
 * Converts parsed EventRecord objects into structured EvtxRecord format
 * with normalized fields, enhanced data extraction, and comprehensive error handling.
 *
 * @fileoverview EVTX Event Data Extraction with Constitutional Compliance
 * @version 1.0.0
 * @author EVTX Viewer Team
 *
 * @constitutional
 * - Performance: <50ms extraction per event record
 * - Memory: Efficient XML parsing without full DOM retention
 * - Accessibility: Structured data output for screen readers
 * - Security: Safe XML parsing with entity resolution disabled
 */

import { DOMParser } from '@xmldom/xmldom';

import { EventRecord } from '../models/event_record';
import {
  BinaryXmlExtractor,
  BinaryXmlOptions,
  BinaryXmlExtractionResult,
} from './binary_xml_extractor';
import {
  EvtxRecord,
  EvtxSystemData,
  EvtxEventData,
  DataElement,
} from '../../shared/types/evtx_types';
import {
  normalizeEvtxRecord,
  extractEventMessage,
  getProviderName,
  getTimestamp,
  getExecutionInfo,
  getUserId,
} from '../../shared/utils/evtx_normalizer';

/**
 * Event data extraction options
 */
export interface ExtractionOptions {
  /**
   * Include raw XML data in extraction
   */
  includeRawXml?: boolean;

  /**
   * Maximum depth for nested object extraction
   */
  maxDepth?: number;

  /**
   * Field name mappings for standardization
   */
  fieldMappings?: { [key: string]: string };

  /**
   * Data type conversions
   */
  typeConversions?: { [field: string]: 'string' | 'number' | 'boolean' | 'date' };

  /**
   * Enable binary XML parsing for complete EventData extraction
   */
  enableBinaryXml?: boolean;

  /**
   * Binary XML parsing options
   */
  binaryXmlOptions?: BinaryXmlOptions;

  /**
   * Include binary XML debug information
   */
  includeBinaryXmlDebug?: boolean;
}

/**
 * Extracted event data structure
 */
export interface ExtractedEventData {
  /**
   * Core event properties
   */
  core: {
    eventId: number;
    level: number;
    provider: string;
    channel: string;
    timestamp: Date;
    computer: string;
    eventRecordId: string;
  };

  /**
   * System-related data
   */
  system?: {
    processId?: number;
    threadId?: number;
    userId?: string;
    version?: number;
    task?: number;
    opcode?: number;
    keywords?: string;
  };

  /**
   * Event-specific data
   */
  eventData?: { [key: string]: any };

  /**
   * User-defined data
   */
  userData?: { [key: string]: any };

  /**
   * Correlation data
   */
  correlation?: {
    activityId?: string;
    relatedActivityId?: string;
  };

  /**
   * Parsed message
   */
  message?: string;

  /**
   * Raw XML (if requested)
   */
  rawXml?: string;

  /**
   * Binary XML processing information
   */
  binaryXml?: {
    /**
     * Whether binary XML was detected and processed
     */
    wasBinaryXml: boolean;

    /**
     * Template ID used (if any)
     */
    templateId?: number;

    /**
     * Number of substitutions processed
     */
    substitutionCount?: number;

    /**
     * Any parsing errors encountered
     */
    errors?: string[];

    /**
     * Debug information (if enabled)
     */
    debugInfo?: {
      templateCacheHits: number;
      parsingTimeMs: number;
      binaryDataSize: number;
    };
  };

  /**
   * Extraction metadata
   */
  meta: {
    extractedAt: Date;
    extractionVersion: string;
    warnings?: string[];
  };
}

/**
 * Data extraction statistics
 */
export interface ExtractionStatistics {
  totalRecords: number;
  successfulExtractions: number;
  failedExtractions: number;
  warnings: number;
  processingTime: number;
  averageTimePerRecord: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
}

/**
 * Event data extractor class - Enhanced for real EVTX data processing
 */
export class EventExtractor {
  private static readonly DEFAULT_OPTIONS: ExtractionOptions = {
    includeRawXml: false,
    maxDepth: 10,
    fieldMappings: {},
    typeConversions: {},
    enableBinaryXml: true, // Enable by default
    includeBinaryXmlDebug: false,
  };

  private static readonly VERSION = '1.0.0';
  private static parser = new DOMParser();
  private static binaryXmlExtractor = new BinaryXmlExtractor({
    enableTemplateCache: true,
    maxCachedTemplates: 1000,
    enableErrorRecovery: true,
    includeDebugInfo: false,
  });

  /**
   * Convert XML event data to EventRecord object
   * This bridges the gap between our enhanced EVTX parser's XML output and EventRecord model
   */
  public static xmlToEventRecord(
    xmlString: string,
    eventRecordId: bigint = BigInt(0)
  ): EventRecord | null {
    try {
      const doc = this.parser.parseFromString(xmlString, 'text/xml');
      const eventElement = doc.getElementsByTagName('Event')[0];

      if (!eventElement) {
        return null;
      }

      // Extract System data
      const systemElement = eventElement.getElementsByTagName('System')[0];
      if (!systemElement) {
        return null;
      }

      // Extract core system fields
      const eventId = this.extractElementTextAsNumber(systemElement, 'EventID') || 0;
      const level = this.extractElementTextAsNumber(systemElement, 'Level') || 4;
      const provider = this.extractProviderName(systemElement) || 'Unknown';
      const providerGuid = this.extractProviderGuid(systemElement);
      const channel = this.extractElementText(systemElement, 'Channel') || 'Unknown';
      const computer = this.extractElementText(systemElement, 'Computer') || 'Unknown';
      const timestamp = this.extractTimestamp(systemElement) || new Date();

      // Extract optional system fields
      const version = this.extractElementTextAsNumber(systemElement, 'Version');
      const task = this.extractElementTextAsNumber(systemElement, 'Task');
      const taskName = this.extractTaskName(systemElement);
      const opcode = this.extractElementTextAsNumber(systemElement, 'Opcode');
      const opcodeName = this.extractOpcodeName(systemElement);
      const keywords = this.extractKeywords(systemElement);
      const keywordsNames = this.extractKeywordsNames(systemElement);
      const processId = this.extractElementTextAsNumber(systemElement, 'Execution', 'ProcessID');
      const threadId = this.extractElementTextAsNumber(systemElement, 'Execution', 'ThreadID');
      const userId = this.extractSecurityUserId(systemElement);
      const activityId = this.extractElementAttribute(systemElement, 'Correlation', 'ActivityID');
      const relatedActivityId = this.extractElementAttribute(
        systemElement,
        'Correlation',
        'RelatedActivityID'
      );

      // Extract EventData using Binary XML parser
      const eventDataElement = eventElement.getElementsByTagName('EventData')[0];
      let eventData: { [key: string]: any } | undefined;
      let binaryXmlResult: BinaryXmlExtractionResult | undefined;

      if (eventDataElement) {
        // Try binary XML extraction first (enhanced parsing)
        binaryXmlResult = this.binaryXmlExtractor.extractEventData(xmlString);

        if (binaryXmlResult.wasBinaryXml && Object.keys(binaryXmlResult.eventData).length > 0) {
          // Use binary XML parsed data
          eventData = binaryXmlResult.eventData;
        } else {
          // Fallback to regular XML parsing
          eventData = this.extractEventDataFromXml(eventDataElement);
        }
      }

      // Extract UserData
      const userDataElement = eventElement.getElementsByTagName('UserData')[0];
      const userData = userDataElement ? this.extractUserDataFromXml(userDataElement) : undefined;

      // Create EventRecord object - handle optional properties properly
      const eventRecord = new EventRecord({
        eventRecordId,
        eventId,
        ...(version !== undefined && { version }),
        level,
        ...(task !== undefined && { task }),
        ...(taskName && { taskName }),
        ...(opcode !== undefined && { opcode }),
        ...(opcodeName && { opcodeName }),
        ...(keywords !== undefined && { keywords }),
        ...(keywordsNames && keywordsNames.length > 0 && { keywordsNames }),
        timestamp,
        provider,
        ...(providerGuid && { providerGuid }),
        channel,
        computer,
        ...(userId && { userId }),
        ...(processId !== undefined && { processId }),
        ...(threadId !== undefined && { threadId }),
        xml: xmlString,
        ...(eventData && { eventData }),
        ...(userData && { userData }),
        ...(activityId && { activityId }),
        ...(relatedActivityId && { relatedActivityId }),
      });

      return eventRecord;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract provider name from System element
   */
  private static extractProviderName(systemElement: any): string | null {
    const providerElement = systemElement.getElementsByTagName('Provider')[0];
    if (!providerElement) return null;

    return (
      providerElement.getAttribute('Name') ||
      providerElement.getAttribute('Guid') ||
      this.extractElementText(systemElement, 'Provider')
    );
  }

  /**
   * Extract timestamp from TimeCreated element
   */
  private static extractTimestamp(systemElement: any): Date | null {
    const timeCreatedElement = systemElement.getElementsByTagName('TimeCreated')[0];
    if (!timeCreatedElement) return null;

    const systemTime = timeCreatedElement.getAttribute('SystemTime');
    if (systemTime) {
      try {
        return new Date(systemTime);
      } catch {
        // Fall through to alternative parsing
      }
    }

    // Try to parse text content as timestamp
    const textContent = timeCreatedElement.textContent;
    if (textContent) {
      try {
        return new Date(textContent);
      } catch {
        // Return null if parsing fails
      }
    }

    return null;
  }

  /**
   * Extract keywords as bigint
   */
  private static extractKeywords(systemElement: any): bigint | undefined {
    const keywordsText = this.extractElementText(systemElement, 'Keywords');
    if (!keywordsText) return undefined;

    try {
      // Keywords can be in hex format (0x...) or decimal
      if (keywordsText.startsWith('0x') || keywordsText.startsWith('0X')) {
        return BigInt(keywordsText);
      } else {
        return BigInt(keywordsText);
      }
    } catch {
      return undefined;
    }
  }

  /**
   * Extract Security UserID
   */
  private static extractSecurityUserId(systemElement: any): string | undefined {
    const securityElement = systemElement.getElementsByTagName('Security')[0];
    if (!securityElement) return undefined;

    return securityElement.getAttribute('UserID') || undefined;
  }

  /**
   * Extract Provider GUID
   */
  private static extractProviderGuid(systemElement: any): string | undefined {
    const providerElement = systemElement.getElementsByTagName('Provider')[0];
    if (!providerElement) return undefined;

    return providerElement.getAttribute('Guid') || undefined;
  }

  /**
   * Extract Task friendly name
   */
  private static extractTaskName(systemElement: any): string | undefined {
    const taskElement = systemElement.getElementsByTagName('Task')[0];
    if (!taskElement) return undefined;

    return taskElement.getAttribute('Name') || undefined;
  }

  /**
   * Extract Opcode friendly name
   */
  private static extractOpcodeName(systemElement: any): string | undefined {
    const opcodeElement = systemElement.getElementsByTagName('Opcode')[0];
    if (!opcodeElement) return undefined;

    return opcodeElement.getAttribute('Name') || undefined;
  }

  /**
   * Extract Keywords friendly names as array
   */
  private static extractKeywordsNames(systemElement: any): string[] | undefined {
    const keywordsElement = systemElement.getElementsByTagName('Keywords')[0];
    if (!keywordsElement) return undefined;

    const nameAttr = keywordsElement.getAttribute('Name');
    if (nameAttr) {
      return nameAttr
        .split(',')
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);
    }

    return undefined;
  }

  /**
   * Extract text content from named element
   */
  private static extractElementText(parentElement: any, elementName: string): string | null {
    const elements = parentElement.getElementsByTagName(elementName);
    if (elements.length === 0) return null;

    const element = elements[0];
    return element?.textContent?.trim() || null;
  }

  /**
   * Extract text content as number
   */
  private static extractElementTextAsNumber(
    parentElement: any,
    elementName: string,
    attributeName?: string
  ): number | undefined {
    const elements = parentElement.getElementsByTagName(elementName);
    if (elements.length === 0) return undefined;

    const element = elements[0];
    if (!element) return undefined;

    let textValue: string | null = null;

    if (attributeName) {
      textValue = element.getAttribute(attributeName);
    } else {
      textValue = element.textContent?.trim() || null;
    }

    if (!textValue) return undefined;

    try {
      return parseInt(textValue, 10);
    } catch {
      return undefined;
    }
  }

  /**
   * Extract attribute value from named element
   */
  private static extractElementAttribute(
    parentElement: any,
    elementName: string,
    attributeName: string
  ): string | null {
    const elements = parentElement.getElementsByTagName(elementName);
    if (elements.length === 0) return null;

    const element = elements[0];
    return element?.getAttribute(attributeName) || undefined;
  }

  /**
   * Extract EventData from EventData XML element
   */
  private static extractEventDataFromXml(
    eventDataElement: any
  ): { [key: string]: any } | undefined {
    const result: { [key: string]: any } = {};
    let hasData = false;

    // Process Data elements (named parameters)
    const dataElements = eventDataElement.getElementsByTagName('Data');
    for (let i = 0; i < dataElements.length; i++) {
      const dataElement = dataElements[i];
      if (!dataElement) continue;

      const name = dataElement.getAttribute('Name');
      const value = dataElement.textContent?.trim();

      if (name && value !== null) {
        result[name] = this.parseDataValue(value);
        hasData = true;
      }
    }

    // Process any other child elements as key-value pairs
    for (let i = 0; i < eventDataElement.childNodes.length; i++) {
      const child = eventDataElement.childNodes[i];
      if (!child || child.nodeType !== 1) continue; // Element node

      const element = child as any;
      if (element.tagName !== 'Data') {
        const name = element.tagName;
        const value = element.textContent?.trim();
        if (name && value !== null) {
          result[name] = this.parseDataValue(value);
          hasData = true;
        }
      }
    }

    return hasData ? result : undefined;
  }

  /**
   * Extract UserData from UserData XML element
   */
  private static extractUserDataFromXml(userDataElement: any): { [key: string]: any } | undefined {
    // Similar to EventData extraction but for UserData section
    const result: { [key: string]: any } = {};
    let hasData = false;

    // Process all child elements as key-value pairs
    for (let i = 0; i < userDataElement.childNodes.length; i++) {
      const child = userDataElement.childNodes[i];
      if (!child || child.nodeType !== 1) continue; // Element node

      const element = child as any;
      const name = element.tagName;
      const value = element.textContent?.trim();
      if (name && value !== null) {
        result[name] = this.parseDataValue(value);
        hasData = true;
      }
    }

    return hasData ? result : undefined;
  }

  /**
   * Parse data value with basic type inference
   */
  private static parseDataValue(value: string): any {
    if (!value) return value;

    // Try to parse as number
    if (/^\d+$/.test(value)) {
      const num = parseInt(value, 10);
      if (!isNaN(num)) return num;
    }

    // Try to parse as boolean
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === 'false') {
      return lowerValue === 'true';
    }

    // Try to parse as date (ISO format)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date;
      } catch {
        // Fall through to string
      }
    }

    // Return as string
    return value;
  }

  /**
   * Process multiple XML event strings and convert them to EventRecord objects
   * This is the main integration point with the enhanced EVTX parser
   */
  public static processXmlEvents(xmlEvents: string[]): EventRecord[] {
    const records: EventRecord[] = [];

    for (let i = 0; i < xmlEvents.length; i++) {
      const xmlString = xmlEvents[i];
      if (!xmlString || xmlString.trim().length === 0) continue;

      try {
        const eventRecord = this.xmlToEventRecord(xmlString, BigInt(i + 1));
        if (eventRecord) {
          records.push(eventRecord);
        }
      } catch (error) {
        // Continue processing other events
      }
    }

    return records;
  }

  /**
   * Enhanced batch extraction that works with XML input
   * Combines XML-to-EventRecord conversion with structured data extraction
   */
  public static extractFromXmlBatch(
    xmlEvents: string[],
    options: ExtractionOptions = {}
  ): { data: ExtractedEventData[]; statistics: ExtractionStatistics; records: EventRecord[] } {
    // First convert XML to EventRecord objects
    const eventRecords = this.processXmlEvents(xmlEvents);

    // Then extract structured data from EventRecord objects
    const extractionResult = this.extractBatch(eventRecords, options);

    // Return both extracted data and original records for further processing
    return {
      data: extractionResult.data,
      statistics: extractionResult.statistics,
      records: eventRecords,
    };
  }

  /**
   * Extract data from a single event record
   */
  public static extractEventData(
    record: EventRecord,
    options: ExtractionOptions = {}
  ): ExtractedEventData {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const warnings: string[] = [];

    try {
      // Core event data - processing record
      console.log('🔍 EventExtractor processing record:', {
        eventId: record.eventId,
        provider: record.provider,
        channel: record.channel,
        computer: record.computer,
        level: record.level,
        hasXml: !!record.xml,
        xmlLength: record.xml?.length,
      });

      const core = {
        eventId: record.eventId,
        level: record.level,
        provider: record.provider,
        channel: record.channel,
        timestamp: record.timestamp,
        computer: record.computer,
        eventRecordId: record.eventRecordId.toString(),
      };

      // System data
      const system: ExtractedEventData['system'] = {};
      if (record.processId !== undefined) system.processId = record.processId;
      if (record.threadId !== undefined) system.threadId = record.threadId;
      if (record.userId !== undefined) system.userId = record.userId;
      if (record.version !== undefined) system.version = record.version;
      if (record.task !== undefined) system.task = record.task;
      if (record.opcode !== undefined) system.opcode = record.opcode;
      if (record.keywords !== undefined) system.keywords = record.keywords.toString();

      // Event data - Enhanced with Binary XML support
      let eventData = record.eventData;
      let binaryXmlResult: BinaryXmlExtractionResult | undefined;
      let messageContent: string | undefined;

      // If Binary XML is enabled and we have raw XML, try enhanced parsing
      if (mergedOptions.enableBinaryXml && record.xml) {
        console.log('🔍 Raw XML for Binary XML processing:', record.xml?.substring(0, 500) + '...');

        binaryXmlResult = this.binaryXmlExtractor.extractEventData(record.xml);

        console.log('🔍 Binary XML extraction result:', {
          wasBinaryXml: binaryXmlResult.wasBinaryXml,
          eventDataKeys: Object.keys(binaryXmlResult.eventData),
          eventDataSample: binaryXmlResult.eventData,
          errors: binaryXmlResult.errors,
        });

        // DEBUG: Log the actual eventData content to see structured fields
        console.log(
          '🔍 Detailed eventData content:',
          JSON.stringify(binaryXmlResult.eventData, null, 2)
        );

        if (binaryXmlResult.wasBinaryXml && Object.keys(binaryXmlResult.eventData).length > 0) {
          // Merge binary XML parsed data with existing data, preferring binary XML fields
          eventData = {
            ...eventData, // Start with original event data
            ...binaryXmlResult.eventData, // Overlay binary XML enhancements
          };
          warnings.push('Enhanced with Binary XML parsing');
        } else if (Object.keys(binaryXmlResult.eventData).length > 0) {
          // Even if not binary XML, merge any additional fields found
          eventData = {
            ...eventData,
            ...binaryXmlResult.eventData,
          };
          warnings.push('Enhanced with additional XML parsing');
        }

        // Look for message content in the Binary XML results
        if (binaryXmlResult.eventData.EventMessage) {
          messageContent = binaryXmlResult.eventData.EventMessage;
        } else if (binaryXmlResult.eventData.EventDataContent) {
          // Try to extract message from EventData content
          messageContent = this.extractMessageFromEventDataContent(
            binaryXmlResult.eventData.EventDataContent
          );
        }
      }

      // If no message from Binary XML, try the record's message
      if (!messageContent && record.message) {
        messageContent = record.message;
      }

      // If still no message, try to extract from raw XML
      if (!messageContent && record.xml) {
        messageContent = this.extractMessageFromXml(record.xml);
      }

      console.log('🔍 Raw message content before resolution:', messageContent);

      const processedEventData = this.processEventData(eventData, mergedOptions, warnings);

      // User data
      const userData = this.processUserData(record.userData, mergedOptions, warnings);

      // Correlation data
      const correlation: ExtractedEventData['correlation'] = {};
      if (record.activityId) correlation.activityId = record.activityId;
      if (record.relatedActivityId) correlation.relatedActivityId = record.relatedActivityId;

      // Build result
      const extracted: ExtractedEventData = {
        core,
        meta: {
          extractedAt: new Date(),
          extractionVersion: this.VERSION,
        },
      };

      if (Object.keys(system).length > 0) {
        extracted.system = system;
      }

      if (processedEventData) {
        extracted.eventData = processedEventData;
      }

      if (userData) {
        extracted.userData = userData;
      }

      if (Object.keys(correlation).length > 0) {
        extracted.correlation = correlation;
      }

      if (messageContent) {
        extracted.message = messageContent;
        console.log('🔍 Setting message content:', messageContent);
      } else {
        console.log('🔍 No message content found');
      }

      if (mergedOptions.includeRawXml && record.xml) {
        extracted.rawXml = record.xml;
      }

      // Use structured EventData to build proper messages
      let finalMessage = messageContent;

      if (eventData && typeof eventData === 'object') {
        // Check for structured Windows event data fields
        const error = eventData.Error || eventData.error;
        const errorMessage = eventData.ErrorMessage || eventData.errorMessage;
        const additionalInfo = eventData.AdditionalInformation || eventData.additionalInformation;

        // If we have structured data, build a comprehensive message
        if (error || errorMessage || additionalInfo) {
          const messageParts = [];

          if (error) {
            messageParts.push(`Error ${error}`);
          }

          if (errorMessage) {
            messageParts.push(`ErrorMessage: ${errorMessage}`);
          }

          if (additionalInfo) {
            messageParts.push(`AdditionalInformation: ${additionalInfo}`);
          }

          finalMessage = messageParts.join(' ');
          console.log('🔍 Built structured message:', finalMessage);
        }
      }

      // Use the structured message if available, otherwise fall back to original
      if (finalMessage) {
        extracted.message = finalMessage;
      } else if (record.message) {
        extracted.message = record.message;
      }

      if (warnings.length > 0) {
        extracted.meta.warnings = warnings;
      }

      if (mergedOptions.includeRawXml) {
        extracted.rawXml = record.xml;
      }

      // Include binary XML debug info if enabled
      if (mergedOptions.includeBinaryXmlDebug && binaryXmlResult) {
        extracted.binaryXml = binaryXmlResult;
      }

      return extracted;
    } catch (error) {
      console.error('🚨 EventExtractor error - falling back to Unknown values:', error);
      console.error('🚨 Record data:', {
        eventId: record.eventId,
        provider: record.provider,
        channel: record.channel,
        computer: record.computer,
      });
      // Return minimal data on error
      return {
        core: {
          eventId: record.eventId || 0,
          level: record.level || 4,
          provider: record.provider || 'Unknown',
          channel: record.channel || 'Unknown',
          timestamp: record.timestamp || new Date(),
          computer: record.computer || 'Unknown',
          eventRecordId: record.eventRecordId?.toString() || '0',
        },
        meta: {
          extractedAt: new Date(),
          extractionVersion: this.VERSION,
          warnings: [`Extraction failed: ${(error as Error).message}`],
        },
      };
    }
  }

  /**
   * Extract data from a single event record in EvtxRecord format
   * This is the new standardized format based on the proven WASM implementation
   */
  public static extractEvtxRecord(
    record: EventRecord,
    options: ExtractionOptions = {}
  ): EvtxRecord {
    const mergedOptions = { ...this.DEFAULT_OPTIONS, ...options };

    try {
      console.log('🔍 EventExtractor processing record for EvtxRecord format:', {
        eventId: record.eventId,
        provider: record.provider,
        channel: record.channel,
        computer: record.computer,
        level: record.level,
        hasXml: !!record.xml,
        xmlLength: record.xml?.length,
      });

      // Build System section
      const system: EvtxSystemData = {
        Provider: {
          Name: record.provider,
        },
        EventID: record.eventId,
        Level: record.level,
        Channel: record.channel,
        Computer: record.computer,
        EventRecordID: Number(record.eventRecordId),
        TimeCreated: {
          SystemTime: record.timestamp.toISOString(),
        },
      };

      // Add optional system fields
      if (record.processId !== undefined || record.threadId !== undefined) {
        system.Execution = {};
        if (record.processId !== undefined) system.Execution.ProcessID = record.processId;
        if (record.threadId !== undefined) system.Execution.ThreadID = record.threadId;
      }

      if (record.userId) {
        system.Security = {
          UserID: record.userId,
        };
      }

      if (record.version !== undefined) system.Version = record.version;
      if (record.task !== undefined) system.Task = record.task;
      if (record.opcode !== undefined) system.Opcode = record.opcode;
      if (record.keywords !== undefined) system.Keywords = record.keywords.toString();

      // Build EventData section
      let eventData: EvtxEventData | undefined;
      let binaryXmlResult: BinaryXmlExtractionResult | undefined;

      // Try Binary XML extraction if enabled
      if (mergedOptions.enableBinaryXml && record.xml) {
        console.log('🔍 Attempting Binary XML extraction for EvtxRecord format');

        binaryXmlResult = this.binaryXmlExtractor.extractEventData(record.xml);

        console.log('🔍 Binary XML extraction result for EvtxRecord:', {
          wasBinaryXml: binaryXmlResult.wasBinaryXml,
          eventDataKeys: Object.keys(binaryXmlResult.eventData),
          eventDataSample: binaryXmlResult.eventData,
          errors: binaryXmlResult.errors,
        });

        // Convert extracted data to Data elements
        if (Object.keys(binaryXmlResult.eventData).length > 0) {
          const dataElements: DataElement[] = [];

          for (const [key, value] of Object.entries(binaryXmlResult.eventData)) {
            if (value !== undefined && value !== null) {
              dataElements.push({
                '#attributes': {
                  Name: key,
                },
                '#text': String(value),
              });
            }
          }

          if (dataElements.length > 0) {
            eventData = {
              Data: dataElements,
            };
          }
        }
      }

      // Fallback to basic eventData if no Binary XML result
      if (!eventData && record.eventData && Object.keys(record.eventData).length > 0) {
        const dataElements: DataElement[] = [];

        for (const [key, value] of Object.entries(record.eventData)) {
          if (value !== undefined && value !== null) {
            dataElements.push({
              '#attributes': {
                Name: key,
              },
              '#text': String(value),
            });
          }
        }

        if (dataElements.length > 0) {
          eventData = {
            Data: dataElements,
          };
        }
      }

      // Build the EvtxRecord
      const evtxRecord: EvtxRecord = {
        Event: {
          System: system,
        },
      };

      // Add EventData if present
      if (eventData) {
        evtxRecord.Event.EventData = eventData;
      }

      // Add UserData if present
      if (record.userData) {
        evtxRecord.Event.UserData = record.userData;
      }

      // Normalize the record using the proven normalization logic
      const normalizedRecord = normalizeEvtxRecord(evtxRecord);

      console.log('🔍 Generated EvtxRecord:', {
        system: normalizedRecord.Event.System,
        eventData: normalizedRecord.Event.EventData,
        message: extractEventMessage(normalizedRecord),
      });

      // 🧪 TEST: Compare old vs new format for debugging
      console.log('🧪 EvtxRecord Format Comparison:');
      console.log('🧪 Provider Name (new):', getProviderName(normalizedRecord.Event.System));
      console.log('🧪 Event Message (new):', extractEventMessage(normalizedRecord));
      console.log('🧪 Timestamp (new):', getTimestamp(normalizedRecord.Event.System));
      console.log('🧪 Execution Info (new):', getExecutionInfo(normalizedRecord.Event.System));

      return normalizedRecord;
    } catch (error) {
      console.error('🚨 EventExtractor error in EvtxRecord extraction:', error);

      // Return minimal EvtxRecord on error
      return {
        Event: {
          System: {
            Provider: { Name: record.provider || 'Unknown' },
            EventID: record.eventId || 0,
            Level: record.level || 4,
            Channel: record.channel || 'Unknown',
            Computer: record.computer || 'Unknown',
            EventRecordID: Number(record.eventRecordId) || 0,
            TimeCreated: {
              SystemTime: (record.timestamp || new Date()).toISOString(),
            },
          },
        },
      };
    }
  }

  /**
   * Extract data from multiple event records with statistics
   */
  public static extractBatch(
    records: EventRecord[],
    options: ExtractionOptions = {}
  ): { data: ExtractedEventData[]; statistics: ExtractionStatistics } {
    const startTime = performance.now();
    const initialMemory = process.memoryUsage().heapUsed;
    let peakMemory = initialMemory;

    const results: ExtractedEventData[] = [];
    let successCount = 0;
    let failureCount = 0;
    let warningCount = 0;

    for (const record of records) {
      try {
        const extracted = this.extractEventData(record, options);
        results.push(extracted);
        successCount++;

        if (extracted.meta.warnings && extracted.meta.warnings.length > 0) {
          warningCount += extracted.meta.warnings.length;
        }

        // Track memory usage
        const currentMemory = process.memoryUsage().heapUsed;
        if (currentMemory > peakMemory) {
          peakMemory = currentMemory;
        }
      } catch (error) {
        failureCount++;
        // Failed to extract event data - add to warnings

        // Add minimal error record
        results.push({
          core: {
            eventId: 0,
            level: 1,
            provider: 'Error',
            channel: 'System',
            timestamp: new Date(),
            computer: 'Unknown',
            eventRecordId: '0',
          },
          meta: {
            extractedAt: new Date(),
            extractionVersion: this.VERSION,
            warnings: [`Extraction error: ${(error as Error).message}`],
          },
        });
      }
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage().heapUsed;
    const processingTime = endTime - startTime;

    const statistics: ExtractionStatistics = {
      totalRecords: records.length,
      successfulExtractions: successCount,
      failedExtractions: failureCount,
      warnings: warningCount,
      processingTime,
      averageTimePerRecord: processingTime / records.length,
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
      },
    };

    return { data: results, statistics };
  }

  /**
   * Process event data with field mapping and type conversion
   */
  private static processEventData(
    eventData: { [key: string]: any } | undefined,
    options: ExtractionOptions,
    warnings: string[]
  ): { [key: string]: any } | undefined {
    if (!eventData || Object.keys(eventData).length === 0) {
      return undefined;
    }

    const processed: { [key: string]: any } = {};

    for (const [key, value] of Object.entries(eventData)) {
      try {
        // Apply field mapping
        const mappedKey = options.fieldMappings?.[key] || key;

        // Apply type conversion
        const targetType = options.typeConversions?.[key];
        const convertedValue = this.convertValue(value, targetType, warnings);

        processed[mappedKey] = convertedValue;
      } catch (error) {
        warnings.push(`Failed to process event data field '${key}': ${(error as Error).message}`);
        processed[key] = value; // Keep original value on error
      }
    }

    return processed;
  }

  /**
   * Process user data
   */
  private static processUserData(
    userData: { [key: string]: any } | undefined,
    options: ExtractionOptions,
    warnings: string[]
  ): { [key: string]: any } | undefined {
    if (!userData || Object.keys(userData).length === 0) {
      return undefined;
    }

    // Similar processing to event data
    return this.processEventData(userData, options, warnings);
  }

  /**
   * Convert value to specified type
   */
  private static convertValue(value: any, targetType?: string, warnings?: string[]): any {
    if (!targetType || value === null || value === undefined) {
      return value;
    }

    try {
      switch (targetType) {
        case 'string':
          return String(value);

        case 'number':
          if (typeof value === 'string') {
            const num = Number(value);
            if (isNaN(num)) {
              warnings?.push(`Failed to convert '${value}' to number`);
              return value;
            }
            return num;
          }
          return Number(value);

        case 'boolean':
          if (typeof value === 'string') {
            const lower = value.toLowerCase();
            return lower === 'true' || lower === '1' || lower === 'yes';
          }
          return Boolean(value);

        case 'date':
          if (value instanceof Date) {
            return value;
          }
          if (typeof value === 'string' || typeof value === 'number') {
            const date = new Date(value);
            if (isNaN(date.getTime())) {
              warnings?.push(`Failed to convert '${value}' to date`);
              return value;
            }
            return date;
          }
          return value;

        default:
          return value;
      }
    } catch (error) {
      warnings?.push(`Type conversion failed for value '${value}': ${(error as Error).message}`);
      return value;
    }
  }

  /**
   * Extract data from multiple event records in EvtxRecord format with statistics
   */
  public static extractEvtxRecordBatch(
    records: EventRecord[],
    options: ExtractionOptions = {}
  ): { data: EvtxRecord[]; statistics: ExtractionStatistics } {
    const startTime = performance.now();
    const initialMemory = process.memoryUsage().heapUsed;
    let peakMemory = initialMemory;

    const results: EvtxRecord[] = [];
    let successCount = 0;
    let failureCount = 0;
    let warningCount = 0;

    for (const record of records) {
      try {
        const extracted = this.extractEvtxRecord(record, options);
        results.push(extracted);
        successCount++;

        // Track memory usage
        const currentMemory = process.memoryUsage().heapUsed;
        if (currentMemory > peakMemory) {
          peakMemory = currentMemory;
        }
      } catch (error) {
        failureCount++;
        console.error(`Failed to extract record ${record.eventRecordId}:`, error);

        // Add minimal record on failure
        results.push({
          Event: {
            System: {
              Provider: { Name: record.provider || 'Unknown' },
              EventID: record.eventId || 0,
              Level: record.level || 4,
              Channel: record.channel || 'Unknown',
              Computer: record.computer || 'Unknown',
              EventRecordID: Number(record.eventRecordId) || 0,
              TimeCreated: {
                SystemTime: (record.timestamp || new Date()).toISOString(),
              },
            },
          },
        });
      }
    }

    const endTime = performance.now();
    const finalMemory = process.memoryUsage().heapUsed;

    const statistics: ExtractionStatistics = {
      totalRecords: records.length,
      successfulExtractions: successCount,
      failedExtractions: failureCount,
      warnings: warningCount,
      processingTime: endTime - startTime,
      averageTimePerRecord: (endTime - startTime) / records.length,
      memoryUsage: {
        initial: initialMemory / 1024 / 1024,
        peak: peakMemory / 1024 / 1024,
        final: finalMemory / 1024 / 1024,
      },
    };

    console.log('📊 EvtxRecord Batch Extraction Statistics:', statistics);

    return { data: results, statistics };
  }

  /**
   * Create a standardized field mapping for common Windows event fields
   */
  public static createStandardFieldMapping(): { [key: string]: string } {
    return {
      // Common field mappings for standardization
      EventID: 'eventId',
      Level: 'level',
      TimeCreated: 'timestamp',
      EventRecordID: 'eventRecordId',
      ProcessId: 'processId',
      ThreadId: 'threadId',
      UserID: 'userId',
      LogonId: 'logonId',
      ProcessName: 'processName',
      ImagePath: 'imagePath',
      CommandLine: 'commandLine',
      ParentProcessId: 'parentProcessId',
      TargetUserName: 'targetUserName',
      TargetDomainName: 'targetDomainName',
      LogonType: 'logonType',
      IpAddress: 'ipAddress',
      WorkstationName: 'workstationName',
    };
  }

  /**
   * Create standard type conversions for common fields
   */
  public static createStandardTypeConversions(): {
    [field: string]: 'string' | 'number' | 'boolean' | 'date';
  } {
    return {
      processId: 'number',
      threadId: 'number',
      parentProcessId: 'number',
      logonType: 'number',
      eventId: 'number',
      level: 'number',
      timestamp: 'date',
      timeCreated: 'date',
      success: 'boolean',
      enabled: 'boolean',
    };
  }

  /**
   * Get extraction summary for multiple records
   */
  public static getSummary(extractedData: ExtractedEventData[]): {
    totalRecords: number;
    uniqueProviders: string[];
    uniqueChannels: string[];
    levelDistribution: { [level: number]: number };
    timeRange: { earliest: Date; latest: Date } | null;
    commonEventIds: { eventId: number; count: number }[];
  } {
    const providers = new Set<string>();
    const channels = new Set<string>();
    const levelCounts: { [level: number]: number } = {};
    const eventIdCounts: { [eventId: number]: number } = {};

    let earliest: Date | null = null;
    let latest: Date | null = null;

    for (const data of extractedData) {
      providers.add(data.core.provider);
      channels.add(data.core.channel);

      levelCounts[data.core.level] = (levelCounts[data.core.level] || 0) + 1;
      eventIdCounts[data.core.eventId] = (eventIdCounts[data.core.eventId] || 0) + 1;

      if (!earliest || data.core.timestamp < earliest) {
        earliest = data.core.timestamp;
      }
      if (!latest || data.core.timestamp > latest) {
        latest = data.core.timestamp;
      }
    }

    // Get most common event IDs
    const commonEventIds = Object.entries(eventIdCounts)
      .map(([eventId, count]) => ({ eventId: Number(eventId), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRecords: extractedData.length,
      uniqueProviders: Array.from(providers).sort(),
      uniqueChannels: Array.from(channels).sort(),
      levelDistribution: levelCounts,
      timeRange: earliest && latest ? { earliest, latest } : null,
      commonEventIds,
    };
  }

  /**
   * Extract message content from EventData content string
   */
  private static extractMessageFromEventDataContent(eventDataContent: string): string | undefined {
    if (!eventDataContent || typeof eventDataContent !== 'string') {
      return undefined;
    }

    // Look for common error message patterns in the EventData content
    const messagePatterns = [
      /Error:\s*([^<\n\r]+)/i,
      /Error\s*([0-9A-Fx]+[^<\n\r]*)/i,
      /Logged\s+at\s+([^<\n\r]+)/i,
      /<Data[^>]*>([^<]{20,})<\/Data>/i,
      /([A-Z][a-z]+(?:\s+[a-z]+)*\s+(?:error|failed|success|completed)[^<\n\r]*)/i,
    ];

    for (const pattern of messagePatterns) {
      const match = eventDataContent.match(pattern);
      if (match && match[1] && match[1].trim().length > 10) {
        return match[1].trim();
      }
    }

    // If no specific patterns, look for the longest meaningful text
    const dataElements = eventDataContent.match(/<Data[^>]*>([^<]+)<\/Data>/gi);
    if (dataElements) {
      let longestText = '';
      for (const element of dataElements) {
        const match = element.match(/>([^<]+)</);
        if (match && match[1]) {
          const text = match[1].trim();
          if (text.length > longestText.length && text.length > 15) {
            longestText = text;
          }
        }
      }
      if (longestText.length > 15) {
        return longestText;
      }
    }

    return undefined;
  }

  /**
   * Extract message content from raw XML
   */
  private static extractMessageFromXml(xml: string): string | undefined {
    if (!xml || typeof xml !== 'string') {
      return undefined;
    }

    // Look for message-like content in XML
    const patterns = [
      /<Data\s+Name\s*=\s*["']?Message["']?[^>]*>([^<]+)<\/Data>/i,
      /<Data\s+Name\s*=\s*["']?ErrorMessage["']?[^>]*>([^<]+)<\/Data>/i,
      /<Data\s+Name\s*=\s*["']?Description["']?[^>]*>([^<]+)<\/Data>/i,
      /<Data\s+Name\s*=\s*["']?Details["']?[^>]*>([^<]+)<\/Data>/i,
      /<Message[^>]*>([^<]+)<\/Message>/i,
      /<Description[^>]*>([^<]+)<\/Description>/i,
    ];

    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match && match[1] && match[1].trim().length > 5) {
        return match[1].trim();
      }
    }

    return undefined;
  }
}
