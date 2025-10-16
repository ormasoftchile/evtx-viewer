import { BinXMLDeserializedTokens } from '../model/deserialized.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function _ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function _err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// 1:1 translation of BinXmlValue enum - using discriminated union
export type BinXmlValue =
  | { kind: 'NullType' }
  | { kind: 'StringType'; value: string }
  | { kind: 'AnsiStringType'; value: string }
  | { kind: 'Int8Type'; value: number }
  | { kind: 'UInt8Type'; value: number }
  | { kind: 'Int16Type'; value: number }
  | { kind: 'UInt16Type'; value: number }
  | { kind: 'Int32Type'; value: number }
  | { kind: 'UInt32Type'; value: number }
  | { kind: 'Int64Type'; value: bigint }
  | { kind: 'UInt64Type'; value: bigint }
  | { kind: 'Real32Type'; value: number }
  | { kind: 'Real64Type'; value: number }
  | { kind: 'BoolType'; value: boolean }
  | { kind: 'BinaryType'; value: Uint8Array }
  | { kind: 'GuidType'; value: string }
  | { kind: 'SizeTType'; value: number }
  | { kind: 'FileTimeType'; value: Date }
  | { kind: 'SysTimeType'; value: Date }
  | { kind: 'SidType'; value: string }
  | { kind: 'HexInt32Type'; value: string }
  | { kind: 'HexInt64Type'; value: string }
  | { kind: 'EvtHandle' }
  | { kind: 'BinXmlType'; value: BinXMLDeserializedTokens[] }
  | { kind: 'EvtXml' }
  | { kind: 'StringArrayType'; value: string[] }
  | { kind: 'AnsiStringArrayType' }
  | { kind: 'Int8ArrayType'; value: number[] }
  | { kind: 'UInt8ArrayType'; value: number[] }
  | { kind: 'Int16ArrayType'; value: number[] }
  | { kind: 'UInt16ArrayType'; value: number[] }
  | { kind: 'Int32ArrayType'; value: number[] }
  | { kind: 'UInt32ArrayType'; value: number[] }
  | { kind: 'Int64ArrayType'; value: bigint[] }
  | { kind: 'UInt64ArrayType'; value: bigint[] }
  | { kind: 'Real32ArrayType'; value: number[] }
  | { kind: 'Real64ArrayType'; value: number[] }
  | { kind: 'BoolArrayType'; value: boolean[] }
  | { kind: 'BinaryArrayType' }
  | { kind: 'GuidArrayType'; value: string[] }
  | { kind: 'SizeTArrayType' }
  | { kind: 'FileTimeArrayType'; value: Date[] }
  | { kind: 'SysTimeArrayType'; value: Date[] }
  | { kind: 'SidArrayType'; value: string[] }
  | { kind: 'HexInt32ArrayType'; value: string[] }
  | { kind: 'HexInt64ArrayType'; value: string[] }
  | { kind: 'EvtArrayHandle' }
  | { kind: 'BinXmlArrayType' }
  | { kind: 'EvtXmlArrayType' };

// 1:1 translation of BinXmlValueType enum
export enum BinXmlValueType {
  NullType = 0,
  StringType = 1,
  AnsiStringType = 2,
  Int8Type = 3,
  UInt8Type = 4,
  Int16Type = 5,
  UInt16Type = 6,
  Int32Type = 7,
  UInt32Type = 8,
  Int64Type = 9,
  UInt64Type = 10,
  Real32Type = 11,
  Real64Type = 12,
  BoolType = 13,
  BinaryType = 14,
  GuidType = 15,
  SizeTType = 16,
  FileTimeType = 17,
  SysTimeType = 18,
  SidType = 19,
  HexInt32Type = 20,
  HexInt64Type = 21,
  EvtHandle = 32,
  BinXmlType = 33,
  EvtXml = 35,
  StringArrayType = 129,
  AnsiStringArrayType = 130,
  Int8ArrayType = 131,
  UInt8ArrayType = 132,
  Int16ArrayType = 133,
  UInt16ArrayType = 134,
  Int32ArrayType = 135,
  UInt32ArrayType = 136,
  Int64ArrayType = 137,
  UInt64ArrayType = 138,
  Real32ArrayType = 139,
  Real64ArrayType = 140,
  BoolArrayType = 141,
  BinaryArrayType = 142,
  GuidArrayType = 143,
  SizeTArrayType = 144,
  FileTimeArrayType = 145,
  SysTimeArrayType = 146,
  SidArrayType = 147,
  HexInt32ArrayType = 148,
  HexInt64ArrayType = 149,
  EvtArrayHandle = 160,
  BinXmlArrayType = 161,
  EvtXmlArrayType = 163,
}

// Helper functions for creating BinXmlValue instances
export function create_null_value(): BinXmlValue {
  return { kind: 'NullType' };
}

export function create_string_value(value: string): BinXmlValue {
  return { kind: 'StringType', value };
}

export function create_int32_value(value: number): BinXmlValue {
  return { kind: 'Int32Type', value };
}

export function create_uint32_value(value: number): BinXmlValue {
  return { kind: 'UInt32Type', value };
}

export function create_int64_value(value: bigint): BinXmlValue {
  return { kind: 'Int64Type', value };
}

export function create_uint64_value(value: bigint): BinXmlValue {
  return { kind: 'UInt64Type', value };
}

export function create_bool_value(value: boolean): BinXmlValue {
  return { kind: 'BoolType', value };
}

export function create_guid_value(value: string): BinXmlValue {
  return { kind: 'GuidType', value };
}

export function create_datetime_value(value: Date): BinXmlValue {
  return { kind: 'FileTimeType', value };
}

// Constants for datetime formatting
export const DATETIME_FORMAT = '%Y-%m-%dT%H:%M:%S%.6fZ';

// Helper function to convert BinXmlValue to JSON representation
export function binxml_value_to_json(value: BinXmlValue): any {
  switch (value.kind) {
    case 'NullType':
      return null;
    case 'StringType':
    case 'AnsiStringType':
    case 'HexInt32Type':
    case 'HexInt64Type':
    case 'SidType':
    case 'GuidType':
      return value.value;
    case 'Int8Type':
    case 'UInt8Type':
    case 'Int16Type':
    case 'UInt16Type':
    case 'Int32Type':
    case 'UInt32Type':
    case 'SizeTType':
    case 'Real32Type':
    case 'Real64Type':
      return value.value;
    case 'Int64Type':
    case 'UInt64Type':
      return value.value.toString();
    case 'BoolType':
      return value.value;
    case 'FileTimeType':
    case 'SysTimeType':
      return value.value.toISOString();
    case 'BinaryType':
      return Array.from(value.value);
    case 'StringArrayType':
    case 'Int8ArrayType':
    case 'UInt8ArrayType':
    case 'Int16ArrayType':
    case 'UInt16ArrayType':
    case 'Int32ArrayType':
    case 'UInt32ArrayType':
    case 'Real32ArrayType':
    case 'Real64ArrayType':
    case 'BoolArrayType':
    case 'GuidArrayType':
    case 'HexInt32ArrayType':
    case 'HexInt64ArrayType':
    case 'SidArrayType':
      return value.value;
    case 'Int64ArrayType':
    case 'UInt64ArrayType':
      return value.value.map((v) => v.toString());
    case 'FileTimeArrayType':
    case 'SysTimeArrayType':
      return value.value.map((v) => v.toISOString());
    default:
      return null;
  }
}
