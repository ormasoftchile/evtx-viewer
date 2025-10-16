import { BinXmlDeserializer } from './deserializer.js';
import { BinXmlNameRef } from './name.js';
import { BinXmlValue, BinXmlValueType } from './value_variant.js';
import { binxml_value_type_from_u8 } from './value_reader.js';
import { deserialize_value_type } from './value_deserializer.js';
import {
  BinXMLDeserializedTokens,
  BinXmlTemplateDefinitionHeader,
  BinXMLTemplateDefinition,
  BinXmlTemplateRef,
  TemplateValueDescriptor,
  TemplateSubstitutionDescriptor,
  BinXmlEntityReference,
  BinXMLAttribute,
  BinXMLFragmentHeader,
  BinXMLProcessingInstructionTarget,
  BinXMLOpenStartElement,
} from '../model/deserialized.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

// Result type that also returns bytes consumed
type ResultWithBytes<T, E = Error> = {
  result: Result<T, E>;
  bytes_consumed: number;
};

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

function okWithBytes<T>(value: T, bytes_consumed: number): ResultWithBytes<T> {
  return {
    result: { kind: 'ok', value },
    bytes_consumed,
  };
}

function errWithBytes<E extends Error>(error: E): ResultWithBytes<never, E> {
  return {
    result: { kind: 'err', error },
    bytes_consumed: 0,
  };
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
    .map((part, index) => {
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

// 1:1 translation of read_template function from Rust
export function read_template(
  cursor: Buffer,
  position: number,
  chunk: any,
  ansi_codec: string
): ResultWithBytes<BinXmlTemplateRef> {
  // console.log(`TemplateInstance at ${position}`);

  let pos = position;

  // Skip token byte
  pos += 1;

  const template_id = cursor.readUInt32LE(pos);
  pos += 4;

  const template_definition_data_offset = cursor.readUInt32LE(pos);
  pos += 4;

  // console.log(`DEBUG readTemplateInstance: Raw template offset read: ${template_definition_data_offset}, pos is now ${pos}`);

  // Need to skip over the template data.
  if (pos === template_definition_data_offset) {
    // console.log(`DEBUG: MATCH! pos (${pos}) === template_definition_data_offset (${template_definition_data_offset}), reading template definition header`);
    const header_result = read_template_definition_header(cursor, pos);
    if (header_result.result.kind === 'err') {
      // console.log(`DEBUG: read_template_definition_header FAILED`);
      return errWithBytes(header_result.result.error);
    }

    const template_header = header_result.result.value;
    // console.log(`DEBUG: Template header bytes_consumed=${header_result.bytes_consumed}, data_size=${template_header.data_size}`);
    pos += header_result.bytes_consumed; // Advance by header size (24 bytes)
    pos += template_header.data_size; // Skip template data
    // console.log(`DEBUG: After skipping template: pos advanced to ${pos}`);
  } else {
    // console.log(`DEBUG: NO MATCH - pos (${pos}) !== template_definition_data_offset (${template_definition_data_offset}), skipping template definition`);
  }

  // console.log(`DEBUG readTemplateInstance: Using template offset: ${template_definition_data_offset}, pos after template=${pos}`);

  const number_of_substitutions = cursor.readUInt32LE(pos);
  pos += 4;
  // console.log(`DEBUG: number_of_substitutions=${number_of_substitutions}, pos now=${pos}`);

  const value_descriptors: TemplateValueDescriptor[] = [];

  for (let i = 0; i < number_of_substitutions; i++) {
    // console.log(`DEBUG: Reading descriptor ${i+1}/${number_of_substitutions} at pos=${pos}`);
    const size = cursor.readUInt16LE(pos);
    pos += 2;
    // console.log(`DEBUG:   size=${size}, pos now=${pos}`);

    const value_type_token = cursor.readUInt8(pos);
    pos += 1;
    // console.log(`DEBUG:   value_type_token=${value_type_token} (0x${value_type_token.toString(16)}), pos now=${pos}`);

    const value_type = binxml_value_type_from_u8(value_type_token);
    if (value_type === null) {
      // console.log(`DEBUG: FAILED - binxml_value_type_from_u8 returned null for token ${value_type_token}`);
      return errWithBytes(new Error(`Invalid value variant: ${value_type_token} at offset ${pos}`));
    }

    // Empty byte
    pos += 1;

    value_descriptors.push(new TemplateValueDescriptor(size, value_type));
  }

  // console.log('Value descriptors:', value_descriptors);

  const substitution_array: BinXMLDeserializedTokens[] = [];

  for (const descriptor of value_descriptors) {
    const position_before_reading_value = pos;
    // console.log(`Offset 0x${position_before_reading_value.toString(16).padStart(8, '0')} (${position_before_reading_value}): Substitution: ${JSON.stringify(descriptor.value_type)}`);

    const value_result = deserialize_value_type(
      descriptor.value_type,
      cursor,
      pos,
      chunk,
      descriptor.size,
      ansi_codec
    );

    if (value_result.result.kind === 'err') {
      return errWithBytes(value_result.result.error);
    }

    const value = value_result.result.value;
    pos = value_result.new_position;

    // console.log('\t', value);

    // NullType can mean deleted substitution (and data need to be skipped)
    if (value.kind === 'NullType') {
      // console.log('\t Skipping `NullType` descriptor');
      pos = position_before_reading_value + descriptor.size;
    }

    const current_position = pos;
    const expected_position = position_before_reading_value + descriptor.size;

    if (expected_position !== current_position) {
      const diff = expected_position - current_position;
      // Silently correct cursor position mismatch
      if (diff >= 0) {
        pos = current_position + diff;
      }
      // Note: Negative diff indicates potentially broken record, but we continue parsing
    }

    substitution_array.push({ kind: 'Value', value });
  }

  const bytes_consumed = pos - position;
  return okWithBytes(
    new BinXmlTemplateRef(template_definition_data_offset, substitution_array),
    bytes_consumed
  );
}

// 1:1 translation of read_template_definition_header function
export function read_template_definition_header(
  cursor: Buffer,
  position: number
): ResultWithBytes<BinXmlTemplateDefinitionHeader> {
  let pos = position;

  // DEBUG: Check what bytes we're reading
  const first_bytes = cursor.subarray(pos, pos + 8);
  // console.log(`DEBUG read_template_definition_header: position=${pos}, first 8 bytes: ${first_bytes.toString('hex')}`);

  const next_template_offset = cursor.readUInt32LE(pos);
  pos += 4;

  const template_guid = read_guid(cursor, pos);
  pos += 16;

  const data_size = cursor.readUInt32LE(pos);
  pos += 4;

  // console.log(`DEBUG: Template header: next_offset=${next_template_offset}, guid=${template_guid}, data_size=${data_size}`);

  const bytes_consumed = pos - position;
  return okWithBytes(
    new BinXmlTemplateDefinitionHeader(next_template_offset, template_guid, data_size),
    bytes_consumed
  );
}

// 1:1 translation of read_template_definition function
export function read_template_definition(
  cursor: Buffer,
  position: number,
  chunk: any,
  ansi_codec: string
): Result<BinXMLTemplateDefinition> {
  const header_result = read_template_definition_header(cursor, position);
  if (header_result.result.kind === 'err') {
    return header_result.result;
  }

  const header = header_result.result.value;
  const pos_after_header = position + header_result.bytes_consumed;

  // console.log(`Offset 0x${position.toString(16).padStart(8, '0')} - TemplateDefinition ${header.guid}`);
  // console.log(`DEBUG read_template_definition: header.data_size=${header.data_size}, reading from position ${pos_after_header}`);

  const fragment_result = BinXmlDeserializer.read_binxml_fragment(
    cursor,
    pos_after_header,
    chunk,
    header.data_size,
    false,
    ansi_codec
  );

  if (fragment_result.kind === 'err') {
    return err(
      new Error(`Failed to deserialize template ${header.guid}: ${fragment_result.error.message}`)
    );
  }

  // console.log(`DEBUG read_template_definition: Read ${fragment_result.value.length} tokens from template`);
  for (let i = 0; i < fragment_result.value.length; i++) {
    // console.log(`  Token ${i}: ${fragment_result.value[i].kind}`);
  }
  const template = new BinXMLTemplateDefinition(header, fragment_result.value);
  return ok(template);
}

// 1:1 translation of read_entity_ref function
export function read_entity_ref(
  cursor: Buffer,
  position: number
): ResultWithBytes<BinXmlEntityReference> {
  // console.log(`Offset 0x${position.toString(16).padStart(8, '0')} - EntityReference`);

  const name_result = BinXmlNameRef.from_stream(cursor, position);
  if (name_result.result.kind === 'err') {
    return { result: name_result.result, bytes_consumed: 0 };
  }

  const name = name_result.result.value;
  // console.log(`\t name: offset ${name.offset}`);

  return okWithBytes(new BinXmlEntityReference(name), name_result.bytes_consumed);
}

// 1:1 translation of read_attribute function
export function read_attribute(cursor: Buffer, position: number): ResultWithBytes<BinXMLAttribute> {
  // console.log(`Offset 0x${position.toString(16).padStart(8, '0')} - Attribute`);

  const name_result = BinXmlNameRef.from_stream(cursor, position);
  if (name_result.result.kind === 'err') {
    return { result: name_result.result, bytes_consumed: 0 };
  }

  const name = name_result.result.value;

  return okWithBytes(new BinXMLAttribute(name), name_result.bytes_consumed);
}

// 1:1 translation of read_fragment_header function
export function read_fragment_header(
  cursor: Buffer,
  position: number
): Result<BinXMLFragmentHeader> {
  // console.log(`Offset 0x${position.toString(16).padStart(8, '0')} - FragmentHeader`);

  const major_version = cursor.readUInt8(position);
  const minor_version = cursor.readUInt8(position + 1);
  const flags = cursor.readUInt8(position + 2);

  return ok(new BinXMLFragmentHeader(major_version, minor_version, flags));
}

// 1:1 translation of read_processing_instruction_target function
export function read_processing_instruction_target(
  cursor: Buffer,
  position: number
): ResultWithBytes<BinXMLProcessingInstructionTarget> {
  // console.log(`Offset 0x${position.toString(16).padStart(8, '0')} - ProcessingInstructionTarget`);

  const name_result = BinXmlNameRef.from_stream(cursor, position);
  if (name_result.result.kind === 'err') {
    return { result: name_result.result, bytes_consumed: 0 };
  }

  const name = name_result.result.value;
  // console.log(`\tPITarget Name - offset ${name.offset}`);

  return okWithBytes(new BinXMLProcessingInstructionTarget(name), name_result.bytes_consumed);
}

// 1:1 translation of read_processing_instruction_data function
export function read_processing_instruction_data(cursor: Buffer, position: number): Result<string> {
  // console.log(`Offset 0x${position.toString(16).padStart(8, '0')} - ProcessingInstructionData`);

  const data = read_len_prefixed_utf16_string(cursor, position) || '';
  // console.log(`PIData - ${data}`);

  return ok(data);
}

// 1:1 translation of read_substitution_descriptor function
export function read_substitution_descriptor(
  cursor: Buffer,
  position: number,
  optional: boolean
): Result<TemplateSubstitutionDescriptor> {
  // console.log(`Offset 0x${position.toString(16).padStart(8, '0')} - SubstitutionDescriptor<optional=${optional}>`);

  let pos = position;

  const substitution_index = cursor.readUInt16LE(pos);
  pos += 2;

  const value_type_token = cursor.readUInt8(pos);
  pos += 1;

  const value_type = binxml_value_type_from_u8(value_type_token);
  if (value_type === null) {
    return err(new Error(`Invalid value variant: ${value_type_token} at offset ${pos}`));
  }

  const ignore = optional && (value_type as any) === BinXmlValueType.NullType;

  return ok(new TemplateSubstitutionDescriptor(substitution_index, value_type, ignore));
}

// 1:1 translation of read_open_start_element function
export function read_open_start_element(
  cursor: Buffer,
  position: number,
  chunk: any,
  has_attributes: boolean,
  is_substitution: boolean
): ResultWithBytes<BinXMLOpenStartElement> {
  // console.log(`Offset 0x${position.toString(16).padStart(8, '0')} - OpenStartElement<has_attributes=${has_attributes}, is_substitution=${is_substitution}>`);

  let pos = position;

  // According to documentation, the dependency identifier is not present when the element start is used in a substitution token.
  if (!is_substitution) {
    const dependency_identifier = cursor.readUInt16LE(pos);
    pos += 2;

    // console.log(`\t Dependency Identifier - 0x${dependency_identifier.toString(16).padStart(4, '0')} (${dependency_identifier})`);
  }

  const data_size = cursor.readUInt32LE(pos);
  pos += 4;

  // This is a heuristic, sometimes `dependency_identifier` is not present even though it should have been.
  // This will result in interpreting garbage bytes as the data size.
  // We try to recover from this situation by rolling back the cursor and trying again, without reading the `dependency_identifier`.
  if (chunk && data_size >= chunk.data.length) {
    console.warn(
      'Detected a case where `dependency_identifier` should not have been read. Trying to read again without it.'
    );
    return read_open_start_element(cursor, position, chunk, has_attributes, true);
  }

  // console.log(`\t Data Size - ${data_size}`);

  const name_result = BinXmlNameRef.from_stream(cursor, pos);
  if (name_result.result.kind === 'err') {
    return { result: name_result.result, bytes_consumed: 0 };
  }

  const name = name_result.result.value;
  pos += name_result.bytes_consumed;

  // console.log(`\t Name - offset ${name.offset}, consumed ${name_result.bytes_consumed} bytes`);

  const attribute_list_data_size = has_attributes ? cursor.readUInt32LE(pos) : 0;
  if (has_attributes) {
    // console.log(`\t Attribute List Data Size - ${attribute_list_data_size}`);
    pos += 4;
  }

  const bytes_consumed = pos - position;
  // console.log(`DEBUG read_open_start_element: bytes_consumed=${bytes_consumed}`);
  return okWithBytes(new BinXMLOpenStartElement(data_size, name), bytes_consumed);
}
