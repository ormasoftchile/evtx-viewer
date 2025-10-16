/**
 * Binary XML Parser - Main exports
 *
 * Entry point for the Binary XML parsing module.
 * Provides all necessary classes and functions for parsing Windows Event Log binary XML.
 */

// Main parser classes
export { BinaryXmlParser, SimpleChunkInfo } from './binary_xml_parser';
export { TokenParser, TokenParseContext } from './token_parser';

// Template system
export { Template, TemplateCache } from './template';
export { TemplateInstance } from './template_instance';

// Core data structures
export { SubstitutionArrayEntry } from './substitution_entry';
export {
  BinXmlValueType,
  BinXmlTokenType,
  getValueTypeName,
  getTokenTypeName,
  isArrayType,
  getBaseType,
} from './value_types';

// Base interfaces and utilities
export {
  IBinXmlToken,
  IContainerToken,
  IElementToken,
  ISubstitutionToken,
  AttributeToken,
  ChunkInfo,
  ParseContext,
  BinXmlParseError,
  escapeXml,
  formatGuid,
  formatFileTime,
  formatSid,
} from './tokens/base';

// Token implementations
export { StartOfStreamToken, EndOfStreamToken, FragmentHeaderToken } from './tokens/stream_tokens';

export {
  OpenStartElementToken,
  CloseStartElementToken,
  CloseEmptyElementToken,
  EndElementToken,
  SimpleAttributeToken,
  SimpleValueToken,
} from './tokens/element_tokens';

export {
  NormalSubstitutionToken,
  OptionalSubstitutionToken,
  ConditionalSubstitutionToken,
  parseSubstitutionToken,
} from './tokens/substitution';

export {
  ValueToken,
  StringValueToken,
  EntityRefToken,
  CommentToken,
  CDATAToken,
} from './tokens/value';

/**
 * Convenience function to parse binary XML data
 * @param buffer Buffer containing binary XML data
 * @param offset Starting offset (default: 0)
 * @returns Parsed XML string
 */
export function parseBinaryXml(buffer: Buffer, offset: number = 0): string {
  const { BinaryXmlParser } = require('./binary_xml_parser');
  const parser = new BinaryXmlParser();
  return parser.parseToXml(buffer, offset);
}

/**
 * Convenience function to parse binary XML with error recovery
 * @param buffer Buffer containing binary XML data
 * @param offset Starting offset (default: 0)
 * @returns Object with XML result and any errors
 */
export function parseBinaryXmlWithRecovery(
  buffer: Buffer,
  offset: number = 0
): { xml: string; errors: string[] } {
  const { BinaryXmlParser } = require('./binary_xml_parser');
  const parser = new BinaryXmlParser();
  return parser.parseWithRecovery(buffer, offset);
}

/**
 * Create a parser with pre-loaded templates and string table
 * Useful when parsing multiple related binary XML fragments
 * @param templates Map of templates by ID
 * @param stringTable Map of strings by offset
 * @returns Configured BinaryXmlParser instance
 */
export function createParserWithData(
  templates: Map<number, any> = new Map(),
  stringTable: Map<number, string> = new Map()
): any {
  const { BinaryXmlParser } = require('./binary_xml_parser');
  return BinaryXmlParser.createWithData(templates, stringTable);
}

// Re-export all types for convenience
export type { SubstitutionArrayEntry as ISubstitutionArrayEntry } from './tokens/base';

/**
 * Version information for the binary XML parser
 */
export const VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  version: '1.0.0',
};

/**
 * Parser capabilities and limitations
 */
export const CAPABILITIES = {
  supportedValueTypes: 43, // Number of value types supported
  supportedTokenTypes: 18, // Number of token types supported
  templateCaching: true,
  errorRecovery: true,
  xmlGeneration: true,
  debugTokens: true,
};

/**
 * Default export - the main parser class
 */
export { BinaryXmlParser as default } from './binary_xml_parser';
