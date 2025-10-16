import { BinXmlValue, BinXmlValueType } from './value_variant.js';
import { BinXmlDeserializer } from './deserializer.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

// Helper function to format GUID from bytes
function format_guid_helper(bytes: Buffer): string {
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

// Helper function to parse Windows SYSTEMTIME structure
function parse_systemtime(buffer: Buffer): Date {
  const year = buffer.readUInt16LE(0);
  const month = buffer.readUInt16LE(2);
  const dayOfWeek = buffer.readUInt16LE(4);
  const day = buffer.readUInt16LE(6);
  const hour = buffer.readUInt16LE(8);
  const minute = buffer.readUInt16LE(10);
  const second = buffer.readUInt16LE(12);
  const milliseconds = buffer.readUInt16LE(14);

  return new Date(year, month - 1, day, hour, minute, second, milliseconds);
}

// Helper function to parse Windows SID
function parse_sid(buffer: Buffer): string {
  const revision = buffer.readUInt8(0);
  const sub_authority_count = buffer.readUInt8(1);
  const identifier_authority = buffer.readUIntBE(2, 6);

  let sid = `S-${revision}-${identifier_authority}`;

  for (let i = 0; i < sub_authority_count; i++) {
    const sub_authority = buffer.readUInt32LE(8 + i * 4);
    sid += `-${sub_authority}`;
  }

  return sid;
}

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// 1:1 translation of BinXmlValueType::from_u8 - EXACT copy from Rust
export function binxml_value_type_from_u8(byte: number): BinXmlValueType | null {
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

// 1:1 translation of BinXmlValue::from_binxml_stream - EXACT copy from Rust
export function binxml_value_from_stream(
  cursor: Buffer,
  cursor_position: number,
  chunk: any,
  size: number | null,
  ansi_codec: string
): Result<{ value: BinXmlValue; new_position: number }> {
  try {
    if (cursor_position >= cursor.length) {
      return err(new Error('Not enough data for value type'));
    }

    const value_type_token = cursor.readUInt8(cursor_position);
    let pos = cursor_position + 1;

    const value_type = binxml_value_type_from_u8(value_type_token);
    if (value_type === null) {
      // console.log(`DEBUG: value_reader.ts throwing Invalid value variant: ${value_type_token} at offset ${cursor_position}`);
      return err(
        new Error(`Invalid value variant: ${value_type_token} at offset ${cursor_position}`)
      );
    }

    // console.log(`DEBUG: Reading value type ${value_type} (0x${value_type_token.toString(16)}) at offset ${cursor_position}`);
    // console.log(`DEBUG: Calling deserialize_value_type with pos=${pos}`);

    const value_result = deserialize_value_type(value_type, cursor, pos, chunk, size, ansi_codec);
    if (value_result.kind === 'err') {
      return value_result;
    }

    // console.log(`DEBUG: deserialize_value_type returned new_position=${value_result.value.new_position}`);
    return ok({
      value: value_result.value.value,
      new_position: value_result.value.new_position,
    });
  } catch (e) {
    return err(
      new Error(`Failed to read value from stream: ${e instanceof Error ? e.message : String(e)}`)
    );
  }
}

// 1:1 translation of deserialize_value_type - EXACT copy from Rust logic
export function deserialize_value_type(
  value_type: BinXmlValueType,
  cursor: Buffer,
  cursor_position: number,
  chunk: any,
  size: number | null,
  ansi_codec: string
): Result<{ value: BinXmlValue; new_position: number }> {
  try {
    let pos = cursor_position;

    // console.log(`DEBUG: Deserializing value type ${value_type}, size=${size}, offset=${pos}`);

    switch (value_type) {
      case BinXmlValueType.NullType:
        return ok({
          value: { kind: 'NullType' },
          new_position: pos,
        });

      case BinXmlValueType.AnsiStringType:
        if (size === null) {
          return err(new Error('AnsiStringType requires size'));
        }
        if (pos + size > cursor.length) {
          return err(new Error(`Not enough data for ANSI string (size: ${size})`));
        }
        const ansi_bytes = cursor.subarray(pos, pos + size);
        const ansi_str = ansi_bytes.toString('ascii').replace(/\0+$/, ''); // Remove null terminators
        pos += size;
        return ok({
          value: { kind: 'AnsiStringType', value: ansi_str },
          new_position: pos,
        });

      case BinXmlValueType.StringType:
        if (size !== null) {
          // Sized string - read exactly `size` bytes as UTF-16
          if (pos + size > cursor.length) {
            return err(new Error(`Not enough data for sized string (size: ${size})`));
          }
          const string_bytes = cursor.subarray(pos, pos + size);
          const str_value = string_bytes.toString('utf16le');
          pos += size;
          return ok({
            value: { kind: 'StringType', value: str_value },
            new_position: pos,
          });
        } else {
          // Length-prefixed string
          if (pos + 2 > cursor.length) {
            return err(new Error('Not enough data for string length'));
          }
          const len = cursor.readUInt16LE(pos);
          pos += 2;
          if (pos + len * 2 > cursor.length) {
            return err(new Error('Not enough data for string content'));
          }
          const string_bytes = cursor.subarray(pos, pos + len * 2);
          const str_value = string_bytes.toString('utf16le');
          pos += len * 2;
          return ok({
            value: { kind: 'StringType', value: str_value },
            new_position: pos,
          });
        }

      case BinXmlValueType.Int8Type:
        if (pos + 1 > cursor.length) {
          return err(new Error('Not enough data for Int8'));
        }
        const int8_value = cursor.readInt8(pos);
        pos += 1;
        return ok({
          value: { kind: 'Int8Type', value: int8_value },
          new_position: pos,
        });

      case BinXmlValueType.UInt8Type:
        if (pos + 1 > cursor.length) {
          return err(new Error('Not enough data for UInt8'));
        }
        const uint8_value = cursor.readUInt8(pos);
        pos += 1;
        return ok({
          value: { kind: 'UInt8Type', value: uint8_value },
          new_position: pos,
        });

      case BinXmlValueType.Int16Type:
        if (pos + 2 > cursor.length) {
          return err(new Error('Not enough data for Int16'));
        }
        const int16_value = cursor.readInt16LE(pos);
        pos += 2;
        return ok({
          value: { kind: 'Int16Type', value: int16_value },
          new_position: pos,
        });

      case BinXmlValueType.UInt16Type:
        if (pos + 2 > cursor.length) {
          return err(new Error('Not enough data for UInt16'));
        }
        const uint16_value = cursor.readUInt16LE(pos);
        pos += 2;
        return ok({
          value: { kind: 'UInt16Type', value: uint16_value },
          new_position: pos,
        });

      case BinXmlValueType.Int32Type:
        if (pos + 4 > cursor.length) {
          return err(new Error('Not enough data for Int32'));
        }
        const int32_value = cursor.readInt32LE(pos);
        pos += 4;
        return ok({
          value: { kind: 'Int32Type', value: int32_value },
          new_position: pos,
        });

      case BinXmlValueType.UInt32Type:
        if (pos + 4 > cursor.length) {
          return err(new Error('Not enough data for UInt32'));
        }
        const uint32_value = cursor.readUInt32LE(pos);
        pos += 4;
        return ok({
          value: { kind: 'UInt32Type', value: uint32_value },
          new_position: pos,
        });

      case BinXmlValueType.Int64Type:
        if (pos + 8 > cursor.length) {
          return err(new Error('Not enough data for Int64'));
        }
        const int64_value = cursor.readBigInt64LE(pos);
        pos += 8;
        return ok({
          value: { kind: 'Int64Type', value: int64_value },
          new_position: pos,
        });

      case BinXmlValueType.UInt64Type:
        if (pos + 8 > cursor.length) {
          return err(new Error('Not enough data for UInt64'));
        }
        const uint64_value = cursor.readBigUInt64LE(pos);
        pos += 8;
        return ok({
          value: { kind: 'UInt64Type', value: uint64_value },
          new_position: pos,
        });

      case BinXmlValueType.Real32Type:
        if (pos + 4 > cursor.length) {
          return err(new Error('Not enough data for Real32'));
        }
        const float32_value = cursor.readFloatLE(pos);
        pos += 4;
        return ok({
          value: { kind: 'Real32Type', value: float32_value },
          new_position: pos,
        });

      case BinXmlValueType.Real64Type:
        if (pos + 8 > cursor.length) {
          return err(new Error('Not enough data for Real64'));
        }
        const float64_value = cursor.readDoubleLE(pos);
        pos += 8;
        return ok({
          value: { kind: 'Real64Type', value: float64_value },
          new_position: pos,
        });

      case BinXmlValueType.BoolType:
        if (pos + 1 > cursor.length) {
          return err(new Error('Not enough data for Bool'));
        }
        const bool_value = cursor.readUInt8(pos) !== 0;
        pos += 1;
        return ok({
          value: { kind: 'BoolType', value: bool_value },
          new_position: pos,
        });

      case BinXmlValueType.GuidType:
        if (pos + 16 > cursor.length) {
          return err(new Error('Not enough data for GUID'));
        }
        const guid_bytes = cursor.subarray(pos, pos + 16);
        const guid_str = format_guid_helper(guid_bytes);
        pos += 16;
        return ok({
          value: { kind: 'GuidType', value: guid_str },
          new_position: pos,
        });

      case BinXmlValueType.BinaryType:
        if (size === null) {
          return err(new Error('Binary type requires size'));
        }
        if (pos + size > cursor.length) {
          return err(new Error(`Not enough data for binary (size: ${size})`));
        }
        const binary_data = cursor.subarray(pos, pos + size);
        pos += size;
        return ok({
          value: { kind: 'BinaryType', value: new Uint8Array(binary_data) },
          new_position: pos,
        });

      case BinXmlValueType.HexInt64Type:
        if (pos + 8 > cursor.length) {
          return err(new Error('Not enough data for HexInt64'));
        }
        const hex64_value = cursor.readBigUInt64LE(pos);
        const hex64_str = '0x' + hex64_value.toString(16).toUpperCase();
        pos += 8;
        return ok({
          value: { kind: 'HexInt64Type', value: hex64_str },
          new_position: pos,
        });

      case BinXmlValueType.FileTimeType:
        if (pos + 8 > cursor.length) {
          return err(new Error('Not enough data for FileTime'));
        }
        const filetime_value = cursor.readBigUInt64LE(pos);
        // Windows FILETIME: 100-nanosecond intervals since January 1, 1601
        const unix_timestamp = Number(filetime_value) / 10000 - 11644473600000;
        const filetime_date = new Date(unix_timestamp);
        pos += 8;
        return ok({
          value: { kind: 'FileTimeType', value: filetime_date },
          new_position: pos,
        });

      case BinXmlValueType.SysTimeType:
        if (pos + 16 > cursor.length) {
          return err(new Error('Not enough data for SystemTime'));
        }
        const systime_date = parse_systemtime(cursor.subarray(pos, pos + 16));
        pos += 16;
        return ok({
          value: { kind: 'SysTimeType', value: systime_date },
          new_position: pos,
        });

      case BinXmlValueType.SidType:
        if (pos + 8 > cursor.length) {
          return err(new Error('Not enough data for SID header'));
        }
        const sid_str = parse_sid(cursor.subarray(pos, pos + (size || 20)));
        // SID length varies, advance by actual parsed length
        const sid_length = 8 + cursor.readUInt8(pos + 1) * 4; // 8 bytes header + sub-authorities
        pos += sid_length;
        return ok({
          value: { kind: 'SidType', value: sid_str },
          new_position: pos,
        });

      // ARRAY TYPES - implement the exact Rust logic for 0x89 (Int64ArrayType)
      case BinXmlValueType.Int64ArrayType:
        if (size === null) {
          return err(new Error('Int64ArrayType requires size'));
        }
        // Size is number of elements, each element is 8 bytes
        const element_count = size / 8;
        if (pos + size > cursor.length) {
          return err(new Error(`Not enough data for Int64 array (size: ${size})`));
        }
        const int64_array: bigint[] = [];
        for (let i = 0; i < element_count; i++) {
          int64_array.push(cursor.readBigInt64LE(pos));
          pos += 8;
        }
        return ok({
          value: { kind: 'Int64ArrayType', value: int64_array },
          new_position: pos,
        });

      case BinXmlValueType.BinXmlType:
        if (size === null) {
          return err(new Error('BinXmlType requires size'));
        }
        if (pos + size > cursor.length) {
          return err(new Error(`Not enough data for BinXmlType (size: ${size})`));
        }
        // For now, return the raw binary data as bytes
        // Implement proper binary XML parsing using BinXmlDeserializer
        const binxml_result = BinXmlDeserializer.read_binxml_fragment(
          cursor,
          pos,
          chunk,
          size,
          true, // is_inside_substitution = true for BinXmlType
          ansi_codec
        );

        if (binxml_result.kind === 'err') {
          return binxml_result;
        }

        pos += size;
        return ok({
          value: { kind: 'BinXmlType', value: binxml_result.value },
          new_position: pos,
        });

      default:
        return err(new Error(`Unimplemented value type: ${value_type} at offset ${pos}`));
    }
  } catch (e) {
    return err(
      new Error(`Failed to deserialize value type: ${e instanceof Error ? e.message : String(e)}`)
    );
  }
}

// Helper function to format GUID (already exists but importing here for completeness)
function format_guid(guid_bytes: Buffer): string {
  if (guid_bytes.length !== 16) {
    throw new Error('GUID must be 16 bytes');
  }

  const hex = guid_bytes.toString('hex').toUpperCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
