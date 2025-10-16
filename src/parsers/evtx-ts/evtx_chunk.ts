// import { EVTX_CHUNK_SIZE } from './evtx_parser.js';
import { EvtxRecord, EvtxRecordHeaderImpl } from './evtx_record.js';
import { ParserSettings } from './parser_settings.js';
import { BinXmlDeserializer } from './binxml/deserializer.js';

// Constants from Rust
const EVTX_CHUNK_HEADER_SIZE = 512;

// TypeScript Result type

import { TemplateCache } from './template_cache.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// 1:1 translation of ChunkFlags bitflags
export class ChunkFlags {
  static readonly EMPTY = 0x0;
  static readonly DIRTY = 0x1;
  static readonly NO_CRC32 = 0x4;

  constructor(private bits: number) {}

  contains(flag: number): boolean {
    return (this.bits & flag) === flag;
  }

  static from_bits_truncate(bits: number): ChunkFlags {
    return new ChunkFlags(bits);
  }
}

// 1:1 translation of EvtxChunkHeader struct - exact same field names and order
export class EvtxChunkHeader {
  first_event_record_number: bigint; // u64 -> bigint
  last_event_record_number: bigint; // u64 -> bigint
  first_event_record_id: bigint; // u64 -> bigint
  last_event_record_id: bigint; // u64 -> bigint
  header_size: number; // u32 -> number
  last_event_record_data_offset: number; // u32 -> number
  free_space_offset: number; // u32 -> number
  events_checksum: number; // u32 -> number
  header_chunk_checksum: number; // u32 -> number
  flags: ChunkFlags;
  strings_offsets: number[]; // Vec<u32> -> number[]
  template_offsets: number[]; // Vec<u32> -> number[]

  constructor(
    first_event_record_number: bigint,
    last_event_record_number: bigint,
    first_event_record_id: bigint,
    last_event_record_id: bigint,
    header_size: number,
    last_event_record_data_offset: number,
    free_space_offset: number,
    events_checksum: number,
    header_chunk_checksum: number,
    flags: ChunkFlags,
    strings_offsets: number[],
    template_offsets: number[]
  ) {
    this.first_event_record_number = first_event_record_number;
    this.last_event_record_number = last_event_record_number;
    this.first_event_record_id = first_event_record_id;
    this.last_event_record_id = last_event_record_id;
    this.header_size = header_size;
    this.last_event_record_data_offset = last_event_record_data_offset;
    this.free_space_offset = free_space_offset;
    this.events_checksum = events_checksum;
    this.header_chunk_checksum = header_chunk_checksum;
    this.flags = flags;
    this.strings_offsets = strings_offsets;
    this.template_offsets = template_offsets;
  }

  // 1:1 translation of from_reader method
  public static from_reader(data: Buffer): Result<EvtxChunkHeader, Error> {
    try {
      if (data.length < 512) {
        return err(new Error('Chunk header too short'));
      }

      // Direct translation: magic check
      const magic = data.subarray(0, 8);
      const expected_magic = Buffer.from('ElfChnk\x00');
      if (!magic.equals(expected_magic)) {
        return err(
          new Error(
            `Invalid EVTX chunk magic: expected ${expected_magic.toString('hex')}, got ${magic.toString('hex')}`
          )
        );
      }

      let offset = 8;

      // Direct translation: read chunk header fields in exact same order as Rust
      const first_event_record_number = data.readBigUInt64LE(offset);
      offset += 8;
      const last_event_record_number = data.readBigUInt64LE(offset);
      offset += 8;
      const first_event_record_id = data.readBigUInt64LE(offset);
      offset += 8;
      const last_event_record_id = data.readBigUInt64LE(offset);
      offset += 8;

      const header_size = data.readUInt32LE(offset);
      offset += 4;
      const last_event_record_data_offset = data.readUInt32LE(offset);
      offset += 4;
      const free_space_offset = data.readUInt32LE(offset);
      offset += 4;
      const events_checksum = data.readUInt32LE(offset);
      offset += 4;

      // Skip reserved 64 bytes
      offset += 64;

      const raw_flags = data.readUInt32LE(offset);
      offset += 4;
      const flags = ChunkFlags.from_bits_truncate(raw_flags);
      const header_chunk_checksum = data.readUInt32LE(offset);
      offset += 4;

      // Read strings_offsets (64 u32 values)
      const strings_offsets: number[] = [];
      for (let i = 0; i < 64; i++) {
        strings_offsets.push(data.readUInt32LE(offset));
        offset += 4;
      }

      // Read template_offsets (32 u32 values)
      const template_offsets: number[] = [];
      for (let i = 0; i < 32; i++) {
        template_offsets.push(data.readUInt32LE(offset));
        offset += 4;
      }

      const header = new EvtxChunkHeader(
        first_event_record_number,
        last_event_record_number,
        first_event_record_id,
        last_event_record_id,
        header_size,
        last_event_record_data_offset,
        free_space_offset,
        events_checksum,
        header_chunk_checksum,
        flags,
        strings_offsets,
        template_offsets
      );

      // console.log(`DEBUG: Chunk header template_offsets: [${template_offsets.join(', ')}]`);

      return ok(header);
    } catch (e) {
      return err(
        new Error(
          `Failed to parse EVTX chunk header: ${e instanceof Error ? e.message : String(e)}`
        )
      );
    }
  }
}

// 1:1 translation of EvtxChunkData struct
export class EvtxChunkData {
  header: EvtxChunkHeader;
  data: Buffer;
  template_table: TemplateCache;

  constructor(header: EvtxChunkHeader, data: Buffer, template_table: TemplateCache) {
    this.header = header;
    this.data = data;
    this.template_table = template_table;
  }

  // 1:1 translation of new method
  public static new(data: Buffer, validate_checksum: boolean): Result<EvtxChunkData, Error> {
    const header_result = EvtxChunkHeader.from_reader(data);
    if (header_result.kind === 'err') {
      return header_result;
    }

    const header = header_result.value;

    // Populate template cache from chunk data
    // 1:1 translation: TemplateCache::populate(&chunk_data, &template_offsets, ansi_codec)
    // console.log(`DEBUG EvtxChunkData.new: Populating template cache with ${header.template_offsets.length} offset(s)`);
    const template_cache_result = TemplateCache.populate(
      data,
      header.template_offsets,
      'windows-1252' // ansi_codec - standard Windows codepage
    );

    if (template_cache_result.kind === 'err') {
      console.error(`Failed to populate template cache: ${template_cache_result.error}`);
      return template_cache_result;
    }

    const template_table = template_cache_result.value;
    // console.log(`DEBUG EvtxChunkData.new: Template cache populated with ${template_table.len()} template(s)`);

    const chunk = new EvtxChunkData(header, data, template_table);

    if (validate_checksum && !chunk.validate_checksum()) {
      return err(new Error('Invalid chunk checksum'));
    }

    return ok(chunk);
  }

  // 1:1 translation of validate_checksum method
  public validate_checksum(): boolean {
    return this.validate_data_checksum() && this.validate_header_checksum();
  }

  // Simplified checksum validation (placeholder)
  public validate_data_checksum(): boolean {
    // console.log("Validating data checksum");

    const checksum_disabled = this.header.flags.contains(ChunkFlags.NO_CRC32);

    const expected_checksum = checksum_disabled ? 0 : this.header.events_checksum;

    // For now, simplified checksum validation (would need CRC32 implementation)
    // TODO: Implement actual CRC32 checksum validation
    const computed_checksum = checksum_disabled
      ? 0
      : this.simple_checksum(
          this.data.subarray(EVTX_CHUNK_HEADER_SIZE, this.header.free_space_offset)
        );

    // console.log(`Expected checksum: ${expected_checksum}, found: ${computed_checksum}`);

    return computed_checksum === expected_checksum;
  }

  public validate_header_checksum(): boolean {
    // console.log("Validating header checksum");

    const checksum_disabled = this.header.flags.contains(ChunkFlags.NO_CRC32);

    const expected_checksum = checksum_disabled ? 0 : this.header.header_chunk_checksum;

    // For now, simplified checksum validation (would need CRC32 implementation)
    // TODO: Implement actual CRC32 checksum validation
    const header_bytes_1 = this.data.subarray(0, 120);
    const header_bytes_2 = this.data.subarray(128, 512);

    const combined_header = Buffer.concat([header_bytes_1, header_bytes_2]);
    const computed_checksum = checksum_disabled ? 0 : this.simple_checksum(combined_header);

    // console.log(`Expected header checksum: ${expected_checksum}, found: ${computed_checksum}`);

    return computed_checksum === expected_checksum;
  }

  // Simple checksum implementation as placeholder for CRC32
  private simple_checksum(data: Buffer): number {
    // This is a placeholder - real implementation should use CRC32-IEEE
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum = ((checksum + data[i]!) * 31) >>> 0; // Simple hash
    }
    return checksum;
  }

  // 1:1 translation of parse method - returns EvtxRecord array
  public parse(settings: ParserSettings): EvtxRecord[] {
    const records: EvtxRecord[] = [];
    let offset = 512; // Skip 512-byte chunk header

    // console.log(`DEBUG parse: first_event_record_id=${this.header.first_event_record_id}, last_event_record_id=${this.header.last_event_record_id}`);
    // console.log(`DEBUG parse: free_space_offset=${this.header.free_space_offset}, data.length=${this.data.length}`);

    while (offset < this.header.free_space_offset && offset < this.data.length) {
      try {
        // Parse record header
        const record_header = EvtxRecordHeaderImpl.from_reader(this.data, offset);

        // Calculate binary XML data offset and size
        const binxml_data_offset = offset + 24; // Record header is 24 bytes
        const binxml_data_size = record_header.record_data_size();

        // Parse binary XML tokens
        let tokens: any[] = [];
        if (binxml_data_size > 0 && binxml_data_offset + binxml_data_size <= this.data.length) {
          const deserializer_result = BinXmlDeserializer.read_binxml_fragment(
            this.data,
            binxml_data_offset,
            this, // chunk reference - pass actual chunk for template resolution
            binxml_data_size,
            false, // not inside substitution
            'windows-1252' // ansi codec
          );

          if (deserializer_result.kind === 'ok') {
            tokens = deserializer_result.value;
          } else {
            console.warn(
              `Failed to parse binary XML for record ${record_header.event_record_id}: ${deserializer_result.error.message}`
            );
          }
        }

        const record = new EvtxRecord(
          this, // chunk reference - pass the actual chunk
          record_header.event_record_id,
          record_header.timestamp,
          tokens,
          settings
        );

        records.push(record);

        // console.log(`DEBUG parse: Parsed record ${record_header.event_record_id}, offset=${offset}, next_offset=${offset + record_header.data_size}`);

        // Move to next record
        offset += record_header.data_size;

        // Stop at last record ID to match Rust behavior
        if (this.header.last_event_record_id === record_header.event_record_id) {
          // console.log(`DEBUG parse: Reached last record ID ${this.header.last_event_record_id}, stopping`);
          break;
        }
      } catch (error) {
        console.error(`Failed to parse record at offset ${offset}:`, error);
        break;
      }
    }

    return records;
  }
}
