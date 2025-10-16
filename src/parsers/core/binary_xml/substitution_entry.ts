// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Substitution Array Entry for Binary XML parsing
 *
 * Handles conversion of binary data to string representations based on value types.
 * This is critical for extracting meaningful data from Windows Event Log binary records.
 */

import { BinXmlValueType, getValueTypeName, isArrayType } from './value_types';
import { formatGuid, formatFileTime, formatSid } from './tokens/base';

/**
 * Represents a single entry in a substitution array
 * Contains typed binary data that can be converted to string representation
 */
export class SubstitutionArrayEntry {
  /**
   * Position/index of this substitution in the array
   */
  public readonly position: number;

  /**
   * Size of the data in bytes
   */
  public readonly size: number;

  /**
   * Type of the value (determines how to interpret dataBytes)
   */
  public readonly valueType: BinXmlValueType;

  /**
   * Raw binary data for this value
   */
  public readonly dataBytes: Buffer;

  constructor(position: number, size: number, valueType: BinXmlValueType, dataBytes: Buffer) {
    this.position = position;
    this.size = size;
    this.valueType = valueType;
    this.dataBytes = dataBytes;
  }

  /**
   * Convert the binary data to a string representation based on the value type
   * @returns String representation of the data
   */
  public getDataAsString(): string {
    try {
      if (this.dataBytes.length === 0) {
        return '';
      }

      // Handle array types
      if (isArrayType(this.valueType)) {
        return this.getArrayAsString();
      }

      // Handle single value types
      switch (this.valueType) {
        case BinXmlValueType.NullType:
          return '';

        case BinXmlValueType.StringType:
          return this.dataBytes.toString('utf16le');

        case BinXmlValueType.AnsiStringType:
          return this.dataBytes.toString('latin1');

        case BinXmlValueType.Int8Type:
          return this.dataBytes.readInt8(0).toString();

        case BinXmlValueType.UInt8Type:
          return this.dataBytes.readUInt8(0).toString();

        case BinXmlValueType.Int16Type:
          return this.dataBytes.readInt16LE(0).toString();

        case BinXmlValueType.UInt16Type:
          return this.dataBytes.readUInt16LE(0).toString();

        case BinXmlValueType.Int32Type:
          return this.dataBytes.readInt32LE(0).toString();

        case BinXmlValueType.UInt32Type:
          return this.dataBytes.readUInt32LE(0).toString();

        case BinXmlValueType.Int64Type:
          return this.dataBytes.readBigInt64LE(0).toString();

        case BinXmlValueType.UInt64Type:
          return this.dataBytes.readBigUInt64LE(0).toString();

        case BinXmlValueType.Real32Type:
          return this.dataBytes.readFloatLE(0).toString();

        case BinXmlValueType.Real64Type:
          return this.dataBytes.readDoubleLE(0).toString();

        case BinXmlValueType.BoolType:
          return this.dataBytes.readUInt8(0) !== 0 ? 'true' : 'false';

        case BinXmlValueType.BinaryType:
          return this.dataBytes.toString('hex').toUpperCase();

        case BinXmlValueType.GuidType:
          if (this.dataBytes.length >= 16) {
            return formatGuid(this.dataBytes);
          }
          return this.dataBytes.toString('hex').toUpperCase();

        case BinXmlValueType.SizeType:
          return this.dataBytes.readUInt32LE(0).toString();

        case BinXmlValueType.FileTimeType:
          if (this.dataBytes.length >= 8) {
            return formatFileTime(this.dataBytes);
          }
          return this.dataBytes.toString('hex').toUpperCase();

        case BinXmlValueType.SysTimeType:
          return this.formatSystemTime();

        case BinXmlValueType.SidType:
          if (this.dataBytes.length >= 8) {
            return formatSid(this.dataBytes);
          }
          return this.dataBytes.toString('hex').toUpperCase();

        case BinXmlValueType.HexInt32Type:
          return '0x' + this.dataBytes.readUInt32LE(0).toString(16).toUpperCase().padStart(8, '0');

        case BinXmlValueType.HexInt64Type:
          return (
            '0x' + this.dataBytes.readBigUInt64LE(0).toString(16).toUpperCase().padStart(16, '0')
          );

        case BinXmlValueType.BinXmlType:
          return '[Binary XML Data]'; // Would need recursive parsing

        default:
          return this.dataBytes.toString('hex').toUpperCase();
      }
    } catch (error) {
      // If parsing fails, return hex representation
      return `[Parse Error: ${this.dataBytes.toString('hex').toUpperCase()}]`;
    }
  }

  /**
   * Format Windows SYSTEMTIME structure to ISO string
   * SYSTEMTIME is 16 bytes: year(2), month(2), dayOfWeek(2), day(2), hour(2), minute(2), second(2), milliseconds(2)
   */
  private formatSystemTime(): string {
    if (this.dataBytes.length < 16) {
      return this.dataBytes.toString('hex').toUpperCase();
    }

    try {
      const year = this.dataBytes.readUInt16LE(0);
      const month = this.dataBytes.readUInt16LE(2);
      const day = this.dataBytes.readUInt16LE(6);
      const hour = this.dataBytes.readUInt16LE(8);
      const minute = this.dataBytes.readUInt16LE(10);
      const second = this.dataBytes.readUInt16LE(12);
      const milliseconds = this.dataBytes.readUInt16LE(14);

      // Create date object (month is 1-based in SYSTEMTIME, 0-based in Date)
      const date = new Date(year, month - 1, day, hour, minute, second, milliseconds);
      return date.toISOString();
    } catch {
      return this.dataBytes.toString('hex').toUpperCase();
    }
  }

  /**
   * Convert array types to string representation
   */
  private getArrayAsString(): string {
    try {
      const elements: string[] = [];
      let offset = 0;

      // Determine element size and count
      const elementSize = this.getElementSize();
      if (elementSize === 0) {
        return '[Unknown Array Type]';
      }

      const elementCount = Math.floor(this.dataBytes.length / elementSize);

      for (let i = 0; i < elementCount && offset < this.dataBytes.length; i++) {
        const elementBuffer = this.dataBytes.slice(offset, offset + elementSize);
        const elementEntry = new SubstitutionArrayEntry(
          i,
          elementSize,
          this.getElementType(),
          elementBuffer
        );
        elements.push(elementEntry.getDataAsString());
        offset += elementSize;
      }

      return `[${elements.join(', ')}]`;
    } catch {
      return `[Array Parse Error: ${this.dataBytes.toString('hex').toUpperCase()}]`;
    }
  }

  /**
   * Get the size of individual elements for array types
   */
  private getElementSize(): number {
    switch (this.valueType) {
      case BinXmlValueType.StringArrayType:
      case BinXmlValueType.AnsiStringArrayType:
        return 0; // Variable length - would need length prefixes
      case BinXmlValueType.Int8ArrayType:
      case BinXmlValueType.UInt8ArrayType:
      case BinXmlValueType.BoolArrayType:
        return 1;
      case BinXmlValueType.Int16ArrayType:
      case BinXmlValueType.UInt16ArrayType:
        return 2;
      case BinXmlValueType.Int32ArrayType:
      case BinXmlValueType.UInt32ArrayType:
      case BinXmlValueType.Real32ArrayType:
      case BinXmlValueType.SizeArrayType:
      case BinXmlValueType.HexInt32ArrayType:
        return 4;
      case BinXmlValueType.Int64ArrayType:
      case BinXmlValueType.UInt64ArrayType:
      case BinXmlValueType.Real64ArrayType:
      case BinXmlValueType.FileTimeArrayType:
      case BinXmlValueType.HexInt64ArrayType:
        return 8;
      case BinXmlValueType.GuidArrayType:
        return 16;
      case BinXmlValueType.SysTimeArrayType:
        return 16;
      case BinXmlValueType.SidArrayType:
        return 0; // Variable length
      default:
        return 0;
    }
  }

  /**
   * Get the element type for array types (remove array flag)
   */
  private getElementType(): BinXmlValueType {
    return this.valueType & 0x7f; // Remove array flag (0x80)
  }

  /**
   * Get debug information about this substitution entry
   */
  public toString(): string {
    const typeName = getValueTypeName(this.valueType);
    const dataPreview =
      this.dataBytes.length > 16
        ? this.dataBytes.slice(0, 16).toString('hex') + '...'
        : this.dataBytes.toString('hex');

    return `SubstitutionEntry[${this.position}] ${typeName} (${this.size} bytes): ${dataPreview}`;
  }

  /**
   * Check if this substitution entry is valid
   */
  public isValid(): boolean {
    return this.size >= 0 && this.dataBytes.length === this.size && this.valueType >= 0;
  }

  /**
   * Create a substitution entry from binary data
   * @param buffer The buffer containing the substitution array data
   * @param offset Starting offset in the buffer
   * @param position Position/index of this substitution
   * @returns New SubstitutionArrayEntry and the next offset
   */
  public static fromBuffer(
    buffer: Buffer,
    offset: number,
    position: number
  ): { entry: SubstitutionArrayEntry; nextOffset: number } {
    if (offset + 4 > buffer.length) {
      throw new Error(`Buffer too small for substitution entry at offset ${offset}`);
    }

    // Read size and type (2 bytes each)
    const size = buffer.readUInt16LE(offset);
    const valueType = buffer.readUInt16LE(offset + 2) as BinXmlValueType;

    const dataOffset = offset + 4;
    if (dataOffset + size > buffer.length) {
      throw new Error(
        `Buffer too small for substitution data at offset ${dataOffset}, size ${size}`
      );
    }

    const dataBytes = buffer.slice(dataOffset, dataOffset + size);
    const entry = new SubstitutionArrayEntry(position, size, valueType, dataBytes);

    return {
      entry,
      nextOffset: dataOffset + size,
    };
  }

  /**
   * Parse multiple substitution entries from a buffer
   * @param buffer The buffer containing substitution array data
   * @param offset Starting offset in the buffer
   * @param count Number of entries to parse
   * @returns Array of SubstitutionArrayEntry objects
   */
  public static parseArray(
    buffer: Buffer,
    offset: number,
    count: number
  ): SubstitutionArrayEntry[] {
    const entries: SubstitutionArrayEntry[] = [];
    let currentOffset = offset;

    for (let i = 0; i < count; i++) {
      const result = SubstitutionArrayEntry.fromBuffer(buffer, currentOffset, i);
      entries.push(result.entry);
      currentOffset = result.nextOffset;
    }

    return entries;
  }
}
