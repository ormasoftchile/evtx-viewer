// import * as fs from 'fs';

// TypeScript equivalent of Rust Result type
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// 1:1 translation of HeaderFlags bitflags
export class HeaderFlags {
  static readonly EMPTY = 0x0;
  static readonly DIRTY = 0x1;
  static readonly FULL = 0x2;
  static readonly NO_CRC32 = 0x4;

  constructor(private bits: number) {}

  contains(flag: number): boolean {
    return (this.bits & flag) === flag;
  }

  bits_value(): number {
    return this.bits;
  }

  static from_bits_truncate(bits: number): HeaderFlags {
    return new HeaderFlags(bits);
  }
}

// 1:1 translation of EvtxFileHeader struct - exact same field names and order
export class EvtxFileHeader {
  first_chunk_number: number; // u64 -> number (BigInt if needed)
  last_chunk_number: number; // u64 -> number
  next_record_id: number; // u64 -> number
  header_size: number; // u32 -> number
  minor_version: number; // u16 -> number
  major_version: number; // u16 -> number
  header_block_size: number; // u16 -> number
  chunk_count: number; // u16 -> number
  flags: HeaderFlags;
  checksum: number; // u32 -> number

  constructor(
    first_chunk_number: number,
    last_chunk_number: number,
    next_record_id: number,
    header_size: number,
    minor_version: number,
    major_version: number,
    header_block_size: number,
    chunk_count: number,
    flags: HeaderFlags,
    checksum: number
  ) {
    this.first_chunk_number = first_chunk_number;
    this.last_chunk_number = last_chunk_number;
    this.next_record_id = next_record_id;
    this.header_size = header_size;
    this.minor_version = minor_version;
    this.major_version = major_version;
    this.header_block_size = header_block_size;
    this.chunk_count = chunk_count;
    this.flags = flags;
    this.checksum = checksum;
  }

  // 1:1 translation of from_stream method
  public static from_stream(data: Buffer): Result<EvtxFileHeader, Error> {
    try {
      if (data.length < 128) {
        return err(new Error('File header too short'));
      }

      // Direct translation: magic check
      const magic = data.subarray(0, 8);
      const expected_magic = Buffer.from('ElfFile\x00');
      if (!magic.equals(expected_magic)) {
        return err(
          new Error(
            `Invalid EVTX file header magic: expected ${expected_magic.toString('hex')}, got ${magic.toString('hex')}`
          )
        );
      }

      let offset = 8;

      // Direct translation: read header fields in exact same order as Rust
      const oldest_chunk = data.readBigUInt64LE(offset);
      offset += 8;
      const current_chunk_num = data.readBigUInt64LE(offset);
      offset += 8;
      const next_record_num = data.readBigUInt64LE(offset);
      offset += 8;
      const header_size = data.readUInt32LE(offset);
      offset += 4;
      const minor_version = data.readUInt16LE(offset);
      offset += 2;
      const major_version = data.readUInt16LE(offset);
      offset += 2;
      const header_block_size = data.readUInt16LE(offset);
      offset += 2;
      const chunk_count = data.readUInt16LE(offset);
      offset += 2;

      // Skip unused 76 bytes
      offset += 76;

      const raw_flags = data.readUInt32LE(offset);
      offset += 4;
      const flags = HeaderFlags.from_bits_truncate(raw_flags);
      const checksum = data.readUInt32LE(offset);

      return ok(
        new EvtxFileHeader(
          Number(oldest_chunk),
          Number(current_chunk_num),
          Number(next_record_num),
          header_size,
          minor_version,
          major_version,
          header_block_size,
          chunk_count,
          flags,
          checksum
        )
      );
    } catch (e) {
      return err(
        new Error(`Failed to parse EVTX file header: ${e instanceof Error ? e.message : String(e)}`)
      );
    }
  }

  // 1:1 translation of log_for_comparison method
  public log_for_comparison(): void {
    if (process.env.EVTX_COMPARE_LOG === '1') {
      console.error(
        `[COMPARE][FILE_HEADER_PARSED] {"signature":"ElfFile\\\\0","firstChunkNumber":"${this.first_chunk_number}","lastChunkNumber":"${this.last_chunk_number}","nextRecordId":"${this.next_record_id}","headerSize":${this.header_size},"minorVersion":${this.minor_version},"majorVersion":${this.major_version},"headerBlockSize":${this.header_block_size},"chunkCount":${this.chunk_count},"flags":${this.flags.bits_value()},"checksum":${this.checksum}}`
      );
    }
  }
}
