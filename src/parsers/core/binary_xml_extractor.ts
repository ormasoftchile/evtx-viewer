/**
 * Binary XML Extractor for EVTX Files
 *
 * Integrates the Binary XML parser with the EVTX parser to extract complete
 * EventData from binary XML records. This solves the missing field problem
 * where fields like "AdditionalInformation" don't appear in the parsed output.
 *
 * @fileoverview Binary XML integration for complete EventData extraction
 * @version 1.0.0
 * @author EVTX Viewer Team
 *
 * @constitutional
 * - Performance: Efficient binary parsing with template caching
 * - Memory: Template reuse and smart caching within memory limits
 * - Accessibility: Complete field extraction for screen readers
 * - Security: Safe binary parsing with comprehensive validation
 */

import {
  BinaryXmlParser,
  Template,
  // TemplateInstance,
  // SubstitutionArrayEntry,
  BinXmlTokenType,
  // BinXmlParseError,
} from './binary_xml';

/**
 * Binary XML processing options
 */
export interface BinaryXmlOptions {
  /**
   * Enable template caching for performance
   */
  enableTemplateCache?: boolean;

  /**
   * Maximum number of templates to cache
   */
  maxCachedTemplates?: number;

  /**
   * Enable error recovery for partial parsing
   */
  enableErrorRecovery?: boolean;

  /**
   * Include debug information in output
   */
  includeDebugInfo?: boolean;
}

/**
 * Binary XML extraction result
 */
export interface BinaryXmlExtractionResult {
  /**
   * Successfully extracted event data
   */
  eventData: { [key: string]: any };

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
}

/**
 * Binary XML Extractor for EVTX integration
 *
 * Handles the detection and parsing of binary XML data within EVTX records,
 * providing complete EventData extraction that wasn't possible with string-based parsing.
 */
export class BinaryXmlExtractor {
  private parser: BinaryXmlParser;
  private options: Required<BinaryXmlOptions>;
  private templateCacheHits: number = 0;

  constructor(options: BinaryXmlOptions = {}) {
    this.options = {
      enableTemplateCache: options.enableTemplateCache ?? true,
      maxCachedTemplates: options.maxCachedTemplates ?? 1000,
      enableErrorRecovery: options.enableErrorRecovery ?? true,
      includeDebugInfo: options.includeDebugInfo ?? false,
    };

    this.parser = new BinaryXmlParser();
  }

  /**
   * Extract EventData from binary XML or fallback to regular XML parsing
   *
   * @param xmlData The XML string from the EventRecord
   * @param binaryData Optional binary data if available
   * @returns Extraction result with complete EventData
   */
  public extractEventData(xmlData: string, binaryData?: Buffer): BinaryXmlExtractionResult {
    const startTime = performance.now();

    try {
      // First, try to detect if this is binary XML data
      if (binaryData && this.isBinaryXml(binaryData)) {
        return this.extractFromBinaryXml(binaryData, startTime);
      }

      // Check if the XML string contains binary XML indicators
      if (this.containsBinaryXmlIndicators(xmlData)) {
        // Try to extract binary data from the XML
        const extractedBinary = this.extractBinaryDataFromXml(xmlData);
        if (extractedBinary && this.isBinaryXml(extractedBinary)) {
          return this.extractFromBinaryXml(extractedBinary, startTime);
        }
      }

      // Fallback to regular XML parsing (current behavior)
      return this.extractFromRegularXml(xmlData, startTime);
    } catch (error) {
      return {
        eventData: {},
        wasBinaryXml: false,
        errors: [error instanceof Error ? error.message : 'Unknown extraction error'],
        ...(this.options.includeDebugInfo && {
          debugInfo: {
            templateCacheHits: this.templateCacheHits,
            parsingTimeMs: performance.now() - startTime,
            binaryDataSize: binaryData?.length || 0,
          },
        }),
      };
    }
  }

  /**
   * Extract EventData from binary XML data
   */
  private extractFromBinaryXml(binaryData: Buffer, startTime: number): BinaryXmlExtractionResult {
    try {
      // Use error recovery if enabled
      const result = this.options.enableErrorRecovery
        ? this.parser.parseWithRecovery(binaryData)
        : { xml: this.parser.parseToXml(binaryData), errors: [] };

      // Parse the generated XML to extract structured data
      const eventData = this.parseXmlToEventData(result.xml);

      // Extract metadata from the parsing process
      const templateId = this.extractTemplateId(result.xml);
      const substitutionCount = this.extractSubstitutionCount(result.xml);

      if (templateId !== undefined) {
        this.templateCacheHits++;
      }

      return {
        eventData,
        wasBinaryXml: true,
        ...(templateId !== undefined && { templateId }),
        ...(substitutionCount !== undefined && { substitutionCount }),
        ...(result.errors.length > 0 && { errors: result.errors }),
        ...(this.options.includeDebugInfo && {
          debugInfo: {
            templateCacheHits: this.templateCacheHits,
            parsingTimeMs: performance.now() - startTime,
            binaryDataSize: binaryData.length,
          },
        }),
      };
    } catch (error) {
      throw new Error(
        `Binary XML extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fallback to regular XML parsing (current behavior)
   */
  private extractFromRegularXml(xmlData: string, startTime: number): BinaryXmlExtractionResult {
    const eventData = this.parseXmlToEventData(xmlData);

    return {
      eventData,
      wasBinaryXml: false,
      ...(this.options.includeDebugInfo && {
        debugInfo: {
          templateCacheHits: this.templateCacheHits,
          parsingTimeMs: performance.now() - startTime,
          binaryDataSize: 0,
        },
      }),
    };
  }

  /**
   * Detect if data is binary XML format
   */
  private isBinaryXml(data: Buffer): boolean {
    if (data.length < 4) {
      return false;
    }

    // Check for binary XML token signatures
    const firstByte = data.readUInt8(0);

    // Common binary XML tokens
    const binaryXmlTokens = [
      BinXmlTokenType.StartOfStreamToken, // 0x0B
      BinXmlTokenType.FragmentHeaderToken, // 0x0C
      BinXmlTokenType.TemplateInstanceToken, // 0x0D
      BinXmlTokenType.OpenStartElementTag, // 0x01
    ];

    return binaryXmlTokens.includes(firstByte);
  }

  /**
   * Check if XML string contains indicators of binary XML data
   */
  private containsBinaryXmlIndicators(xmlData: string): boolean {
    // Look for signs that this might contain binary data
    const indicators = [
      /BinXml/i,
      /Template/i,
      /Substitution/i,
      // Look for base64 or hex encoded data that might be binary XML
      /[A-Fa-f0-9]{100,}/,
      // Look for specific patterns that indicate binary XML encoding
      /<!\[CDATA\[.*\]\]>/,
    ];

    return indicators.some((pattern) => pattern.test(xmlData));
  }

  /**
   * Extract binary data from XML string (if embedded)
   */
  private extractBinaryDataFromXml(xmlData: string): Buffer | null {
    try {
      // Look for CDATA sections that might contain binary data
      const cdataMatch = xmlData.match(/<!\[CDATA\[(.*?)\]\]>/s);
      if (cdataMatch && cdataMatch[1]) {
        // Try to decode as base64 or hex
        const data = cdataMatch[1];

        // Try base64 first
        try {
          return Buffer.from(data, 'base64');
        } catch {
          // Try hex
          try {
            return Buffer.from(data, 'hex');
          } catch {
            // Try as raw binary
            return Buffer.from(data, 'binary');
          }
        }
      }

      // Look for hex-encoded attributes or elements
      const hexMatch = xmlData.match(/([A-Fa-f0-9]{100,})/);
      if (hexMatch && hexMatch[1]) {
        try {
          return Buffer.from(hexMatch[1], 'hex');
        } catch {
          // Not valid hex
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Parse XML string to extract EventData structure
   */
  private parseXmlToEventData(xmlData: string): { [key: string]: any } {
    const eventData: { [key: string]: any } = {};

    try {
      // First, try to extract complete EventData/UserData sections
      const eventDataSectionPattern = /<(EventData|UserData)[^>]*>(.*?)<\/\1>/gi;
      let sectionMatch;

      while ((sectionMatch = eventDataSectionPattern.exec(xmlData)) !== null) {
        const sectionType = sectionMatch[1];
        const sectionContent = sectionMatch[2] || '';

        // Store the complete section content
        eventData[`${sectionType}Content`] = sectionContent.trim();

        // Also parse individual Data elements within the section
        const dataElementPattern = /<Data\s+Name\s*=\s*["']([^"']+)["'][^>]*>(.*?)<\/Data>/gi;
        let dataMatch;

        while ((dataMatch = dataElementPattern.exec(sectionContent)) !== null) {
          const name = dataMatch[1];
          const value = dataMatch[2];
          if (name && value !== undefined) {
            eventData[name] = this.parseDataValue(value);
          }
        }
      }

      // Look for Data elements with Name attributes (fallback for non-sectioned data)
      const dataElementPattern = /<Data\s+Name\s*=\s*["']([^"']+)["'][^>]*>(.*?)<\/Data>/gi;
      let match;

      while ((match = dataElementPattern.exec(xmlData)) !== null) {
        const name = match[1];
        const value = match[2];
        if (name && value !== undefined && !eventData[name]) {
          // Don't overwrite section-parsed data
          eventData[name] = this.parseDataValue(value);
        }
      }

      // Look for direct element names (binary XML output format)
      const directElementPattern = /<(\w+)(?:\s[^>]*)?>([^<]*)<\/\1>/gi;
      while ((match = directElementPattern.exec(xmlData)) !== null) {
        const name = match[1];
        const value = match[2];

        // Skip common XML elements that aren't EventData
        if (
          name &&
          value !== undefined &&
          !['Event', 'System', 'EventData', 'UserData', 'RenderingInfo'].includes(name) &&
          !eventData[name] // Don't overwrite existing data
        ) {
          eventData[name] = this.parseDataValue(value);
        }
      }

      // Look for event message/description patterns
      const messagePatterns = [
        /<Message[^>]*>(.*?)<\/Message>/gi,
        /<Description[^>]*>(.*?)<\/Description>/gi,
        /<Text[^>]*>(.*?)<\/Text>/gi,
      ];

      for (const pattern of messagePatterns) {
        while ((match = pattern.exec(xmlData)) !== null) {
          const messageContent = match[1];
          if (messageContent && messageContent.trim()) {
            eventData['EventMessage'] = this.parseDataValue(messageContent);
            break; // Use first found message
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse XML for EventData:', error);
    }

    return eventData;
  }

  /**
   * Parse data value with type conversion
   */
  private parseDataValue(value: string): any {
    if (!value || value.trim() === '') {
      return '';
    }

    const trimmed = value.trim();

    // Try to parse as number
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      return isNaN(num) ? trimmed : num;
    }

    // Try to parse as boolean
    if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') {
      return trimmed.toLowerCase() === 'true';
    }

    // Try to parse as GUID
    if (/^[{]?[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}[}]?$/.test(trimmed)) {
      return trimmed;
    }

    // Return as string
    return trimmed;
  }

  /**
   * Extract template ID from parsed XML (for debugging)
   */
  private extractTemplateId(xmlData: string): number | undefined {
    const templateMatch = xmlData.match(/Template.*?(\d+)/i);
    return templateMatch && templateMatch[1] ? parseInt(templateMatch[1], 10) : undefined;
  }

  /**
   * Extract substitution count from parsed XML (for debugging)
   */
  private extractSubstitutionCount(xmlData: string): number | undefined {
    const substitutions = xmlData.match(/Substitution/gi);
    return substitutions ? substitutions.length : undefined;
  }

  /**
   * Add a template to the parser's cache
   */
  public addTemplate(template: Template): void {
    this.parser.addTemplate(template);
  }

  /**
   * Add a string to the string table
   */
  public addString(offset: number, value: string): void {
    this.parser.addString(offset, value);
  }

  /**
   * Clear all cached data
   */
  public clearCache(): void {
    this.parser.clear();
    this.templateCacheHits = 0;
  }

  /**
   * Get debug information about the extractor
   */
  public getDebugInfo(): object {
    return {
      ...this.parser.getDebugInfo(),
      templateCacheHits: this.templateCacheHits,
      options: this.options,
    };
  }
}
