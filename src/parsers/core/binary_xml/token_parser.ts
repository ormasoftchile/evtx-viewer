/**
 * Token Parser for Binary XML
 *
 * Dispatches binary tokens to appropriate parsers and builds the token tree.
 * This is the core component that reads binary XML streams and creates tokens.
 */

import { BinXmlTokenType } from './value_types';
import { IBinXmlToken, ChunkInfo, ParseContext, BinXmlParseError } from './tokens/base';

// Token parsers
import { StartOfStreamToken, EndOfStreamToken, FragmentHeaderToken } from './tokens/stream_tokens';
import {
  OpenStartElementToken,
  CloseStartElementToken,
  CloseEmptyElementToken,
  EndElementToken,
  SimpleAttributeToken,
} from './tokens/element_tokens';
import { parseSubstitutionToken } from './tokens/substitution';
import { ValueToken, EntityRefToken, CommentToken, CDATAToken } from './tokens/value';
import { TemplateInstance } from './template_instance';

/**
 * Implementation of ParseContext for token parsing
 */
export class TokenParseContext implements ParseContext {
  public buffer: Buffer;
  public offset: number;
  public chunkInfo: ChunkInfo;

  constructor(buffer: Buffer, offset: number, chunkInfo: ChunkInfo) {
    this.buffer = buffer;
    this.offset = offset;
    this.chunkInfo = chunkInfo;
  }

  public readByte(): number {
    if (this.offset >= this.buffer.length) {
      throw new BinXmlParseError('Unexpected end of buffer', this.offset);
    }
    return this.buffer.readUInt8(this.offset++);
  }

  public readUInt16LE(): number {
    if (this.offset + 2 > this.buffer.length) {
      throw new BinXmlParseError('Unexpected end of buffer', this.offset);
    }
    const value = this.buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  public readUInt32LE(): number {
    if (this.offset + 4 > this.buffer.length) {
      throw new BinXmlParseError('Unexpected end of buffer', this.offset);
    }
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  public readBigUInt64LE(): bigint {
    if (this.offset + 8 > this.buffer.length) {
      throw new BinXmlParseError('Unexpected end of buffer', this.offset);
    }
    const value = this.buffer.readBigUInt64LE(this.offset);
    this.offset += 8;
    return value;
  }

  public readString(length: number, encoding: 'utf16le' | 'latin1'): string {
    if (this.offset + length > this.buffer.length) {
      throw new BinXmlParseError('Unexpected end of buffer', this.offset);
    }
    const str = this.buffer.slice(this.offset, this.offset + length).toString(encoding);
    this.offset += length;
    return str;
  }

  public isAtEnd(): boolean {
    return this.offset >= this.buffer.length;
  }

  public remaining(): number {
    return this.buffer.length - this.offset;
  }
}

/**
 * Token parser that dispatches binary tokens to appropriate parsers
 */
export class TokenParser {
  private context: TokenParseContext;

  constructor(buffer: Buffer, offset: number, chunkInfo: ChunkInfo) {
    this.context = new TokenParseContext(buffer, offset, chunkInfo);
  }

  /**
   * Parse the next token from the buffer
   * @returns The parsed token and updated offset
   */
  public parseNextToken(): { token: IBinXmlToken; nextOffset: number } {
    if (this.context.isAtEnd()) {
      throw new BinXmlParseError('Unexpected end of stream', this.context.offset);
    }

    const tokenType = this.context.readByte() as BinXmlTokenType;
    const tokenOffset = this.context.offset - 1;

    try {
      switch (tokenType) {
        case BinXmlTokenType.StartOfStreamToken:
          return StartOfStreamToken.parse(this.context.buffer, this.context.offset - 1);

        case BinXmlTokenType.EndOfStreamToken:
          return EndOfStreamToken.parse(this.context.buffer, this.context.offset - 1);

        case BinXmlTokenType.FragmentHeaderToken:
          return FragmentHeaderToken.parse(this.context.buffer, this.context.offset);

        case BinXmlTokenType.OpenStartElementTag:
          return OpenStartElementToken.parse(
            this.context.buffer,
            this.context.offset,
            this.context.chunkInfo
          );

        case BinXmlTokenType.CloseStartElementTag:
          return CloseStartElementToken.parse(this.context.buffer, this.context.offset - 1);

        case BinXmlTokenType.CloseEmptyElementTag:
          return CloseEmptyElementToken.parse(this.context.buffer, this.context.offset - 1);

        case BinXmlTokenType.EndElementTag:
          return EndElementToken.parse(this.context.buffer, this.context.offset - 1);

        case BinXmlTokenType.ValueToken:
          return ValueToken.parse(this.context.buffer, this.context.offset);

        case BinXmlTokenType.AttributeToken:
          return SimpleAttributeToken.parse(
            this.context.buffer,
            this.context.offset,
            this.context.chunkInfo
          );

        case BinXmlTokenType.TemplateInstanceToken:
          return this.parseTemplateInstance();

        case BinXmlTokenType.NormalSubstitution:
        case BinXmlTokenType.OptionalSubstitution:
        case BinXmlTokenType.ConditionalSubstitution:
          return parseSubstitutionToken(tokenType, this.context.buffer, this.context.offset);

        case BinXmlTokenType.EntityRef:
          return EntityRefToken.parse(
            this.context.buffer,
            this.context.offset,
            this.context.chunkInfo
          );

        case BinXmlTokenType.CommentToken:
          return CommentToken.parse(this.context.buffer, this.context.offset);

        case BinXmlTokenType.CDATAToken:
          return CDATAToken.parse(this.context.buffer, this.context.offset);

        default:
          throw new BinXmlParseError(
            `Unknown token type: 0x${tokenType.toString(16).toUpperCase()}`,
            tokenOffset,
            tokenType
          );
      }
    } catch (error) {
      if (error instanceof BinXmlParseError) {
        throw error;
      }
      throw new BinXmlParseError(
        `Error parsing token type 0x${tokenType.toString(16)}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tokenOffset,
        tokenType
      );
    }
  }

  /**
   * Parse a template instance token
   */
  private parseTemplateInstance(): { token: IBinXmlToken; nextOffset: number } {
    const result = TemplateInstance.parse(
      this.context.buffer,
      this.context.offset - 1, // Include the token byte
      this.context.chunkInfo
    );

    return {
      token: result.instance,
      nextOffset: result.nextOffset,
    };
  }

  /**
   * Parse multiple tokens until end of stream or specific terminator
   * @param terminator Optional token type to stop at
   * @returns Array of parsed tokens
   */
  public parseTokens(terminator?: BinXmlTokenType): IBinXmlToken[] {
    const tokens: IBinXmlToken[] = [];

    while (!this.context.isAtEnd()) {
      // Peek at next token type without consuming it
      const nextTokenType = this.context.buffer.readUInt8(this.context.offset) as BinXmlTokenType;

      if (terminator && nextTokenType === terminator) {
        break;
      }

      if (nextTokenType === BinXmlTokenType.EndOfStreamToken) {
        // Parse the end token and stop
        const result = this.parseNextToken();
        tokens.push(result.token);
        this.context.offset = result.nextOffset;
        break;
      }

      const result = this.parseNextToken();
      tokens.push(result.token);
      this.context.offset = result.nextOffset;
    }

    return tokens;
  }

  /**
   * Get current parsing position
   */
  public getOffset(): number {
    return this.context.offset;
  }

  /**
   * Set parsing position
   * @param offset New offset position
   */
  public setOffset(offset: number): void {
    if (offset < 0 || offset > this.context.buffer.length) {
      throw new Error(`Invalid offset: ${offset}`);
    }
    this.context.offset = offset;
  }

  /**
   * Get remaining bytes in buffer
   */
  public remaining(): number {
    return this.context.remaining();
  }

  /**
   * Create a parser for a specific buffer section
   * @param buffer The buffer to parse
   * @param offset Starting offset
   * @param chunkInfo Chunk information for lookups
   * @returns New TokenParser instance
   */
  public static create(buffer: Buffer, offset: number, chunkInfo: ChunkInfo): TokenParser {
    return new TokenParser(buffer, offset, chunkInfo);
  }
}
