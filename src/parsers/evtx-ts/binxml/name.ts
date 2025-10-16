
export type ChunkOffset = number;

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };
type ResultWithBytes<T, E = Error> = { result: Result<T, E>; bytes_consumed: number };

function ok<T>(value: T): Result<T> {
    return { kind: 'ok', value };
}

function okWithBytes<T>(value: T, bytes_consumed: number): ResultWithBytes<T> {
    return { result: ok(value), bytes_consumed };
}

function err<E extends Error>(error: E): Result<never, E> {
    return { kind: 'err', error };
}

// 1:1 translation of BinXmlName struct
export class BinXmlName {
    str: string;

    constructor(str: string) {
        this.str = str;
    }

    static from_str(s: string): BinXmlName {
        return new BinXmlName(s);
    }

    static from_string(s: string): BinXmlName {
        return new BinXmlName(s);
    }

    // 1:1 translation of from_stream method
    static from_stream(cursor: Buffer, offset: number): Result<BinXmlName> {
        try {
            // Read length-prefixed UTF-16 string with null terminator
            const name = read_len_prefixed_utf16_string_nul_terminated(cursor, offset);
            return ok(new BinXmlName(name || ""));
        } catch (e) {
            return err(new Error(`Failed to read BinXmlName: ${e instanceof Error ? e.message : String(e)}`));
        }
    }

    toString(): string {
        return this.str;
    }

    as_str(): string {
        return this.str;
    }
}

// 1:1 translation of BinXmlNameRef struct
export class BinXmlNameRef {
    offset: ChunkOffset;

    constructor(offset: ChunkOffset) {
        this.offset = offset;
    }

    // 1:1 translation of from_stream method
    static from_stream(cursor: Buffer, position: number): ResultWithBytes<BinXmlNameRef> {
        try {
            if (cursor.length < position + 4) {
                return { result: err(new Error("Not enough data for name offset")), bytes_consumed: 0 };
            }

            const name_offset = cursor.readUInt32LE(position);
            let current_position = position + 4;

            const position_before_string = current_position;
            const need_to_seek = position_before_string === name_offset;

            if (need_to_seek) {
                // Parse BinXmlNameLink
                const link_result = BinXmlNameLink.from_stream(cursor, current_position);
                if (link_result.kind === 'err') {
                    return { result: link_result, bytes_consumed: 0 };
                }

                current_position += 6; // BinXmlNameLink::data_size()

                if (cursor.length < current_position + 2) {
                    return { result: err(new Error("Not enough data for string length")), bytes_consumed: 0 };
                }

                const len = cursor.readUInt16LE(current_position);
                current_position += 2;

                const nul_terminator_len = 4;
                const data_size = 6 + (len * 2) + nul_terminator_len; // BinXmlNameLink::data_size() + string data + terminator

                // Skip to end of string data
                current_position = position_before_string + data_size;
            }

            const bytes_consumed = current_position - position;
            return okWithBytes(new BinXmlNameRef(name_offset), bytes_consumed);
        } catch (e) {
            return { result: err(new Error(`Failed to read BinXmlNameRef: ${e instanceof Error ? e.message : String(e)}`)), bytes_consumed: 0 };
        }
    }
}

// 1:1 translation of BinXmlNameLink struct
export class BinXmlNameLink {
    next_string: ChunkOffset | null;
    hash: number;

    constructor(next_string: ChunkOffset | null, hash: number) {
        this.next_string = next_string;
        this.hash = hash;
    }

    // 1:1 translation of from_stream method
    static from_stream(cursor: Buffer, offset: number): Result<BinXmlNameLink> {
        try {
            if (cursor.length < offset + 6) {
                return err(new Error("Not enough data for BinXmlNameLink"));
            }

            const next_string = cursor.readUInt32LE(offset);
            const name_hash = cursor.readUInt16LE(offset + 4);

            return ok(new BinXmlNameLink(
                next_string > 0 ? next_string : null,
                name_hash
            ));
        } catch (e) {
            return err(new Error(`Failed to read BinXmlNameLink: ${e instanceof Error ? e.message : String(e)}`));
        }
    }

    static data_size(): number {
        return 6;
    }
}

// Helper function to read length-prefixed UTF-16 string with null terminator
function read_len_prefixed_utf16_string_nul_terminated(cursor: Buffer, offset: number): string {
    if (cursor.length < offset + 2) {
        throw new Error("Not enough data for string length");
    }

    const len = cursor.readUInt16LE(offset);
    // console.log(`DEBUG read_len_prefixed_utf16_string_nul_terminated: offset=${offset}, len=${len}`);
    
    const string_start = offset + 2;

    if (cursor.length < string_start + len * 2) {
        // console.log(`DEBUG read_len_prefixed_utf16_string_nul_terminated: Not enough data - cursor.length=${cursor.length}, needed=${string_start + len * 2}`);
        throw new Error("Not enough data for string content");
    }

    // Read UTF-16LE string
    const string_bytes = cursor.subarray(string_start, string_start + len * 2);
    const result = string_bytes.toString('utf16le');
    // console.log(`DEBUG read_len_prefixed_utf16_string_nul_terminated: result="${result.substring(0, 50)}${result.length > 50 ? '...' : ''}"`);
    return result;
}