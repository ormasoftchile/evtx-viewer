// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.

/* eslint-disable */
import * as fs from 'fs';
import { ParserSettings } from './parser_settings.js';
import { EvtxFileHeader } from './evtx_file_header.js';
import { EvtxChunkData } from './evtx_chunk.js';
// import { EvtxRecord } from './evtx_record.js';

// Constants from Rust
export const EVTX_CHUNK_SIZE = 65536;
export const EVTX_FILE_HEADER_SIZE = 4096;

// 1:1 translation of SerializedEvtxRecord<T>
export class SerializedEvtxRecord<T> {
  event_record_id: number; // RecordId = u64 -> number
  timestamp: Date; // DateTime<Utc> -> Date
  data: T;

  constructor(event_record_id: number, timestamp: Date, data: T) {
    this.event_record_id = event_record_id;
    this.timestamp = timestamp;
    this.data = data;
  }
}

// TypeScript Result type for EVTX operations
type EvtxResult<T> = { kind: 'ok'; value: T } | { kind: 'err'; error: Error };

function ok<T>(value: T): EvtxResult<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): EvtxResult<never> {
  return { kind: 'err', error };
}

// 1:1 translation of EvtxParser struct
export class EvtxParser {
  private data: Buffer;
  private header: EvtxFileHeader;
  private config: ParserSettings;
  private calculated_chunk_count: number;

  constructor(
    data: Buffer,
    header: EvtxFileHeader,
    config: ParserSettings,
    calculated_chunk_count: number
  ) {
    this.data = data;
    this.header = header;
    this.config = config;
    this.calculated_chunk_count = calculated_chunk_count;
  }

  // 1:1 translation of from_path method
  public static from_path(path: string): EvtxResult<EvtxParser> {
    try {
      // Check if file exists
      if (!fs.existsSync(path)) {
        return err(new Error(`File not found: ${path}`));
      }

      // Read file data
      const file_data = fs.readFileSync(path);

      // Parse header from first 4096 bytes
      const header_data = file_data.subarray(0, Math.min(EVTX_FILE_HEADER_SIZE, file_data.length));
      const header_result = EvtxFileHeader.from_stream(header_data);

      if (header_result.kind === 'err') {
        return err(new Error(`Failed to parse EVTX header: ${header_result.error.message}`));
      }

      const evtx_header = header_result.value;

      // Direct translation: calculate chunk count like Rust
      const stream_size = file_data.length;
      const chunk_data_size = stream_size - evtx_header.header_block_size;

      if (chunk_data_size < 0) {
        return err(
          new Error(
            `Could not calculate valid chunk count because stream size is less than evtx header block size. (stream_size: ${stream_size}, header_block_size: ${evtx_header.header_block_size})`
          )
        );
      }

      const chunk_count = Math.floor(chunk_data_size / EVTX_CHUNK_SIZE);

      return ok(new EvtxParser(file_data, evtx_header, ParserSettings.default(), chunk_count));
    } catch (e) {
      return err(
        new Error(`Failed to open evtx file: ${e instanceof Error ? e.message : String(e)}`)
      );
    }
  }

  // 1:1 translation of with_configuration method
  public with_configuration(configuration: ParserSettings): EvtxParser {
    return new EvtxParser(
      this.data,
      this.header,
      configuration.clone(),
      this.calculated_chunk_count
    );
  }

  // Added for VS Code extension Buffer compatibility
  public static from_buffer(buffer: Buffer): EvtxResult<EvtxParser> {
    try {
      // Parse header from first 4096 bytes
      const header_data = buffer.subarray(0, Math.min(EVTX_FILE_HEADER_SIZE, buffer.length));
      const header_result = EvtxFileHeader.from_stream(header_data);

      if (header_result.kind === 'err') {
        return err(new Error(`Failed to parse EVTX header: ${header_result.error.message}`));
      }

      const evtx_header = header_result.value;

      // Direct translation: calculate chunk count like Rust
      const stream_size = buffer.length;
      const chunk_data_size = stream_size - evtx_header.header_block_size;

      if (chunk_data_size < 0) {
        return err(
          new Error(
            `Could not calculate valid chunk count because stream size is less than evtx header block size. (stream_size: ${stream_size}, header_block_size: ${evtx_header.header_block_size})`
          )
        );
      }

      const chunk_count = Math.floor(chunk_data_size / EVTX_CHUNK_SIZE);

      return ok(new EvtxParser(buffer, evtx_header, ParserSettings.default(), chunk_count));
    } catch (e) {
      return err(
        new Error(`Failed to parse evtx buffer: ${e instanceof Error ? e.message : String(e)}`)
      );
    }
  }

  // 1:1 translation of records method - returns iterator over XML records
  public *records(): Generator<EvtxResult<SerializedEvtxRecord<string>>, void, unknown> {
    // Iterate through chunks and parse records
    for (let chunk_number = 0; chunk_number < this.calculated_chunk_count; chunk_number++) {
      const chunk_result = this.allocate_chunk(
        chunk_number,
        this.config.should_validate_checksums()
      );

      if (chunk_result.kind === 'err') {
        yield chunk_result;
        continue;
      }

      if (!chunk_result.value) {
        continue; // Empty chunk
      }

      // Parse records from chunk
      const chunk_records = chunk_result.value.parse(this.config);

      // Yield each record
      for (const record of chunk_records) {
        try {
          // Convert EvtxRecord to XML
          const xml_result = record.into_xml();
          const serialized_record = new SerializedEvtxRecord(
            Number(xml_result.event_record_id),
            new Date(Number(record.timestamp) / 10000 - 11644473600000), // Convert Windows timestamp
            xml_result.data
          );
          yield ok(serialized_record);
        } catch (error) {
          yield err(new Error(`Failed to serialize record: ${error}`));
        }
      }
    }
  }

  // 1:1 translation of records_json method - returns iterator over JSON records
  public *records_json(): Generator<EvtxResult<SerializedEvtxRecord<string>>, void, unknown> {
    yield* this.serialized_records((record) => {
      if (record.kind === 'err') {
        return record;
      }

      // data is already a JSON string from into_json()
      // If we need to re-format with proper indentation, parse and re-stringify
      const indent_spaces = this.config.should_indent() ? 2 : undefined;
      let json_data: string;

      try {
        // Parse the JSON string and re-stringify with correct indentation
        const parsed = JSON.parse(record.value.data);
        json_data = JSON.stringify(parsed, null, indent_spaces);
      } catch (e) {
        // If parsing fails, use the original data
        json_data = record.value.data;
      }

      return ok(
        new SerializedEvtxRecord(record.value.event_record_id, record.value.timestamp, json_data)
      );
    });
  }

  // Helper method implementing serialized_records pattern from Rust
  private *serialized_records<U>(
    transform_fn: (record: EvtxResult<SerializedEvtxRecord<any>>) => EvtxResult<U>
  ): Generator<EvtxResult<U>, void, unknown> {
    // Iterate through chunks and parse records
    for (let chunk_number = 0; chunk_number < this.calculated_chunk_count; chunk_number++) {
      const chunk_result = this.allocate_chunk(
        chunk_number,
        this.config.should_validate_checksums()
      );

      if (chunk_result.kind === 'err') {
        yield transform_fn(chunk_result);
        continue;
      }

      if (!chunk_result.value) {
        continue; // Empty chunk
      }

      // Parse records from chunk
      const chunk_records = chunk_result.value.parse(this.config);

      // Yield each record through the transform function
      for (const record of chunk_records) {
        try {
          // Convert EvtxRecord to SerializedEvtxRecord
          const json_result = record.into_json();
          const serialized_record = new SerializedEvtxRecord(
            Number(json_result.event_record_id),
            new Date(Number(record.timestamp) / 10000 - 11644473600000), // Convert Windows timestamp
            json_result.data
          );
          yield transform_fn(ok(serialized_record));
        } catch (error) {
          yield transform_fn(err(new Error(`Failed to serialize record: ${error}`)));
        }
      }
    }
  }

  // 1:1 translation of records_json_value method - returns iterator over any records
  public *records_json_value(): Generator<EvtxResult<SerializedEvtxRecord<any>>, void, unknown> {
    // Iterate through chunks
    for (let chunk_number = 0; chunk_number < this.calculated_chunk_count; chunk_number++) {
      const chunk_result = this.allocate_chunk(
        chunk_number,
        this.config.should_validate_checksums()
      );

      if (chunk_result.kind === 'err') {
        yield chunk_result;
        continue;
      }

      if (!chunk_result.value) {
        continue; // Empty chunk
      }

      // Parse records from chunk
      try {
        const records = chunk_result.value.parse(this.config);

        for (const record of records) {
          try {
            const serialized = record.into_json_value();
            yield ok(
              new SerializedEvtxRecord(
                Number(serialized.event_record_id),
                new Date(Number(record.timestamp) / 10000 - 11644473600000), // Convert Windows timestamp
                serialized.data
              )
            );
          } catch (error) {
            yield err(new Error(`Failed to serialize record: ${error}`));
          }
        }
      } catch (error) {
        // Fall back to placeholder if parsing fails
        yield ok(
          new SerializedEvtxRecord(
            Number(chunk_result.value.header.first_event_record_id),
            new Date(),
            {
              Event: {
                chunk: chunk_number,
                records: `${chunk_result.value.header.first_event_record_number} to ${chunk_result.value.header.last_event_record_number}`,
                first_id: Number(chunk_result.value.header.first_event_record_id),
                last_id: Number(chunk_result.value.header.last_event_record_id),
                parse_error: String(error),
              },
            }
          )
        );
      }
    }
  }

  // 1:1 translation of allocate_chunk method
  private allocate_chunk(
    chunk_number: number,
    validate_checksum: boolean
  ): EvtxResult<EvtxChunkData | null> {
    try {
      const chunk_offset = EVTX_FILE_HEADER_SIZE + chunk_number * EVTX_CHUNK_SIZE;

      if (chunk_offset >= this.data.length) {
        return ok(null); // No more chunks
      }

      const chunk_end = Math.min(chunk_offset + EVTX_CHUNK_SIZE, this.data.length);
      const chunk_data = this.data.subarray(chunk_offset, chunk_end);

      if (chunk_data.length < EVTX_CHUNK_SIZE) {
        // Incomplete chunk at end of file
        return ok(null);
      }

      return EvtxChunkData.new(chunk_data, validate_checksum);
    } catch (e) {
      return err(
        new Error(
          `Failed to allocate chunk ${chunk_number}: ${e instanceof Error ? e.message : String(e)}`
        )
      );
    }
  }
}
