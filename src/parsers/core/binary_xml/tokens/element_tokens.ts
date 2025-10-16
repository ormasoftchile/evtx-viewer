/**
 * Element-level tokens for Binary XML parsing
 *
 * These tokens handle XML element structure (start tags, end tags, etc.)
 */

import { BinXmlTokenType } from '../value_types';
import {
  IBinXmlToken,
  IElementToken,
  AttributeToken,
  ChunkInfo,
  SubstitutionArrayEntry,
  escapeXml,
} from './base';

/**
 * Token that opens an element start tag (<element)
 * This is followed by attributes and then CloseStartElementTag or CloseEmptyElementTag
 */
export class OpenStartElementToken implements IElementToken {
  public readonly tokenType = BinXmlTokenType.OpenStartElementTag;
  public readonly children: IBinXmlToken[] = [];
  public readonly attributes: AttributeToken[] = [];

  public readonly name: string;
  public readonly dependencyId: number;
  public readonly size: number;

  constructor(name: string, dependencyId: number, size: number) {
    this.name = name;
    this.dependencyId = dependencyId;
    this.size = size;
  }

  public addChild(child: IBinXmlToken): void {
    this.children.push(child);
  }

  public addAttribute(attribute: AttributeToken): void {
    this.attributes.push(attribute);
  }

  public asXml(_substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    let xml = `<${this.name}`;

    // Add attributes
    for (const attr of this.attributes) {
      xml += ` ${attr.asXml(_substitutions, _chunkInfo)}`;
    }

    xml += '>';

    // Add children
    for (const child of this.children) {
      xml += child.asXml(_substitutions, _chunkInfo);
    }

    xml += `</${this.name}>`;
    return xml;
  }

  public toString(): string {
    return `OpenStartElementToken(${this.name}, dep: ${this.dependencyId}, size: ${this.size})`;
  }

  /**
   * Parse an OpenStartElementToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @param chunkInfo Chunk information for string lookups
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number,
    chunkInfo: ChunkInfo
  ): { token: OpenStartElementToken; nextOffset: number } {
    if (offset + 6 > buffer.length) {
      throw new Error(`Buffer too small for OpenStartElementToken at offset ${offset}`);
    }

    // Read element data:
    // Bytes 0-1: Dependency ID (string table offset)
    // Bytes 2-5: Size of element content
    const dependencyId = buffer.readUInt16LE(offset);
    const size = buffer.readUInt32LE(offset + 2);

    // Get element name from string table
    const name = chunkInfo.getString(dependencyId) || `Unknown_${dependencyId}`;

    return {
      token: new OpenStartElementToken(name, dependencyId, size),
      nextOffset: offset + 6,
    };
  }
}

/**
 * Token that closes a start element tag (>)
 * Indicates the element has children and is not empty
 */
export class CloseStartElementToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.CloseStartElementTag;

  constructor() {
    // Close start element has no additional data
  }

  public asXml(_substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    // This token doesn't generate XML - it's handled by the element that contains it
    return '';
  }

  public toString(): string {
    return 'CloseStartElementToken';
  }

  /**
   * Parse a CloseStartElementToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: CloseStartElementToken; nextOffset: number } {
    // CloseStartElement token is just the token byte (0x02)
    return {
      token: new CloseStartElementToken(),
      nextOffset: offset + 1,
    };
  }
}

/**
 * Token that closes an empty element tag (/>)
 * Indicates the element has no children
 */
export class CloseEmptyElementToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.CloseEmptyElementTag;

  constructor() {
    // Close empty element has no additional data
  }

  public asXml(_substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    // This token doesn't generate XML - it's handled by the element that contains it
    return '';
  }

  public toString(): string {
    return 'CloseEmptyElementToken';
  }

  /**
   * Parse a CloseEmptyElementToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: CloseEmptyElementToken; nextOffset: number } {
    // CloseEmptyElement token is just the token byte (0x03)
    return {
      token: new CloseEmptyElementToken(),
      nextOffset: offset + 1,
    };
  }
}

/**
 * Token that ends an element (</element>)
 * Marks the end of an element's content
 */
export class EndElementToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.EndElementTag;

  constructor() {
    // End element has no additional data - element name is known from context
  }

  public asXml(_substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    // This token doesn't generate XML - it's handled by the element that contains it
    return '';
  }

  public toString(): string {
    return 'EndElementToken';
  }

  /**
   * Parse an EndElementToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: EndElementToken; nextOffset: number } {
    // EndElement token is just the token byte (0x04)
    return {
      token: new EndElementToken(),
      nextOffset: offset + 1,
    };
  }
}

/**
 * Simple attribute token implementation
 * Represents name="value" attribute pairs
 */
export class SimpleAttributeToken implements AttributeToken {
  public readonly tokenType = BinXmlTokenType.AttributeToken;
  public readonly name: string;
  public readonly value: IBinXmlToken;

  constructor(name: string, value: IBinXmlToken) {
    this.name = name;
    this.value = value;
  }

  public asXml(_substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    const valueStr = this.value.asXml(_substitutions, _chunkInfo);
    return `${this.name}="${escapeXml(valueStr)}"`;
  }

  public toString(): string {
    return `AttributeToken(${this.name})`;
  }

  /**
   * Parse an AttributeToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @param chunkInfo Chunk information for string lookups
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number,
    chunkInfo: ChunkInfo
  ): { token: SimpleAttributeToken; nextOffset: number } {
    if (offset + 2 > buffer.length) {
      throw new Error(`Buffer too small for AttributeToken at offset ${offset}`);
    }

    // Read attribute name dependency ID
    const nameId = buffer.readUInt16LE(offset);
    const name = chunkInfo.getString(nameId) || `Unknown_${nameId}`;

    // For now, create a simple value token - in a full implementation,
    // we would parse the actual value token that follows
    const valueToken = new SimpleValueToken(''); // Placeholder

    return {
      token: new SimpleAttributeToken(name, valueToken),
      nextOffset: offset + 2,
    };
  }
}

/**
 * Simple value token for text content and attribute values
 */
export class SimpleValueToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.ValueToken;
  public readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  public asXml(_substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    return this.value;
  }

  public toString(): string {
    return `ValueToken("${this.value}")`;
  }
}
