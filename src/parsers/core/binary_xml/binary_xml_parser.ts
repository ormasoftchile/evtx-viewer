/**
 * Binary XML Parser - Main parser class
 *
 * Converts Windows Event Log binary XML data to readable XML strings.
 * This is the primary entry point for binary XML parsing.
 */

import { IBinXmlToken, ChunkInfo, SubstitutionArrayEntry, BinXmlParseError } from './tokens/base';
import { TokenParser } from './token_parser';
import { Template, TemplateCache } from './template';
import { TemplateInstance } from './template_instance';
import { BinXmlTokenType } from './value_types';

/**
 * Simple implementation of ChunkInfo for basic parsing
 */
export class SimpleChunkInfo implements ChunkInfo {
  public templates: Map<number, Template> = new Map();
  public stringTable: Map<number, string> = new Map();

  public getTemplate(templateId: number): Template | undefined {
    return this.templates.get(templateId);
  }

  public getString(offset: number): string | undefined {
    return this.stringTable.get(offset);
  }

  public addTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }

  public addString(offset: number, value: string): void {
    this.stringTable.set(offset, value);
  }
}

/**
 * Main Binary XML Parser class
 * Parses Windows Event Log binary XML data into readable XML strings
 */
export class BinaryXmlParser {
  private templateCache: TemplateCache;
  private chunkInfo: SimpleChunkInfo;

  constructor() {
    this.templateCache = new TemplateCache();
    this.chunkInfo = new SimpleChunkInfo();
  }

  /**
   * Parse binary XML data and return XML string
   * @param buffer Buffer containing binary XML data
   * @param offset Starting offset in buffer (default: 0)
   * @returns Parsed XML string
   */
  public parseToXml(buffer: Buffer, offset: number = 0): string {
    try {
      console.log('🔍 Binary XML Parser - Starting parse:', {
        bufferLength: buffer.length,
        offset: offset,
        firstBytes: Array.from(buffer.slice(offset, offset + 16))
          .map((b) => `0x${b.toString(16).padStart(2, '0')}`)
          .join(' '),
      });

      // Create token parser
      const parser = new TokenParser(buffer, offset, this.chunkInfo);

      // Parse all tokens
      const tokens = parser.parseTokens();

      console.log('🔍 Binary XML Parser - Tokens parsed:', {
        tokenCount: tokens.length,
        tokenTypes: tokens.map((t) => ({
          type: t.constructor.name,
          tokenType: t.tokenType,
          size: 'size' in t ? (t as any).size : 'unknown',
        })),
      });

      // Convert tokens to XML
      return this.tokensToXml(tokens);
    } catch (error) {
      console.error('🚨 Binary XML Parser - Parse error:', error);
      if (error instanceof BinXmlParseError) {
        return `<ParseError offset="${error.offset}" token="${error.tokenType || 'unknown'}">${error.message}</ParseError>`;
      }
      return `<ParseError>${error instanceof Error ? error.message : 'Unknown parsing error'}</ParseError>`;
    }
  }

  /**
   * Parse binary XML and return token structure for debugging
   * @param buffer Buffer containing binary XML data
   * @param offset Starting offset in buffer (default: 0)
   * @returns Array of parsed tokens
   */
  public parseToTokens(buffer: Buffer, offset: number = 0): IBinXmlToken[] {
    const parser = new TokenParser(buffer, offset, this.chunkInfo);
    return parser.parseTokens();
  }

  /**
   * Convert array of tokens to XML string
   * @param tokens Array of tokens to convert
   * @returns XML string representation
   */
  private tokensToXml(tokens: IBinXmlToken[]): string {
    const xmlParts: string[] = [];
    const emptySubstitutions: SubstitutionArrayEntry[] = [];

    console.log('🔍 Binary XML Parser - Converting tokens to XML:', {
      tokenCount: tokens.length,
      tokenTypes: tokens.map((t) => t.constructor.name),
    });

    for (const token of tokens) {
      try {
        const xml = token.asXml(emptySubstitutions, this.chunkInfo);
        console.log('🔍 Token XML output:', {
          tokenType: token.constructor.name,
          xml: xml.substring(0, 200) + (xml.length > 200 ? '...' : ''),
          xmlLength: xml.length,
        });

        if (xml.trim().length > 0) {
          xmlParts.push(xml);
        }
      } catch (error) {
        console.error('🚨 Binary XML Parser - Token conversion error:', {
          tokenType: token.constructor.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        xmlParts.push(
          `<TokenError>${error instanceof Error ? error.message : 'Unknown token error'}</TokenError>`
        );
      }
    }

    // If we only have template instances, wrap in a root element
    if (
      xmlParts.length === 1 &&
      tokens.length === 1 &&
      tokens[0] &&
      tokens[0].tokenType === BinXmlTokenType.TemplateInstanceToken
    ) {
      const result = xmlParts[0] || '';
      console.log('🔍 Binary XML Parser - Returning single template instance:', {
        length: result.length,
        xml: result.substring(0, 500) + (result.length > 500 ? '...' : ''),
      });
      return result;
    }

    // If we have multiple parts, wrap in a document element
    if (xmlParts.length > 1) {
      const result = `<BinaryXml>${xmlParts.join('')}</BinaryXml>`;
      console.log('🔍 Binary XML Parser - Returning wrapped multi-part XML:', {
        partCount: xmlParts.length,
        length: result.length,
        xml: result.substring(0, 500) + (result.length > 500 ? '...' : ''),
      });
      return result;
    }

    const result = xmlParts.join('');
    console.log('🔍 Binary XML Parser - Returning joined XML:', {
      partCount: xmlParts.length,
      length: result.length,
      xml: result.substring(0, 500) + (result.length > 500 ? '...' : ''),
    });

    return result;
  }

  /**
   * Add a template to the parser's cache
   * @param template Template to add
   */
  public addTemplate(template: Template): void {
    this.templateCache.addTemplate(template);
    this.chunkInfo.addTemplate(template);
  }

  /**
   * Add a string to the string table
   * @param offset String table offset
   * @param value String value
   */
  public addString(offset: number, value: string): void {
    this.chunkInfo.addString(offset, value);
  }

  /**
   * Get template by ID
   * @param templateId Template identifier
   * @returns Template or undefined if not found
   */
  public getTemplate(templateId: number): Template | undefined {
    return this.templateCache.getTemplate(templateId);
  }

  /**
   * Check if parser has a specific template
   * @param templateId Template identifier
   * @returns true if template exists
   */
  public hasTemplate(templateId: number): boolean {
    return this.templateCache.hasTemplate(templateId);
  }

  /**
   * Clear all cached templates and strings
   */
  public clear(): void {
    this.templateCache.clear();
    this.chunkInfo = new SimpleChunkInfo();
  }

  /**
   * Get debug information about parser state
   */
  public getDebugInfo(): object {
    return {
      templateCount: this.templateCache.size(),
      templateIds: this.templateCache.getTemplateIds(),
      stringTableSize: this.chunkInfo.stringTable.size,
    };
  }

  /**
   * Parse a template instance with known substitutions
   * @param templateId Template identifier
   * @param substitutions Array of substitution entries
   * @returns XML string representation
   */
  public parseTemplateInstance(
    templateId: number,
    substitutions: SubstitutionArrayEntry[]
  ): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      return `<MissingTemplate id="${templateId}" />`;
    }

    try {
      return template.asXml(substitutions);
    } catch (error) {
      return `<TemplateError id="${templateId}">${error instanceof Error ? error.message : 'Unknown error'}</TemplateError>`;
    }
  }

  /**
   * Attempt to parse binary XML with minimal error handling
   * Returns partial results even if parsing fails partway through
   * @param buffer Buffer containing binary XML data
   * @param offset Starting offset in buffer (default: 0)
   * @returns Object with XML result and any errors
   */
  public parseWithRecovery(buffer: Buffer, offset: number = 0): { xml: string; errors: string[] } {
    const errors: string[] = [];
    const xmlParts: string[] = [];

    try {
      const parser = new TokenParser(buffer, offset, this.chunkInfo);
      let currentOffset = offset;

      while (currentOffset < buffer.length) {
        try {
          parser.setOffset(currentOffset);
          const result = parser.parseNextToken();

          const xml = result.token.asXml([], this.chunkInfo);
          if (xml.trim().length > 0) {
            xmlParts.push(xml);
          }

          currentOffset = result.nextOffset;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`At offset ${currentOffset}: ${errorMsg}`);

          // Skip ahead to try to continue parsing
          currentOffset += 1;
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Fatal parsing error: ${errorMsg}`);
    }

    const xml = xmlParts.length > 0 ? xmlParts.join('') : '<EmptyResult />';
    return { xml, errors };
  }

  /**
   * Create a new parser instance with pre-loaded templates and strings
   * @param templates Map of templates by ID
   * @param stringTable Map of strings by offset
   * @returns New BinaryXmlParser instance
   */
  public static createWithData(
    templates: Map<number, Template> = new Map(),
    stringTable: Map<number, string> = new Map()
  ): BinaryXmlParser {
    const parser = new BinaryXmlParser();

    // Add templates
    for (const template of templates.values()) {
      parser.addTemplate(template);
    }

    // Add strings
    for (const [offset, value] of stringTable.entries()) {
      parser.addString(offset, value);
    }

    return parser;
  }
}
