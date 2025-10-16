// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Base interfaces and types for Binary XML token parsing
 *
 * These interfaces define the contracts for all binary XML tokens
 * and provide access to chunk-level data (templates and string tables).
 */

import { BinXmlTokenType } from '../value_types';

/**
 * Information about a chunk that contains templates and string tables
 * This is passed to tokens to enable template and string lookups
 */
export interface ChunkInfo {
  /**
   * Templates stored in this chunk, indexed by template ID
   */
  templates: Map<number, Template>;

  /**
   * String table entries for this chunk
   */
  stringTable: Map<number, string>;

  /**
   * Get a template by ID
   * @param templateId The template identifier
   * @returns The template or undefined if not found
   */
  getTemplate(templateId: number): Template | undefined;

  /**
   * Get a string from the string table
   * @param offset The offset in the string table
   * @returns The string or undefined if not found
   */
  getString(offset: number): string | undefined;
}

/**
 * Represents a template definition with element structure and substitution points
 */
export interface Template {
  /**
   * Unique identifier for this template
   */
  id: number;

  /**
   * The root token of the template
   */
  rootToken: IBinXmlToken;

  /**
   * Convert template to XML using provided substitutions
   * @param substitutions Array of substitution values
   * @returns XML string representation
   */
  asXml(substitutions: SubstitutionArrayEntry[]): string;
}

/**
 * Forward declaration for SubstitutionArrayEntry
 * (Actual implementation in substitution_entry.ts)
 */
export interface SubstitutionArrayEntry {
  position: number;
  size: number;
  valueType: number;
  dataBytes: Buffer;
  getDataAsString(): string;
}

/**
 * Base interface for all binary XML tokens
 * Each token type implements this interface to provide XML generation
 */
export interface IBinXmlToken {
  /**
   * The type of this token
   */
  readonly tokenType: BinXmlTokenType;

  /**
   * Convert this token to XML string representation
   * @param substitutions Array of substitution values for replacements
   * @param chunkInfo Chunk information for template/string lookups
   * @returns XML string representation of this token
   */
  asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string;

  /**
   * Get a human-readable description of this token for debugging
   * @returns Debug description string
   */
  toString(): string;
}

/**
 * Interface for tokens that can contain child tokens
 */
export interface IContainerToken extends IBinXmlToken {
  /**
   * Child tokens contained within this token
   */
  children: IBinXmlToken[];

  /**
   * Add a child token
   * @param child The child token to add
   */
  addChild(child: IBinXmlToken): void;
}

/**
 * Interface for tokens that have attributes
 */
export interface IElementToken extends IContainerToken {
  /**
   * Element name (from string table or direct)
   */
  name: string;

  /**
   * Attributes for this element
   */
  attributes: AttributeToken[];

  /**
   * Add an attribute to this element
   * @param attribute The attribute token to add
   */
  addAttribute(attribute: AttributeToken): void;
}

/**
 * Interface for attribute tokens
 */
export interface AttributeToken extends IBinXmlToken {
  /**
   * Attribute name
   */
  name: string;

  /**
   * Attribute value token or substitution reference
   */
  value: IBinXmlToken;
}

/**
 * Interface for substitution tokens that reference the substitution array
 */
export interface ISubstitutionToken extends IBinXmlToken {
  /**
   * Index into the substitution array
   */
  substitutionIndex: number;

  /**
   * Whether this substitution is optional (may not exist)
   */
  isOptional: boolean;
}

/**
 * Base parsing context for tracking position in binary data
 */
export interface ParseContext {
  /**
   * The binary data buffer being parsed
   */
  buffer: Buffer;

  /**
   * Current offset in the buffer
   */
  offset: number;

  /**
   * Chunk information for lookups
   */
  chunkInfo: ChunkInfo;

  /**
   * Read a byte at current offset and advance
   */
  readByte(): number;

  /**
   * Read a 16-bit little-endian integer and advance
   */
  readUInt16LE(): number;

  /**
   * Read a 32-bit little-endian integer and advance
   */
  readUInt32LE(): number;

  /**
   * Read a 64-bit little-endian integer and advance
   */
  readBigUInt64LE(): bigint;

  /**
   * Read a string at the current offset
   * @param length String length in bytes
   * @param encoding String encoding ('utf16le' or 'latin1')
   */
  readString(length: number, encoding: 'utf16le' | 'latin1'): string;

  /**
   * Check if we've reached the end of the buffer
   */
  isAtEnd(): boolean;

  /**
   * Get remaining bytes in buffer
   */
  remaining(): number;
}

/**
 * Error thrown when binary XML parsing fails
 */
export class BinXmlParseError extends Error {
  constructor(
    message: string,
    public readonly offset: number,
    public readonly tokenType?: BinXmlTokenType
  ) {
    super(`Binary XML Parse Error at offset ${offset}: ${message}`);
    this.name = 'BinXmlParseError';
  }
}

/**
 * Utility function to escape XML special characters
 * @param text Text to escape
 * @returns Escaped XML text
 */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Utility function to format GUID from 16-byte buffer
 * @param buffer Buffer containing 16-byte GUID
 * @param offset Offset in buffer (default 0)
 * @returns GUID string in standard format
 */
export function formatGuid(buffer: Buffer, offset: number = 0): string {
  if (buffer.length < offset + 16) {
    throw new Error('Buffer too small for GUID');
  }

  // GUID format: {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}
  const hex = buffer
    .slice(offset, offset + 16)
    .toString('hex')
    .toUpperCase();
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`;
}

/**
 * Utility function to format Windows FILETIME to ISO string
 * @param buffer Buffer containing 8-byte FILETIME
 * @param offset Offset in buffer (default 0)
 * @returns ISO date string
 */
export function formatFileTime(buffer: Buffer, offset: number = 0): string {
  if (buffer.length < offset + 8) {
    throw new Error('Buffer too small for FILETIME');
  }

  // FILETIME is 64-bit value representing 100-nanosecond intervals since January 1, 1601 UTC
  const filetime = buffer.readBigUInt64LE(offset);
  const windowsEpoch = new Date('1601-01-01T00:00:00.000Z').getTime();
  const unixTime = windowsEpoch + Number(filetime / 10000n); // Convert to milliseconds

  return new Date(unixTime).toISOString();
}

/**
 * Utility function to format Windows SID from buffer
 * @param buffer Buffer containing SID data
 * @param offset Offset in buffer (default 0)
 * @returns SID string representation
 */
export function formatSid(buffer: Buffer, offset: number = 0): string {
  if (buffer.length < offset + 8) {
    throw new Error('Buffer too small for SID header');
  }

  const revision = buffer.readUInt8(offset);
  const subAuthorityCount = buffer.readUInt8(offset + 1);
  const identifierAuthority = buffer.readUIntBE(offset + 2, 6);

  let sid = `S-${revision}-${identifierAuthority}`;

  for (let i = 0; i < subAuthorityCount; i++) {
    const subAuthOffset = offset + 8 + i * 4;
    if (buffer.length < subAuthOffset + 4) {
      break;
    }
    const subAuthority = buffer.readUInt32LE(subAuthOffset);
    sid += `-${subAuthority}`;
  }

  return sid;
}
