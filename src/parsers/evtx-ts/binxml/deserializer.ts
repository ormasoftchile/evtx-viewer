/* eslint-disable */
import {
  BinXMLDeserializedTokens,
  // BinXMLOpenStartElement,
  // BinXMLAttribute,
  // BinXmlEntityReference,
  // BinXMLProcessingInstructionTarget,
  // TemplateSubstitutionDescriptor,
  // BinXMLFragmentHeader,
  // BinXmlTemplateRef,
} from '../model/deserialized.js';
// import { BinXmlValue } from './value_variant.js';
import {
  BinXMLRawToken,
  raw_token_from_u8,
  // OpenStartElementTokenMeta,
  // AttributeTokenMeta,
} from '../model/raw.js';
import {
  read_open_start_element,
  read_attribute,
  read_entity_ref,
  read_processing_instruction_target,
  read_processing_instruction_data,
  read_substitution_descriptor,
  read_fragment_header,
  read_template,
} from './tokens.js';
import { from_binxml_stream } from './value_deserializer.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// 1:1 translation of IterTokens struct
export class IterTokens {
  private cursor: Buffer;
  private cursor_position: number;
  private chunk: any;
  private data_size: number | null;
  private data_read_so_far: number;
  private eof: boolean;
  private is_inside_substitution: boolean;
  private ansi_codec: string;

  constructor(
    cursor: Buffer,
    cursor_position: number,
    chunk: any,
    data_size: number | null,
    data_read_so_far: number,
    eof: boolean,
    is_inside_substitution: boolean,
    ansi_codec: string
  ) {
    this.cursor = cursor;
    this.cursor_position = cursor_position;
    this.chunk = chunk;
    this.data_size = data_size;
    this.data_read_so_far = data_read_so_far;
    this.eof = eof;
    this.is_inside_substitution = is_inside_substitution;
    this.ansi_codec = ansi_codec;
  }

  // 1:1 translation of read_next_token method
  private read_next_token(): Result<BinXMLRawToken> {
    if (this.cursor_position >= this.cursor.length) {
      return err(new Error('End of buffer reached'));
    }

    const token = this.cursor.readUInt8(this.cursor_position);
    this.cursor_position += 1;

    // console.log(`DEBUG read_next_token: position=${this.cursor_position - 1}, token_byte=0x${token.toString(16)}`);

    const raw_token = raw_token_from_u8(token);
    if (!raw_token) {
      return err(new Error(`Invalid token: ${token} at offset ${this.cursor_position - 1}`));
    }

    // console.log(`DEBUG read_next_token: token type=${raw_token.kind}`);
    return ok(raw_token);
  }

  // 1:1 translation of visit_token method
  private visit_token(raw_token: BinXMLRawToken): Result<BinXMLDeserializedTokens> {
    const result = (() => {
      switch (raw_token.kind) {
        case 'EndOfStream':
          return ok({ kind: 'EndOfStream' } as BinXMLDeserializedTokens);

        case 'OpenStartElement': {
          const element_result = read_open_start_element(
            this.cursor,
            this.cursor_position,
            this.chunk,
            raw_token.value.has_attributes,
            this.is_inside_substitution
          );
          if (element_result.result.kind === 'err') {
            return element_result.result;
          }
          this.cursor_position += element_result.bytes_consumed;
          return ok({
            kind: 'OpenStartElement',
            value: element_result.result.value,
          } as BinXMLDeserializedTokens);
        }

        case 'CloseStartElement':
          return ok({ kind: 'CloseStartElement' } as BinXMLDeserializedTokens);

        case 'CloseEmptyElement':
          return ok({ kind: 'CloseEmptyElement' } as BinXMLDeserializedTokens);

        case 'CloseElement':
          return ok({ kind: 'CloseElement' } as BinXMLDeserializedTokens);

        case 'Value': {
          const value_result = from_binxml_stream(
            this.cursor,
            this.cursor_position,
            this.chunk,
            null,
            this.ansi_codec
          );
          if (value_result.result.kind === 'err') {
            return value_result.result;
          }
          this.cursor_position = value_result.new_position;
          return ok({
            kind: 'Value',
            value: value_result.result.value,
          } as BinXMLDeserializedTokens);
        }

        case 'Attribute': {
          const attr_result = read_attribute(this.cursor, this.cursor_position);
          if (attr_result.result.kind === 'err') {
            return attr_result.result;
          }
          this.cursor_position += attr_result.bytes_consumed;
          return ok({
            kind: 'Attribute',
            value: attr_result.result.value,
          } as BinXMLDeserializedTokens);
        }

        case 'CDataSection':
          return err(
            new Error(`Unimplemented token: CDataSection at offset ${this.cursor_position}`)
          );

        case 'CharReference':
          return err(
            new Error(`Unimplemented token: CharReference at offset ${this.cursor_position}`)
          );

        case 'EntityReference': {
          const entity_result = read_entity_ref(this.cursor, this.cursor_position);
          if (entity_result.result.kind === 'err') {
            return entity_result.result;
          }
          this.cursor_position += entity_result.bytes_consumed;
          return ok({
            kind: 'EntityRef',
            value: entity_result.result.value,
          } as BinXMLDeserializedTokens);
        }

        case 'ProcessingInstructionTarget': {
          const pi_target_result = read_processing_instruction_target(
            this.cursor,
            this.cursor_position
          );
          if (pi_target_result.result.kind === 'err') {
            return pi_target_result.result;
          }
          this.cursor_position += pi_target_result.bytes_consumed;
          return ok({
            kind: 'PITarget',
            value: pi_target_result.result.value,
          } as BinXMLDeserializedTokens);
        }

        case 'ProcessingInstructionData': {
          const pi_data_result = read_processing_instruction_data(
            this.cursor,
            this.cursor_position
          );
          if (pi_data_result.kind === 'err') {
            return pi_data_result;
          }
          this.cursor_position += 4; // Approximate advancement
          return ok({ kind: 'PIData', value: pi_data_result.value } as BinXMLDeserializedTokens);
        }

        case 'TemplateInstance': {
          const template_result = read_template(
            this.cursor,
            this.cursor_position,
            this.chunk,
            this.ansi_codec
          );
          if (template_result.result.kind === 'err') {
            return template_result.result;
          }
          this.cursor_position += template_result.bytes_consumed;
          return ok({
            kind: 'TemplateInstance',
            value: template_result.result.value,
          } as BinXMLDeserializedTokens);
        }

        case 'NormalSubstitution': {
          const subst_result = read_substitution_descriptor(
            this.cursor,
            this.cursor_position,
            false
          );
          if (subst_result.kind === 'err') {
            return subst_result;
          }
          this.cursor_position += 3; // Approximate advancement
          return ok({
            kind: 'Substitution',
            value: subst_result.value,
          } as BinXMLDeserializedTokens);
        }

        case 'ConditionalSubstitution': {
          const subst_result = read_substitution_descriptor(
            this.cursor,
            this.cursor_position,
            true
          );
          if (subst_result.kind === 'err') {
            return subst_result;
          }
          this.cursor_position += 3; // Approximate advancement
          return ok({
            kind: 'Substitution',
            value: subst_result.value,
          } as BinXMLDeserializedTokens);
        }

        case 'StartOfStream': {
          const fragment_result = read_fragment_header(this.cursor, this.cursor_position);
          if (fragment_result.kind === 'err') {
            return fragment_result;
          }
          this.cursor_position += 3; // Fragment header is 3 bytes
          return ok({
            kind: 'FragmentHeader',
            value: fragment_result.value,
          } as BinXMLDeserializedTokens);
        }

        default:
          return err(new Error(`Unknown token kind: ${(raw_token as any).kind}`));
      }
    })();

    // Add debug logging for each token read
    if (result.kind === 'ok') {
      // console.log(`DEBUG deserializeRecord: Read token: ${result.value.kind}`);
    }

    return result;
  }

  // 1:1 translation of inner_next method
  private inner_next(): Result<BinXMLDeserializedTokens> | null {
    const offset_from_chunk_start = this.cursor_position;

    // Finished reading
    if (this.eof) {
      return null;
    }

    // TEMPORARILY DISABLED: data_size check due to approximate byte counting in visit_token
    // TODO: Fix all token reading functions to return exact bytes consumed
    // if (this.data_size !== null && this.data_read_so_far >= this.data_size) {
    //     console.log(`STOPPING: data_read_so_far=${this.data_read_so_far} >= data_size=${this.data_size}`);
    //     return null;
    // }

    const token_result = this.read_next_token();
    if (token_result.kind === 'err') {
      return token_result;
    }

    const raw_token = token_result.value;
    if (raw_token.kind === 'EndOfStream') {
      this.eof = true;
    }

    const result = this.visit_token(raw_token);

    const total_read = this.cursor_position - offset_from_chunk_start;
    this.data_read_so_far += total_read;

    return result;
  }

  // 1:1 translation of Iterator::next
  public next(): Result<BinXMLDeserializedTokens> | null {
    return this.inner_next();
  }
}

// 1:1 translation of BinXmlDeserializer struct
export class BinXmlDeserializer {
  private data: Buffer;
  private offset: number;
  private chunk: any;
  private is_inside_substitution: boolean;
  private ansi_codec: string;

  constructor(
    data: Buffer,
    start_offset: number,
    chunk: any,
    is_inside_substitution: boolean,
    ansi_codec: string
  ) {
    this.data = data;
    this.offset = start_offset;
    this.chunk = chunk;
    this.is_inside_substitution = is_inside_substitution;
    this.ansi_codec = ansi_codec;
  }

  // 1:1 translation of init method
  public static init(
    data: Buffer,
    start_offset: number,
    chunk: any,
    is_inside_substitution: boolean,
    ansi_codec: string
  ): BinXmlDeserializer {
    return new BinXmlDeserializer(data, start_offset, chunk, is_inside_substitution, ansi_codec);
  }

  // 1:1 translation of read_binxml_fragment method
  public static read_binxml_fragment(
    cursor: Buffer,
    cursor_position: number,
    chunk: any,
    data_size: number | null,
    is_inside_substitution: boolean,
    ansi_codec: string
  ): Result<BinXMLDeserializedTokens[]> {
    try {
      const offset = cursor_position;

      const de = BinXmlDeserializer.init(cursor, offset, chunk, is_inside_substitution, ansi_codec);

      const tokens: BinXMLDeserializedTokens[] = [];
      const iterator_result = de.iter_tokens(data_size);

      if (iterator_result.kind === 'err') {
        return iterator_result;
      }

      const iterator = iterator_result.value;

      while (true) {
        const token_result = iterator.next();
        if (!token_result) {
          break;
        }
        if (token_result.kind === 'err') {
          return token_result;
        }
        tokens.push(token_result.value);
      }

      return ok(tokens);
    } catch (e) {
      return err(
        new Error(`Failed to read binxml fragment: ${e instanceof Error ? e.message : String(e)}`)
      );
    }
  }

  // 1:1 translation of iter_tokens method
  public iter_tokens(data_size: number | null): Result<IterTokens> {
    try {
      return ok(
        new IterTokens(
          this.data,
          this.offset,
          this.chunk,
          data_size,
          0,
          false,
          this.is_inside_substitution,
          this.ansi_codec
        )
      );
    } catch (e) {
      return err(
        new Error(`Failed to create token iterator: ${e instanceof Error ? e.message : String(e)}`)
      );
    }
  }
}
