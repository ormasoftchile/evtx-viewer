import { BinXmlValue, BinXmlValueType } from './value_variant.js';
import { BinXmlDeserializer } from './deserializer.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// Helper function to read GUID from cursor
function read_guid(cursor: Buffer, position: number): string {
  const bytes = cursor.subarray(position, position + 16);
  const parts = [
    bytes.subarray(0, 4).reverse(),
    bytes.subarray(4, 6).reverse(),
    bytes.subarray(6, 8).reverse(),
    bytes.subarray(8, 10),
    bytes.subarray(10, 16),
  ];

  return parts
    .map((part) => {
      const hex = Array.from(part)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return hex;
    })
    .join('-');
}

// Helper function to read len-prefixed UTF-16 string
function read_len_prefixed_utf16_string(cursor: Buffer, position: number): string | null {
  if (position + 2 > cursor.length) return null;
  const length = cursor.readUInt16LE(position);
  if (position + 2 + length * 2 > cursor.length) return null;

  const stringBuffer = cursor.subarray(position + 2, position + 2 + length * 2);
  return stringBuffer.toString('utf16le');
}

// Helper function to read null-terminated UTF-16 string
function read_null_terminated_utf16_string(cursor: Buffer, position: number): string {
  let end = position;
  while (end + 1 < cursor.length) {
    const char = cursor.readUInt16LE(end);
    if (char === 0) break;
    end += 2;
  }

  if (end === position) return '';
  const stringBuffer = cursor.subarray(position, end);
  return stringBuffer.toString('utf16le');
}

// Helper function to read UTF-16 string by size
function read_utf16_by_size(cursor: Buffer, position: number, size: number): string | null {
  if (position + size > cursor.length) return null;
  const stringBuffer = cursor.subarray(position, position + size);
  return stringBuffer.toString('utf16le');
}

// Helper function to read ANSI encoded string
function read_ansi_encoded_string(
  cursor: Buffer,
  position: number,
  size: number,
  ansi_codec: string
): string | null {
  if (position + size > cursor.length) return null;
  const stringBuffer = cursor.subarray(position, position + size);
  // For now, assume latin1 encoding as fallback
  return stringBuffer.toString('latin1');
}

// Helper function to read Windows FILETIME
function read_filetime(cursor: Buffer, position: number): Date {
  const low = cursor.readUInt32LE(position);
  const high = cursor.readUInt32LE(position + 4);
  const filetime = (BigInt(high) << 32n) + BigInt(low);
  // FILETIME is 100-nanosecond intervals since January 1, 1601
  const unixEpochStart = 116444736000000000n; // FILETIME value for Unix epoch start
  const unixTime = (filetime - unixEpochStart) / 10000n; // Convert to milliseconds
  return new Date(Number(unixTime));
}

// Helper function to read Windows SYSTEMTIME
function read_systemtime(cursor: Buffer, position: number): Date {
  const year = cursor.readUInt16LE(position);
  const month = cursor.readUInt16LE(position + 2);
  const day = cursor.readUInt16LE(position + 6);
  const hour = cursor.readUInt16LE(position + 8);
  const minute = cursor.readUInt16LE(position + 10);
  const second = cursor.readUInt16LE(position + 12);
  const milliseconds = cursor.readUInt16LE(position + 14);

  return new Date(year, month - 1, day, hour, minute, second, milliseconds);
}

// Helper function to read Windows SID
function read_sid(cursor: Buffer, position: number): string {
  const revision = cursor.readUInt8(position);
  const sub_authority_count = cursor.readUInt8(position + 1);
  const identifier_authority = cursor.readUIntBE(position + 2, 6);

  let sid = `S-${revision}-${identifier_authority}`;

  for (let i = 0; i < sub_authority_count; i++) {
    const sub_authority = cursor.readUInt32LE(position + 8 + i * 4);
    sid += `-${sub_authority}`;
  }

  return sid;
}

// Helper function to read hex int32
function read_hex32(cursor: Buffer, position: number): string {
  const value = cursor.readUInt32LE(position);
  // Rust formatting: no leading zeros, just 0x + hex value
  return `0x${value.toString(16)}`;
}

// Helper function to read hex int64
function read_hex64(cursor: Buffer, position: number): string {
  const low = cursor.readUInt32LE(position);
  const high = cursor.readUInt32LE(position + 4);
  const value = (BigInt(high) << 32n) + BigInt(low);
  // Rust formatting: no leading zeros, just 0x + hex value
  return `0x${value.toString(16)}`;
}

// Helper function to read sized arrays
function read_sized_array<T>(
  cursor: Buffer,
  position: number,
  size: number,
  reader: (cursor: Buffer, pos: number) => { value: T; bytes_read: number }
): { values: T[]; new_position: number } {
  const values: T[] = [];
  let pos = position;
  let bytes_read = 0;

  while (bytes_read < size) {
    const result = reader(cursor, pos);
    values.push(result.value);
    pos += result.bytes_read;
    bytes_read += result.bytes_read;
  }

  return { values, new_position: pos };
}

// 1:1 translation of BinXmlValueType::from_u8
export function value_type_from_u8(byte: number): BinXmlValueType | null {
  switch (byte) {
    case 0x00:
      return BinXmlValueType.NullType;
    case 0x01:
      return BinXmlValueType.StringType;
    case 0x02:
      return BinXmlValueType.AnsiStringType;
    case 0x03:
      return BinXmlValueType.Int8Type;
    case 0x04:
      return BinXmlValueType.UInt8Type;
    case 0x05:
      return BinXmlValueType.Int16Type;
    case 0x06:
      return BinXmlValueType.UInt16Type;
    case 0x07:
      return BinXmlValueType.Int32Type;
    case 0x08:
      return BinXmlValueType.UInt32Type;
    case 0x09:
      return BinXmlValueType.Int64Type;
    case 0x0a:
      return BinXmlValueType.UInt64Type;
    case 0x0b:
      return BinXmlValueType.Real32Type;
    case 0x0c:
      return BinXmlValueType.Real64Type;
    case 0x0d:
      return BinXmlValueType.BoolType;
    case 0x0e:
      return BinXmlValueType.BinaryType;
    case 0x0f:
      return BinXmlValueType.GuidType;
    case 0x10:
      return BinXmlValueType.SizeTType;
    case 0x11:
      return BinXmlValueType.FileTimeType;
    case 0x12:
      return BinXmlValueType.SysTimeType;
    case 0x13:
      return BinXmlValueType.SidType;
    case 0x14:
      return BinXmlValueType.HexInt32Type;
    case 0x15:
      return BinXmlValueType.HexInt64Type;
    case 0x20:
      return BinXmlValueType.EvtHandle;
    case 0x21:
      return BinXmlValueType.BinXmlType;
    case 0x23:
      return BinXmlValueType.EvtXml;
    case 0x81:
      return BinXmlValueType.StringArrayType;
    case 0x82:
      return BinXmlValueType.AnsiStringArrayType;
    case 0x83:
      return BinXmlValueType.Int8ArrayType;
    case 0x84:
      return BinXmlValueType.UInt8ArrayType;
    case 0x85:
      return BinXmlValueType.Int16ArrayType;
    case 0x86:
      return BinXmlValueType.UInt16ArrayType;
    case 0x87:
      return BinXmlValueType.Int32ArrayType;
    case 0x88:
      return BinXmlValueType.UInt32ArrayType;
    case 0x89:
      return BinXmlValueType.Int64ArrayType;
    case 0x8a:
      return BinXmlValueType.UInt64ArrayType;
    case 0x8b:
      return BinXmlValueType.Real32ArrayType;
    case 0x8c:
      return BinXmlValueType.Real64ArrayType;
    case 0x8d:
      return BinXmlValueType.BoolArrayType;
    case 0x8e:
      return BinXmlValueType.BinaryArrayType;
    case 0x8f:
      return BinXmlValueType.GuidArrayType;
    case 0x90:
      return BinXmlValueType.SizeTArrayType;
    case 0x91:
      return BinXmlValueType.FileTimeArrayType;
    case 0x92:
      return BinXmlValueType.SysTimeArrayType;
    case 0x93:
      return BinXmlValueType.SidArrayType;
    case 0x94:
      return BinXmlValueType.HexInt32ArrayType;
    case 0x95:
      return BinXmlValueType.HexInt64ArrayType;
    default:
      return null;
  }
}

// 1:1 translation of BinXmlValue::from_binxml_stream
export function from_binxml_stream(
  cursor: Buffer,
  offset: number,
  chunk: any,
  size: number | null,
  ansi_codec: string
): { result: Result<BinXmlValue>; new_position: number } {
  try {
    const value_type_token = cursor.readUInt8(offset);
    const value_type = value_type_from_u8(value_type_token);

    if (!value_type) {
      // console.log(`DEBUG: value_deserializer.ts throwing Invalid value variant: ${value_type_token} at offset ${offset}`);
      return {
        result: err(new Error(`Invalid value variant: ${value_type_token} at offset ${offset}`)),
        new_position: offset,
      };
    }

    return deserialize_value_type(value_type, cursor, offset + 1, chunk, size, ansi_codec);
  } catch (e) {
    return {
      result: err(
        new Error(
          `Failed to read from binxml stream: ${e instanceof Error ? e.message : String(e)}`
        )
      ),
      new_position: offset,
    };
  }
}

// 1:1 translation of BinXmlValue::deserialize_value_type
export function deserialize_value_type(
  value_type: BinXmlValueType,
  cursor: Buffer,
  offset: number,
  chunk: any,
  size: number | null,
  ansi_codec: string
): { result: Result<BinXmlValue>; new_position: number } {
  // console.log(`Offset 0x${offset.toString(16).padStart(8, '0')} (${offset}): ${JSON.stringify(value_type)}, size: ${size}`);

  let pos = offset;

  try {
    let value: BinXmlValue;

    switch (value_type) {
      case BinXmlValueType.NullType:
        value = { kind: 'NullType' };
        break;

      case BinXmlValueType.StringType:
        if (size !== null) {
          const str = read_utf16_by_size(cursor, pos, size) || '';
          pos += size;
          value = { kind: 'StringType', value: str };
        } else {
          const str = read_len_prefixed_utf16_string(cursor, pos) || '';
          pos += 2 + str.length * 2; // 2 bytes for length + string data
          value = { kind: 'StringType', value: str };
        }
        break;

      case BinXmlValueType.AnsiStringType:
        if (size !== null) {
          const str = read_ansi_encoded_string(cursor, pos, size, ansi_codec) || '';
          pos += size;
          value = { kind: 'AnsiStringType', value: str };
        } else {
          return {
            result: err(
              new Error(`Unimplemented value variant: AnsiString without size at offset ${offset}`)
            ),
            new_position: pos,
          };
        }
        break;

      case BinXmlValueType.Int8Type:
        value = { kind: 'Int8Type', value: cursor.readInt8(pos) };
        pos += 1;
        break;

      case BinXmlValueType.UInt8Type:
        value = { kind: 'UInt8Type', value: cursor.readUInt8(pos) };
        pos += 1;
        break;

      case BinXmlValueType.Int16Type:
        value = { kind: 'Int16Type', value: cursor.readInt16LE(pos) };
        pos += 2;
        break;

      case BinXmlValueType.UInt16Type:
        value = { kind: 'UInt16Type', value: cursor.readUInt16LE(pos) };
        pos += 2;
        break;

      case BinXmlValueType.Int32Type:
        value = { kind: 'Int32Type', value: cursor.readInt32LE(pos) };
        pos += 4;
        break;

      case BinXmlValueType.UInt32Type:
        value = { kind: 'UInt32Type', value: cursor.readUInt32LE(pos) };
        pos += 4;
        break;

      case BinXmlValueType.Int64Type:
        value = { kind: 'Int64Type', value: cursor.readBigInt64LE(pos) };
        pos += 8;
        break;

      case BinXmlValueType.UInt64Type:
        value = { kind: 'UInt64Type', value: cursor.readBigUInt64LE(pos) };
        pos += 8;
        break;

      case BinXmlValueType.Real32Type:
        value = { kind: 'Real32Type', value: cursor.readFloatLE(pos) };
        pos += 4;
        break;

      case BinXmlValueType.Real64Type:
        value = { kind: 'Real64Type', value: cursor.readDoubleLE(pos) };
        pos += 8;
        break;

      case BinXmlValueType.BoolType:
        value = { kind: 'BoolType', value: cursor.readUInt8(pos) !== 0 };
        pos += 1;
        break;

      case BinXmlValueType.GuidType:
        value = { kind: 'GuidType', value: read_guid(cursor, pos) };
        pos += 16;
        break;

      case BinXmlValueType.SizeTType:
        if (size === 4) {
          value = { kind: 'HexInt32Type', value: read_hex32(cursor, pos) };
          pos += 4;
        } else if (size === 8) {
          value = { kind: 'HexInt64Type', value: read_hex64(cursor, pos) };
          pos += 8;
        } else {
          return {
            result: err(
              new Error(`Unimplemented value variant: SizeT with size ${size} at offset ${offset}`)
            ),
            new_position: pos,
          };
        }
        break;

      case BinXmlValueType.FileTimeType:
        value = { kind: 'FileTimeType', value: read_filetime(cursor, pos) };
        pos += 8;
        break;

      case BinXmlValueType.SysTimeType:
        value = { kind: 'SysTimeType', value: read_systemtime(cursor, pos) };
        pos += 16;
        break;

      case BinXmlValueType.SidType:
        const sid = read_sid(cursor, pos);
        // SID size varies, for now advance by a fixed amount
        pos += 12; // Minimum SID size
        value = { kind: 'SidType', value: sid };
        break;

      case BinXmlValueType.HexInt32Type:
        value = { kind: 'HexInt32Type', value: read_hex32(cursor, pos) };
        pos += 4;
        break;

      case BinXmlValueType.HexInt64Type:
        value = { kind: 'HexInt64Type', value: read_hex64(cursor, pos) };
        pos += 8;
        break;

      case BinXmlValueType.BinXmlType:
        const fragment_result = BinXmlDeserializer.read_binxml_fragment(
          cursor,
          pos,
          chunk,
          size ? size : null,
          true,
          ansi_codec
        );

        if (fragment_result.kind === 'err') {
          return { result: fragment_result, new_position: pos };
        }

        value = { kind: 'BinXmlType', value: fragment_result.value };
        pos += size || 0; // Advance by the size if provided
        break;

      case BinXmlValueType.BinaryType:
        if (size !== null) {
          const bytes = cursor.subarray(pos, pos + size);
          pos += size;
          value = { kind: 'BinaryType', value: bytes };
        } else {
          return {
            result: err(new Error(`Binary type requires size at offset ${offset}`)),
            new_position: pos,
          };
        }
        break;

      case BinXmlValueType.EvtHandle:
        value = { kind: 'EvtHandle' };
        break;

      case BinXmlValueType.EvtXml:
        value = { kind: 'EvtXml' };
        break;

      // Array types - simplified for now
      case BinXmlValueType.StringArrayType:
        if (size !== null) {
          const strings: string[] = [];
          let array_pos = pos;
          const end_pos = pos + size;

          while (array_pos < end_pos) {
            const str = read_null_terminated_utf16_string(cursor, array_pos);
            strings.push(str);
            array_pos += (str.length + 1) * 2; // +1 for null terminator
          }

          pos = end_pos;
          value = { kind: 'StringArrayType', value: strings };
        } else {
          return {
            result: err(new Error(`String array requires size at offset ${offset}`)),
            new_position: pos,
          };
        }
        break;

      default:
        return {
          result: err(
            new Error(
              `Unimplemented value variant: ${JSON.stringify(value_type)} at offset ${offset}`
            )
          ),
          new_position: pos,
        };
    }

    return { result: ok(value), new_position: pos };
  } catch (e) {
    return {
      result: err(
        new Error(`Failed to deserialize value type: ${e instanceof Error ? e.message : String(e)}`)
      ),
      new_position: pos,
    };
  }
}
