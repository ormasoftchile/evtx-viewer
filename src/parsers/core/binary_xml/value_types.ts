// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Binary XML Value Types and Token Types for Windows Event Log parsing
 *
 * Based on Microsoft's Binary XML specification for EVTX files.
 * These types are used to parse the binary data in Windows Event Log records.
 */

/**
 * Binary XML Value Types - defines how data is stored in substitution arrays
 * Each value type corresponds to a specific data format and parsing method
 */
export enum BinXmlValueType {
  // Null and empty types
  NullType = 0x00,
  StringType = 0x01, // UTF-16LE string
  AnsiStringType = 0x02, // Latin1 string
  Int8Type = 0x03, // Signed 8-bit integer
  UInt8Type = 0x04, // Unsigned 8-bit integer
  Int16Type = 0x05, // Signed 16-bit integer
  UInt16Type = 0x06, // Unsigned 16-bit integer
  Int32Type = 0x07, // Signed 32-bit integer
  UInt32Type = 0x08, // Unsigned 32-bit integer
  Int64Type = 0x09, // Signed 64-bit integer
  UInt64Type = 0x0a, // Unsigned 64-bit integer
  Real32Type = 0x0b, // 32-bit floating point
  Real64Type = 0x0c, // 64-bit floating point
  BoolType = 0x0d, // Boolean (1 byte: 0 or 1)
  BinaryType = 0x0e, // Binary data (displayed as hex)
  GuidType = 0x0f, // 16-byte GUID
  SizeType = 0x10, // Size value (32-bit)
  FileTimeType = 0x11, // Windows FILETIME (64-bit)
  SysTimeType = 0x12, // Windows SYSTEMTIME (16 bytes)
  SidType = 0x13, // Windows Security ID
  HexInt32Type = 0x14, // 32-bit integer displayed as hex
  HexInt64Type = 0x15, // 64-bit integer displayed as hex

  // Array types
  BinXmlType = 0x20, // Nested binary XML
  StringArrayType = 0x81, // Array of UTF-16LE strings
  AnsiStringArrayType = 0x82, // Array of Latin1 strings
  Int8ArrayType = 0x83, // Array of signed 8-bit integers
  UInt8ArrayType = 0x84, // Array of unsigned 8-bit integers
  Int16ArrayType = 0x85, // Array of signed 16-bit integers
  UInt16ArrayType = 0x86, // Array of unsigned 16-bit integers
  Int32ArrayType = 0x87, // Array of signed 32-bit integers
  UInt32ArrayType = 0x88, // Array of unsigned 32-bit integers
  Int64ArrayType = 0x89, // Array of signed 64-bit integers
  UInt64ArrayType = 0x8a, // Array of unsigned 64-bit integers
  Real32ArrayType = 0x8b, // Array of 32-bit floating point
  Real64ArrayType = 0x8c, // Array of 64-bit floating point
  BoolArrayType = 0x8d, // Array of booleans
  GuidArrayType = 0x8f, // Array of GUIDs
  SizeArrayType = 0x90, // Array of size values
  FileTimeArrayType = 0x91, // Array of Windows FILETIME
  SysTimeArrayType = 0x92, // Array of Windows SYSTEMTIME
  SidArrayType = 0x93, // Array of Windows Security IDs
  HexInt32ArrayType = 0x94, // Array of 32-bit hex integers
  HexInt64ArrayType = 0x95, // Array of 64-bit hex integers
}

/**
 * Binary XML Token Types - defines the structure tokens in binary XML
 * These tokens define the XML document structure and data placement
 */
export enum BinXmlTokenType {
  EndOfStreamToken = 0x00, // End of binary stream
  OpenStartElementTag = 0x01, // <element ...
  CloseStartElementTag = 0x02, // >
  CloseEmptyElementTag = 0x03, // />
  EndElementTag = 0x04, // </element>
  ValueToken = 0x05, // Text content
  AttributeToken = 0x06, // attribute="value"
  StartOfStreamToken = 0x0b, // Beginning of stream
  FragmentHeaderToken = 0x0c, // Fragment header
  TemplateInstanceToken = 0x0d, // Template instance with substitutions
  NormalSubstitution = 0x0e, // Normal substitution value
  ConditionalSubstitution = 0x0f, // Conditional substitution
  OptionalSubstitution = 0x10, // Optional substitution
  EntityRef = 0x11, // Entity reference
  ProcessingInstructionToken = 0x12, // Processing instruction
  CommentToken = 0x13, // XML comment
  CDATAToken = 0x14, // CDATA section

  // Template definition tokens
  TemplateDefToken = 0x15, // Template definition
}

/**
 * Gets a human-readable name for a Binary XML value type
 * @param valueType The value type enum value
 * @returns Human-readable string representation
 */
export function getValueTypeName(valueType: BinXmlValueType): string {
  switch (valueType) {
    case BinXmlValueType.NullType:
      return 'Null';
    case BinXmlValueType.StringType:
      return 'String (UTF-16)';
    case BinXmlValueType.AnsiStringType:
      return 'String (ANSI)';
    case BinXmlValueType.Int8Type:
      return 'Int8';
    case BinXmlValueType.UInt8Type:
      return 'UInt8';
    case BinXmlValueType.Int16Type:
      return 'Int16';
    case BinXmlValueType.UInt16Type:
      return 'UInt16';
    case BinXmlValueType.Int32Type:
      return 'Int32';
    case BinXmlValueType.UInt32Type:
      return 'UInt32';
    case BinXmlValueType.Int64Type:
      return 'Int64';
    case BinXmlValueType.UInt64Type:
      return 'UInt64';
    case BinXmlValueType.Real32Type:
      return 'Float32';
    case BinXmlValueType.Real64Type:
      return 'Float64';
    case BinXmlValueType.BoolType:
      return 'Boolean';
    case BinXmlValueType.BinaryType:
      return 'Binary';
    case BinXmlValueType.GuidType:
      return 'GUID';
    case BinXmlValueType.SizeType:
      return 'Size';
    case BinXmlValueType.FileTimeType:
      return 'FileTime';
    case BinXmlValueType.SysTimeType:
      return 'SystemTime';
    case BinXmlValueType.SidType:
      return 'SID';
    case BinXmlValueType.HexInt32Type:
      return 'HexInt32';
    case BinXmlValueType.HexInt64Type:
      return 'HexInt64';
    case BinXmlValueType.BinXmlType:
      return 'BinXml';
    case BinXmlValueType.StringArrayType:
      return 'String Array';
    case BinXmlValueType.AnsiStringArrayType:
      return 'ANSI String Array';
    case BinXmlValueType.Int8ArrayType:
      return 'Int8 Array';
    case BinXmlValueType.UInt8ArrayType:
      return 'UInt8 Array';
    case BinXmlValueType.Int16ArrayType:
      return 'Int16 Array';
    case BinXmlValueType.UInt16ArrayType:
      return 'UInt16 Array';
    case BinXmlValueType.Int32ArrayType:
      return 'Int32 Array';
    case BinXmlValueType.UInt32ArrayType:
      return 'UInt32 Array';
    case BinXmlValueType.Int64ArrayType:
      return 'Int64 Array';
    case BinXmlValueType.UInt64ArrayType:
      return 'UInt64 Array';
    case BinXmlValueType.Real32ArrayType:
      return 'Float32 Array';
    case BinXmlValueType.Real64ArrayType:
      return 'Float64 Array';
    case BinXmlValueType.BoolArrayType:
      return 'Boolean Array';
    case BinXmlValueType.GuidArrayType:
      return 'GUID Array';
    case BinXmlValueType.SizeArrayType:
      return 'Size Array';
    case BinXmlValueType.FileTimeArrayType:
      return 'FileTime Array';
    case BinXmlValueType.SysTimeArrayType:
      return 'SystemTime Array';
    case BinXmlValueType.SidArrayType:
      return 'SID Array';
    case BinXmlValueType.HexInt32ArrayType:
      return 'HexInt32 Array';
    case BinXmlValueType.HexInt64ArrayType:
      return 'HexInt64 Array';
    default:
      return `Unknown (0x${(valueType as number).toString(16).toUpperCase()})`;
  }
}

/**
 * Gets a human-readable name for a Binary XML token type
 * @param tokenType The token type enum value
 * @returns Human-readable string representation
 */
export function getTokenTypeName(tokenType: BinXmlTokenType): string {
  switch (tokenType) {
    case BinXmlTokenType.EndOfStreamToken:
      return 'End of Stream';
    case BinXmlTokenType.OpenStartElementTag:
      return 'Open Start Element';
    case BinXmlTokenType.CloseStartElementTag:
      return 'Close Start Element';
    case BinXmlTokenType.CloseEmptyElementTag:
      return 'Close Empty Element';
    case BinXmlTokenType.EndElementTag:
      return 'End Element';
    case BinXmlTokenType.ValueToken:
      return 'Value';
    case BinXmlTokenType.AttributeToken:
      return 'Attribute';
    case BinXmlTokenType.StartOfStreamToken:
      return 'Start of Stream';
    case BinXmlTokenType.FragmentHeaderToken:
      return 'Fragment Header';
    case BinXmlTokenType.TemplateInstanceToken:
      return 'Template Instance';
    case BinXmlTokenType.NormalSubstitution:
      return 'Normal Substitution';
    case BinXmlTokenType.ConditionalSubstitution:
      return 'Conditional Substitution';
    case BinXmlTokenType.OptionalSubstitution:
      return 'Optional Substitution';
    case BinXmlTokenType.EntityRef:
      return 'Entity Reference';
    case BinXmlTokenType.ProcessingInstructionToken:
      return 'Processing Instruction';
    case BinXmlTokenType.CommentToken:
      return 'Comment';
    case BinXmlTokenType.CDATAToken:
      return 'CDATA';
    case BinXmlTokenType.TemplateDefToken:
      return 'Template Definition';
    default:
      return `Unknown (0x${(tokenType as number).toString(16).toUpperCase()})`;
  }
}

/**
 * Checks if a value type is an array type
 * @param valueType The value type to check
 * @returns true if the value type represents an array
 */
export function isArrayType(valueType: BinXmlValueType): boolean {
  return (valueType & 0x80) !== 0;
}

/**
 * Gets the base type for an array type
 * @param arrayType The array value type
 * @returns The corresponding base type, or the input if not an array
 */
export function getBaseType(arrayType: BinXmlValueType): BinXmlValueType {
  if (isArrayType(arrayType)) {
    return arrayType & 0x7f;
  }
  return arrayType;
}
