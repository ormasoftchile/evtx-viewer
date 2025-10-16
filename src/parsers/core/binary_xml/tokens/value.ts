/**
 * Value tokens for Binary XML parsing
 *
 * These tokens handle text content and literal values within XML elements.
 */

import { BinXmlTokenType, BinXmlValueType } from '../value_types';
import { IBinXmlToken, ChunkInfo, SubstitutionArrayEntry, escapeXml } from './base';

/**
 * Value token that contains text content or literal data
 * This represents text nodes in the XML structure
 */
export class ValueToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.ValueToken;
  public readonly valueType: BinXmlValueType;
  public readonly value: string | Buffer;

  constructor(valueType: BinXmlValueType, value: string | Buffer) {
    this.valueType = valueType;
    this.value = value;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    if (typeof this.value === 'string') {
      return escapeXml(this.value);
    }

    // For binary values, convert based on type
    switch (this.valueType) {
      case BinXmlValueType.StringType:
        return escapeXml(this.value.toString('utf16le'));

      case BinXmlValueType.AnsiStringType:
        return escapeXml(this.value.toString('latin1'));

      case BinXmlValueType.Int32Type:
        return this.value.readInt32LE(0).toString();

      case BinXmlValueType.UInt32Type:
        return this.value.readUInt32LE(0).toString();

      case BinXmlValueType.BoolType:
        return this.value.readUInt8(0) !== 0 ? 'true' : 'false';

      case BinXmlValueType.BinaryType:
        return this.value.toString('hex').toUpperCase();

      default:
        return escapeXml(this.value.toString('hex'));
    }
  }

  public toString(): string {
    const preview =
      typeof this.value === 'string'
        ? this.value.substring(0, 50)
        : this.value.toString('hex').substring(0, 50);
    return `ValueToken(${BinXmlValueType[this.valueType]}: "${preview}...")`;
  }

  /**
   * Parse a ValueToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(buffer: Buffer, offset: number): { token: ValueToken; nextOffset: number } {
    if (offset + 3 > buffer.length) {
      throw new Error(`Buffer too small for ValueToken at offset ${offset}`);
    }

    // Read value type and size
    const valueType = buffer.readUInt8(offset) as BinXmlValueType;
    const size = buffer.readUInt16LE(offset + 1);

    if (offset + 3 + size > buffer.length) {
      throw new Error(`Buffer too small for ValueToken data at offset ${offset}`);
    }

    const valueData = buffer.slice(offset + 3, offset + 3 + size);

    return {
      token: new ValueToken(valueType, valueData),
      nextOffset: offset + 3 + size,
    };
  }
}

/**
 * String value token for literal string content
 * Simplified token for direct string values
 */
export class StringValueToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.ValueToken;
  public readonly value: string;

  constructor(value: string) {
    this.value = value;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    return escapeXml(this.value);
  }

  public toString(): string {
    const preview = this.value.length > 50 ? this.value.substring(0, 50) + '...' : this.value;
    return `StringValueToken("${preview}")`;
  }
}

/**
 * Entity reference token for XML entities
 * Represents references like &amp;, &lt;, etc.
 */
export class EntityRefToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.EntityRef;
  public readonly entityName: string;

  constructor(entityName: string) {
    this.entityName = entityName;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    // Convert common entity references
    switch (this.entityName.toLowerCase()) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default:
        return `&${this.entityName};`;
    }
  }

  public toString(): string {
    return `EntityRefToken(&${this.entityName};)`;
  }

  /**
   * Parse an EntityRefToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @param chunkInfo Chunk information for string lookups
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number,
    chunkInfo: ChunkInfo
  ): { token: EntityRefToken; nextOffset: number } {
    if (offset + 2 > buffer.length) {
      throw new Error(`Buffer too small for EntityRefToken at offset ${offset}`);
    }

    // Read entity name ID from string table
    const nameId = buffer.readUInt16LE(offset);
    const entityName = chunkInfo.getString(nameId) || `Unknown_${nameId}`;

    return {
      token: new EntityRefToken(entityName),
      nextOffset: offset + 2,
    };
  }
}

/**
 * Comment token for XML comments
 * Represents <!-- comment --> content
 */
export class CommentToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.CommentToken;
  public readonly comment: string;

  constructor(comment: string) {
    this.comment = comment;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    return `<!-- ${escapeXml(this.comment)} -->`;
  }

  public toString(): string {
    const preview = this.comment.length > 50 ? this.comment.substring(0, 50) + '...' : this.comment;
    return `CommentToken("${preview}")`;
  }

  /**
   * Parse a CommentToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(buffer: Buffer, offset: number): { token: CommentToken; nextOffset: number } {
    if (offset + 2 > buffer.length) {
      throw new Error(`Buffer too small for CommentToken at offset ${offset}`);
    }

    // Read comment text length and content
    const length = buffer.readUInt16LE(offset);

    if (offset + 2 + length > buffer.length) {
      throw new Error(`Buffer too small for CommentToken data at offset ${offset}`);
    }

    const comment = buffer.slice(offset + 2, offset + 2 + length).toString('utf16le');

    return {
      token: new CommentToken(comment),
      nextOffset: offset + 2 + length,
    };
  }
}

/**
 * CDATA token for CDATA sections
 * Represents <![CDATA[content]]> sections
 */
export class CDATAToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.CDATAToken;
  public readonly data: string;

  constructor(data: string) {
    this.data = data;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    return `<![CDATA[${this.data}]]>`;
  }

  public toString(): string {
    const preview = this.data.length > 50 ? this.data.substring(0, 50) + '...' : this.data;
    return `CDATAToken("${preview}")`;
  }

  /**
   * Parse a CDATAToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(buffer: Buffer, offset: number): { token: CDATAToken; nextOffset: number } {
    if (offset + 2 > buffer.length) {
      throw new Error(`Buffer too small for CDATAToken at offset ${offset}`);
    }

    // Read CDATA length and content
    const length = buffer.readUInt16LE(offset);

    if (offset + 2 + length > buffer.length) {
      throw new Error(`Buffer too small for CDATAToken data at offset ${offset}`);
    }

    const data = buffer.slice(offset + 2, offset + 2 + length).toString('utf16le');

    return {
      token: new CDATAToken(data),
      nextOffset: offset + 2 + length,
    };
  }
}
