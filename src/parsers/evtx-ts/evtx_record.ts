// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.

/* eslint-disable */
import { ParserSettings } from './parser_settings';
import { BinXmlDeserializer } from './binxml/deserializer.js';
import { BinXMLDeserializedTokens } from './model/deserialized.js';
import { expand_templates, create_record_model } from './binxml/assemble.js';
import { xml_models_to_string } from './xml_output.js';

export interface EvtxRecordHeader {
  event_record_id: bigint;
  timestamp: bigint;
  data_size: number;
  record_data_size(): number;
}

export class EvtxRecord {
  public chunk: any; // Will be EvtxChunk when implemented
  public event_record_id: bigint;
  public timestamp: bigint;
  public tokens: BinXMLDeserializedTokens[]; // Updated to use proper token types
  public settings: ParserSettings;

  constructor(
    chunk: any,
    event_record_id: bigint,
    timestamp: bigint,
    tokens: BinXMLDeserializedTokens[],
    settings: ParserSettings
  ) {
    this.chunk = chunk;
    this.event_record_id = event_record_id;
    this.timestamp = timestamp;
    this.tokens = tokens;
    this.settings = settings;
  }

  // Placeholder implementations - will be replaced with actual XML/JSON serialization
  into_xml(): { event_record_id: bigint; data: string } {
    // Expand templates to resolve template instances
    const expanded_result = expand_templates(this.tokens, this.chunk);
    if (expanded_result.kind === 'err') {
      return {
        event_record_id: this.event_record_id,
        data: `<Event><Error>Failed to expand templates: ${expanded_result.error.message}</Error></Event>`,
      };
    }

    // Create XML model from tokens
    const model_result = create_record_model(expanded_result.value, this.chunk);
    if (model_result.kind === 'err') {
      return {
        event_record_id: this.event_record_id,
        data: `<Event><Error>Failed to create model: ${model_result.error.message}</Error></Event>`,
      };
    }

    // Convert model to XML string
    const xml_result = xml_models_to_string(model_result.value, this.settings);
    if (xml_result.kind === 'err') {
      return {
        event_record_id: this.event_record_id,
        data: `<Event><Error>Failed to serialize XML: ${xml_result.error.message}</Error></Event>`,
      };
    }

    return {
      event_record_id: this.event_record_id,
      data: xml_result.value,
    };
  }

  into_json(): { event_record_id: bigint; data: string } {
    const json_value = this.into_json_value();
    return {
      event_record_id: this.event_record_id,
      data: JSON.stringify(json_value.data),
    };
  }

  into_json_value(): { event_record_id: bigint; data: any } {
    // Basic Event structure extraction from tokens
    // TODO: Implement full token-to-JSON conversion
    const event_data = this.parse_tokens_to_event();

    return {
      event_record_id: this.event_record_id,
      data: event_data,
    };
  }

  // Parse binary XML tokens into Event structure
  private parse_tokens_to_event(): any {
    // console.log(`DEBUG parse_tokens_to_event: Processing ${this.tokens.length} tokens`);

    // DEBUG: Show initial tokens before expansion
    for (let i = 0; i < Math.min(this.tokens.length, 10); i++) {
      // console.log(`DEBUG Initial token ${i}: ${this.tokens[i].kind}`);
    }

    // First expand templates to resolve template instances
    const expanded_result = expand_templates(this.tokens, this.chunk);
    if (expanded_result.kind === 'err') {
      console.error(`Failed to expand templates: ${expanded_result.error}`);
      return { Event: { debug_tokens: this.tokens.slice(0, 10) } };
    }

    const expanded_tokens = expanded_result.value;
    // console.log(`DEBUG parse_tokens_to_event: Expanded to ${expanded_tokens.length} tokens`);

    // DEBUG: Show what tokens we have
    for (let i = 0; i < Math.min(expanded_tokens.length, 10); i++) {
      const token = expanded_tokens[i]!;
      let tokenKind = '';
      if ('value' in token) {
        tokenKind = token.value.kind;
      } else {
        tokenKind = 'unknown';
      }
      // console.log(`DEBUG Expanded token ${i}: ${token.kind}(${tokenKind})`);
    }

    // Create record model with proper name resolution
    const model_result = create_record_model(expanded_tokens, this.chunk);
    if (model_result.kind === 'err') {
      console.error(`Failed to create record model: ${model_result.error}`);
      return { Event: { debug_tokens: expanded_tokens.slice(0, 10) } };
    }

    const model = model_result.value;
    // console.log(`DEBUG: Created model with ${model.length} elements`);

    // DEBUG: Show what model items we have
    for (let i = 0; i < Math.min(model.length, 10); i++) {
      // console.log(`DEBUG Model item ${i}: ${model[i].kind}`);
    }

    // Convert model to Event structure
    return this.convert_model_to_event(model);
  }

  private convert_model_to_event(model: any[]): any {
    const result: any = {};
    let current = result;
    const stack: any[] = [];
    const element_stack: string[] = []; // Track element names

    for (const item of model) {
      switch (item.kind) {
        case 'OpenElement':
          // item.value is XmlElement which has name and attributes
          const element = item.value;
          // element.name is Cow<BinXmlName>, need to unwrap it
          const element_name_obj =
            element.name.kind === 'owned' ? element.name.value : element.name.value;
          const element_name = element_name_obj.str;
          // console.log(`DEBUG: Opening element: ${element_name}`);

          const new_element: any = {};

          // Process attributes
          if (element.attributes && element.attributes.length > 0) {
            const attrs_obj: any = {};
            let has_non_null_attrs = false;

            for (const attr of element.attributes) {
              const attr_name_obj = attr.name.kind === 'owned' ? attr.name.value : attr.name.value;
              const attr_name = attr_name_obj.str;

              const attr_value_obj =
                attr.value.kind === 'owned' ? attr.value.value : attr.value.value;

              // Skip null-valued attributes (Rust behavior)
              if (attr_value_obj.kind === 'NullType') {
                continue;
              }

              let attr_value: any = '';
              if (attr_value_obj.kind === 'StringType') {
                // Trim strings to match Rust behavior
                attr_value = attr_value_obj.value.trim();
              } else if (
                attr_value_obj.kind === 'SysTimeType' ||
                attr_value_obj.kind === 'FileTimeType'
              ) {
                // Format timestamp with microseconds (000) to match Rust
                const date = attr_value_obj.value;
                const iso = date.toISOString();
                // Convert from .346Z to .346000Z (add microsecond padding)
                attr_value = iso.replace(/\.(\d{3})Z$/, '.$1000Z');
              } else if (attr_value_obj.kind === 'GuidType') {
                // Convert GUID to uppercase to match Rust
                attr_value = String(attr_value_obj.value).toUpperCase();
              } else if (
                attr_value_obj.kind === 'UInt32Type' ||
                attr_value_obj.kind === 'Int32Type' ||
                attr_value_obj.kind === 'UInt16Type' ||
                attr_value_obj.kind === 'Int16Type' ||
                attr_value_obj.kind === 'UInt8Type' ||
                attr_value_obj.kind === 'Int8Type'
              ) {
                // Keep as number for 32-bit and smaller numeric types
                attr_value = attr_value_obj.value;
              } else if (
                attr_value_obj.kind === 'UInt64Type' ||
                attr_value_obj.kind === 'Int64Type'
              ) {
                // Convert BigInt to Number for JSON compatibility
                attr_value = Number(attr_value_obj.value);
              } else if ('value' in attr_value_obj) {
                attr_value = attr_value_obj.value;
              } else {
                attr_value = attr_value_obj.kind;
              }

              attrs_obj[attr_name] = attr_value;
              has_non_null_attrs = true;
            }

            // Only add #attributes if we have non-null attributes
            if (has_non_null_attrs) {
              new_element['#attributes'] = attrs_obj;
            }
          }

          current[element_name] = new_element;
          stack.push(current);
          element_stack.push(element_name);
          current = new_element;
          break;

        case 'CloseElement':
          if (stack.length > 0) {
            const closing_element_name = element_stack.pop();
            const parent = stack.pop();

            // Check if element is completely empty (no attributes, no children, no text)
            const is_empty = Object.keys(current).length === 0;

            // CRITICAL FIX: If element only has #text and no attributes, replace with bare value
            if (
              current['#text'] !== undefined &&
              !current['#attributes'] &&
              Object.keys(current).length === 1
            ) {
              // Element has ONLY a text value, no attributes or children
              // Replace the object with the bare value
              if (closing_element_name) {
                parent[closing_element_name] = current['#text'];
              }
            }
            // SPECIAL CASE: Element named "Data" with Name attribute
            // Rust converts <Data Name="X">value</Data> to {X: value}
            else if (
              closing_element_name === 'Data' &&
              current['#attributes'] &&
              current['#attributes']['Name']
            ) {
              const data_name = current['#attributes']['Name'];
              // Use the actual typed value if available, otherwise use #text
              const data_value = current['#text'] !== undefined ? current['#text'] : current;
              parent[data_name] = data_value;
              // Remove the "Data" entry that was added
              delete parent['Data'];
            }
            // RUST BEHAVIOR: Empty elements (no content at all) should be null
            else if (is_empty && closing_element_name) {
              parent[closing_element_name] = null;
            }

            current = parent;
          }
          break;

        case 'Value':
          // item.value is Cow<BinXmlValue>
          const value_cow = item.value;
          const value_obj = value_cow.kind === 'owned' ? value_cow.value : value_cow.value;

          let actual_value: any = '';
          if (value_obj.kind === 'StringType') {
            // Trim strings to match Rust behavior
            actual_value = value_obj.value.trim();
          } else if (value_obj.kind === 'SysTimeType' || value_obj.kind === 'FileTimeType') {
            // Format timestamp with microseconds (000) to match Rust
            const date = value_obj.value;
            const iso = date.toISOString();
            // Convert from .346Z to .346000Z (add microsecond padding)
            actual_value = iso.replace(/\.(\d{3})Z$/, '.$1000Z');
          } else if (
            value_obj.kind === 'UInt32Type' ||
            value_obj.kind === 'Int32Type' ||
            value_obj.kind === 'UInt16Type' ||
            value_obj.kind === 'Int16Type' ||
            value_obj.kind === 'UInt8Type' ||
            value_obj.kind === 'Int8Type'
          ) {
            // Keep as number for 32-bit and smaller numeric types
            actual_value = value_obj.value;
          } else if (value_obj.kind === 'UInt64Type' || value_obj.kind === 'Int64Type') {
            // Convert BigInt to Number for JSON compatibility
            actual_value = Number(value_obj.value);
          } else if ('value' in value_obj) {
            actual_value = value_obj.value;
          } else {
            actual_value = value_obj.kind;
          }

          // If current already has text, append (handle multiple values)
          if (current['#text']) {
            current['#text'] += String(actual_value);
          } else {
            current['#text'] = actual_value;
          }
          break;

        default:
          // console.log(`DEBUG: Unhandled model item: ${item.kind}`);
          break;
      }
    }

    return result;
  }

  // Convert expanded tokens to JSON structure - proper implementation based on Rust parse_tokens
  private convert_tokens_to_json(tokens: BinXMLDeserializedTokens[]): any {
    // console.log(`DEBUG: Converting ${tokens.length} tokens to JSON`);

    // Build XML-like structure from tokens (similar to Rust's create_record_model)
    const result: any = {};
    const stack: any[] = [];
    let current: any = result;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]!;
      // console.log(`DEBUG: Processing token ${i}: ${token.kind}`);

      switch (token.kind) {
        case 'FragmentHeader':
          // Skip fragment headers - they're metadata
          break;

        case 'OpenStartElement':
          // Create new element
          const element_name = this.resolve_name_ref(token.value.name);
          // console.log(`DEBUG: Opening element: ${element_name}`);

          const new_element: any = {};
          if (!result.Event) {
            result.Event = new_element;
            current = new_element;
          } else {
            current[element_name] = new_element;
            stack.push(current);
            current = new_element;
          }
          break;

        case 'CloseStartElement':
          // Element is ready for content
          break;

        case 'CloseElement':
          // Pop back to parent element
          if (stack.length > 0) {
            current = stack.pop();
          }
          break;

        case 'Value':
          // Add value to current element
          if (token.value.kind === 'StringType') {
            current['#text'] = token.value.value;
          } else if (token.value.kind === 'UInt16Type' || token.value.kind === 'UInt32Type') {
            current['#text'] = token.value.value.toString();
          } else if ('value' in token.value) {
            current['#text'] = String(token.value.value);
          } else {
            current['#text'] = token.value.kind;
          }
          // console.log(`DEBUG: Added value: ${current['#text']}`);
          break;

        case 'Attribute':
          // Add attribute to current element
          const attr_name = this.resolve_name_ref(token.value.name);
          if (!current['#attributes']) {
            current['#attributes'] = {};
          }
          // Attribute value would be in next Value token
          // console.log(`DEBUG: Found attribute: ${attr_name}`);
          break;

        case 'EndOfStream':
          // End of token stream
          break;

        default:
          // console.log(`DEBUG: Unhandled token type: ${token.kind}`);
          break;
      }
    }

    // If we didn't build a proper Event structure, return the expanded data
    if (!result.Event) {
      // console.log(`DEBUG: No Event structure found, returning basic structure`);
      return {
        Event: {
          '@xmlns': 'http://schemas.microsoft.com/win/2004/08/events/event',
          debug_tokens: tokens.map((t) => ({ kind: t.kind })),
        },
      };
    }

    // Add xmlns attribute to Event
    if (!result.Event['#attributes']) {
      result.Event['#attributes'] = {};
    }
    result.Event['#attributes']['xmlns'] = 'http://schemas.microsoft.com/win/2004/08/events/event';

    return result;
  }

  // Helper to resolve name references from chunk's string table
  private resolve_name_ref(name_ref: any): string {
    // This should resolve name references from the chunk's string table
    // name_ref.offset points to a location in the chunk data where the string is stored
    if (!this.chunk || !this.chunk.data || !name_ref || typeof name_ref.offset !== 'number') {
      return `element_${name_ref?.offset || 0}`;
    }

    try {
      const offset = name_ref.offset;
      // console.log(`DEBUG: Resolving name at offset ${offset}`);

      // Read the string from the chunk data at the specified offset
      // Format: next_string(u32) + hash(u16) + length(u16) + utf16_string + null_terminator(u32)
      let pos = offset;

      // Skip next_string (u32) and hash (u16)
      pos += 6;

      // Read string length (u16)
      const length = this.chunk.data.readUInt16LE(pos);
      pos += 2;

      // Read UTF-16 string
      const string_bytes = this.chunk.data.subarray(pos, pos + length * 2);
      const name = string_bytes.toString('utf16le');

      // console.log(`DEBUG: Resolved name "${name}" at offset ${offset}`);
      return name;
    } catch (error) {
      // console.log(`DEBUG: Failed to resolve name at offset ${name_ref.offset}: ${error}`);
      return `element_${name_ref.offset}`;
    }
  }
}

export class EvtxRecordHeaderImpl implements EvtxRecordHeader {
  public event_record_id: bigint;
  public timestamp: bigint;
  public data_size: number;

  constructor(event_record_id: bigint, timestamp: bigint, data_size: number) {
    this.event_record_id = event_record_id;
    this.timestamp = timestamp;
    this.data_size = data_size;
  }

  record_data_size(): number {
    // Header is 24 bytes, so record data size is total size minus header
    return this.data_size - 24;
  }

  static from_reader(reader: Buffer, offset: number): EvtxRecordHeaderImpl {
    // Parse EVTX record header from binary data
    // Record header format (little-endian):
    // 0x00: magic (4 bytes) - should be "*\x00\x00"
    // 0x04: data_size (4 bytes)
    // 0x08: event_record_id (8 bytes)
    // 0x10: timestamp (8 bytes)
    // 0x18: unknown field (4 bytes)

    const magic = reader.subarray(offset, offset + 4);
    if (!magic.equals(Buffer.from([0x2a, 0x2a, 0x00, 0x00]))) {
      throw new Error(`Invalid record magic: ${magic.toString('hex')}`);
    }

    const data_size = reader.readUInt32LE(offset + 4);
    const event_record_id = reader.readBigUInt64LE(offset + 8);
    const timestamp = reader.readBigUInt64LE(offset + 16);

    return new EvtxRecordHeaderImpl(event_record_id, timestamp, data_size);
  }
}
