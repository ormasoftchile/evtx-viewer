// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Substitution tokens for Binary XML parsing
 *
 * These tokens reference values in the substitution array to replace
 * placeholders in templates with actual data.
 */

import { BinXmlTokenType } from '../value_types';
import { ISubstitutionToken, ChunkInfo, SubstitutionArrayEntry } from './base';

/**
 * Normal substitution token - references a value in the substitution array
 * This is the most common substitution type
 */
export class NormalSubstitutionToken implements ISubstitutionToken {
  public readonly tokenType = BinXmlTokenType.NormalSubstitution;
  public readonly substitutionIndex: number;
  public readonly isOptional = false;

  constructor(substitutionIndex: number) {
    this.substitutionIndex = substitutionIndex;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    if (this.substitutionIndex >= 0 && this.substitutionIndex < substitutions.length) {
      const substitution = substitutions[this.substitutionIndex];
      if (substitution) {
        return substitution.getDataAsString();
      }
    }

    // If substitution index is out of bounds, return placeholder
    return `[Missing Substitution ${this.substitutionIndex}]`;
  }

  public toString(): string {
    return `NormalSubstitutionToken(index: ${this.substitutionIndex})`;
  }

  /**
   * Parse a NormalSubstitutionToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: NormalSubstitutionToken; nextOffset: number } {
    if (offset + 2 > buffer.length) {
      throw new Error(`Buffer too small for NormalSubstitutionToken at offset ${offset}`);
    }

    // Read substitution index (2 bytes)
    const substitutionIndex = buffer.readUInt16LE(offset);

    return {
      token: new NormalSubstitutionToken(substitutionIndex),
      nextOffset: offset + 2,
    };
  }
}

/**
 * Optional substitution token - references a value that may not exist
 * If the substitution index is invalid, this token produces no output
 */
export class OptionalSubstitutionToken implements ISubstitutionToken {
  public readonly tokenType = BinXmlTokenType.OptionalSubstitution;
  public readonly substitutionIndex: number;
  public readonly isOptional = true;

  constructor(substitutionIndex: number) {
    this.substitutionIndex = substitutionIndex;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    if (this.substitutionIndex >= 0 && this.substitutionIndex < substitutions.length) {
      const substitution = substitutions[this.substitutionIndex];
      if (substitution) {
        return substitution.getDataAsString();
      }
    }

    // For optional substitutions, return empty string if missing
    return '';
  }

  public toString(): string {
    return `OptionalSubstitutionToken(index: ${this.substitutionIndex})`;
  }

  /**
   * Parse an OptionalSubstitutionToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: OptionalSubstitutionToken; nextOffset: number } {
    if (offset + 2 > buffer.length) {
      throw new Error(`Buffer too small for OptionalSubstitutionToken at offset ${offset}`);
    }

    // Read substitution index (2 bytes)
    const substitutionIndex = buffer.readUInt16LE(offset);

    return {
      token: new OptionalSubstitutionToken(substitutionIndex),
      nextOffset: offset + 2,
    };
  }
}

/**
 * Conditional substitution token - complex substitution with conditions
 * This is a more advanced substitution type that can have conditional logic
 */
export class ConditionalSubstitutionToken implements ISubstitutionToken {
  public readonly tokenType = BinXmlTokenType.ConditionalSubstitution;
  public readonly substitutionIndex: number;
  public readonly isOptional = false;
  public readonly condition: number; // Condition flags/data

  constructor(substitutionIndex: number, condition: number) {
    this.substitutionIndex = substitutionIndex;
    this.condition = condition;
  }

  public asXml(substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    // For now, treat conditional substitution like normal substitution
    // In a full implementation, we would evaluate the condition
    if (this.substitutionIndex >= 0 && this.substitutionIndex < substitutions.length) {
      const substitution = substitutions[this.substitutionIndex];
      if (substitution) {
        return substitution.getDataAsString();
      }
    }

    return `[Missing Conditional Substitution ${this.substitutionIndex}]`;
  }

  public toString(): string {
    return `ConditionalSubstitutionToken(index: ${this.substitutionIndex}, condition: 0x${this.condition.toString(16)})`;
  }

  /**
   * Parse a ConditionalSubstitutionToken from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @returns New token and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number
  ): { token: ConditionalSubstitutionToken; nextOffset: number } {
    if (offset + 4 > buffer.length) {
      throw new Error(`Buffer too small for ConditionalSubstitutionToken at offset ${offset}`);
    }

    // Read substitution index (2 bytes) and condition (2 bytes)
    const substitutionIndex = buffer.readUInt16LE(offset);
    const condition = buffer.readUInt16LE(offset + 2);

    return {
      token: new ConditionalSubstitutionToken(substitutionIndex, condition),
      nextOffset: offset + 4,
    };
  }
}

/**
 * Utility function to create the appropriate substitution token based on token type
 * @param tokenType The binary XML token type
 * @param buffer The buffer containing binary data
 * @param offset Current offset in buffer
 * @returns New substitution token and next offset
 */
export function parseSubstitutionToken(
  tokenType: BinXmlTokenType,
  buffer: Buffer,
  offset: number
): { token: ISubstitutionToken; nextOffset: number } {
  switch (tokenType) {
    case BinXmlTokenType.NormalSubstitution:
      return NormalSubstitutionToken.parse(buffer, offset);

    case BinXmlTokenType.OptionalSubstitution:
      return OptionalSubstitutionToken.parse(buffer, offset);

    case BinXmlTokenType.ConditionalSubstitution:
      return ConditionalSubstitutionToken.parse(buffer, offset);

    default:
      throw new Error(`Invalid substitution token type: 0x${tokenType.toString(16)}`);
  }
}
