/**
 * Stream-level tokens for Binary XML parsing
 *
 * These tokens mark the beginning and end of binary XML streams.
 */

import { BinXmlTokenType } from '../value_types';
import { IBinXmlToken, ChunkInfo, SubstitutionArrayEntry } from './base';

/**
 * Token that marks the start of a binary XML stream
 */
export class StartOfStreamToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.StartOfStreamToken;

  constructor() {
    // Start of stream token has no additional data
  }

  public asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    // Start of stream doesn't generate XML content
    return '';
  }

  public toString(): string {
    return 'StartOfStreamToken';
  }

  /**
   * Parse a StartOfStreamToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: StartOfStreamToken; nextOffset: number } {
    // StartOfStream token is just the token byte (0x0B)
    return {
      token: new StartOfStreamToken(),
      nextOffset: offset + 1,
    };
  }
}

/**
 * Token that marks the end of a binary XML stream
 */
export class EndOfStreamToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.EndOfStreamToken;

  constructor() {
    // End of stream token has no additional data
  }

  public asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    // End of stream doesn't generate XML content
    return '';
  }

  public toString(): string {
    return 'EndOfStreamToken';
  }

  /**
   * Parse an EndOfStreamToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: EndOfStreamToken; nextOffset: number } {
    // EndOfStream token is just the token byte (0x00)
    return {
      token: new EndOfStreamToken(),
      nextOffset: offset + 1,
    };
  }
}

/**
 * Fragment header token (0x0C)
 * Contains version information and fragment details
 */
export class FragmentHeaderToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.FragmentHeaderToken;

  public readonly majorVersion: number;
  public readonly minorVersion: number;
  public readonly flags: number;

  constructor(majorVersion: number, minorVersion: number, flags: number) {
    this.majorVersion = majorVersion;
    this.minorVersion = minorVersion;
    this.flags = flags;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    // Fragment header doesn't generate XML content
    return '';
  }

  public toString(): string {
    return `FragmentHeaderToken(v${this.majorVersion}.${this.minorVersion}, flags: 0x${this.flags.toString(16)})`;
  }

  /**
   * Parse a FragmentHeaderToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: FragmentHeaderToken; nextOffset: number } {
    if (offset + 4 > buffer.length) {
      throw new Error(`Buffer too small for FragmentHeaderToken at offset ${offset}`);
    }

    // Read fragment header data:
    // Byte 0: Token (0x0C) - already consumed
    // Byte 1: Major version
    // Byte 2: Minor version
    // Byte 3: Flags
    const majorVersion = buffer.readUInt8(offset);
    const minorVersion = buffer.readUInt8(offset + 1);
    const flags = buffer.readUInt8(offset + 2);

    return {
      token: new FragmentHeaderToken(majorVersion, minorVersion, flags),
      nextOffset: offset + 3,
    };
  }
}
