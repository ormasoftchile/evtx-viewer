
// TypeScript equivalent of encoding::types::EncodingRef
type EncodingRef = string; // Simplified for TypeScript

// 1:1 translation of ParserSettings struct - exact same field names and order
export class ParserSettings {
    // Controls the number of threads used for parsing chunks concurrently.
    num_threads: number;
    // If enabled, chunk with bad checksums will be skipped.
    validate_checksums: boolean;
    // If enabled, XML attributes will be separated in JSON
    // into a separate field. Example:
    // {
    //   "EventID": {
    //     "#attributes": {
    //       "Qualifiers": 16384
    //     },
    //     "#text": 4111
    //   }
    // }
    //
    // Becomes:
    // {
    //   "EventID": 4111,
    //   "EventID_attributes": {
    //     "Qualifiers": 16384
    //   }
    // }
    separate_json_attributes: boolean;
    // If true, output will be indented.
    indent: boolean;
    // Controls the ansi codec used to deserialize ansi strings inside the xml document.
    ansi_codec: EncodingRef;

    constructor(
        num_threads: number = 0,
        validate_checksums: boolean = false,
        separate_json_attributes: boolean = false,
        indent: boolean = true,
        ansi_codec: EncodingRef = "windows-1252"
    ) {
        this.num_threads = num_threads;
        this.validate_checksums = validate_checksums;
        this.separate_json_attributes = separate_json_attributes;
        this.indent = indent;
        this.ansi_codec = ansi_codec;
    }

    // 1:1 translation of new() method
    public static new(): ParserSettings {
        return ParserSettings.default();
    }

    // 1:1 translation of default() method
    public static default(): ParserSettings {
        return new ParserSettings(
            0,           // num_threads: 0
            false,       // validate_checksums: false
            false,       // separate_json_attributes: false
            true,        // indent: true
            "windows-1252"  // ansi_codec: WINDOWS_1252
        );
    }

    // 1:1 translation of num_threads() method
    public with_num_threads(num_threads: number): ParserSettings {
        // Simplified version without rayon dependency
        const actual_threads = num_threads === 0 ? 4 : num_threads; // Default to 4 threads
        return new ParserSettings(
            actual_threads,
            this.validate_checksums,
            this.separate_json_attributes,
            this.indent,
            this.ansi_codec
        );
    }

    // 1:1 translation of ansi_codec() method
    public with_ansi_codec(ansi_codec: EncodingRef): ParserSettings {
        return new ParserSettings(
            this.num_threads,
            this.validate_checksums,
            this.separate_json_attributes,
            this.indent,
            ansi_codec
        );
    }

    // 1:1 translation of validate_checksums() method
    public with_validate_checksums(validate_checksums: boolean): ParserSettings {
        return new ParserSettings(
            this.num_threads,
            validate_checksums,
            this.separate_json_attributes,
            this.indent,
            this.ansi_codec
        );
    }

    // 1:1 translation of separate_json_attributes() method
    public with_separate_json_attributes(separate: boolean): ParserSettings {
        return new ParserSettings(
            this.num_threads,
            this.validate_checksums,
            separate,
            this.indent,
            this.ansi_codec
        );
    }

    // 1:1 translation of indent() method
    public with_indent(pretty: boolean): ParserSettings {
        return new ParserSettings(
            this.num_threads,
            this.validate_checksums,
            this.separate_json_attributes,
            pretty,
            this.ansi_codec
        );
    }

    // 1:1 translation of get_ansi_codec() method
    public get_ansi_codec(): EncodingRef {
        return this.ansi_codec;
    }

    // 1:1 translation of should_separate_json_attributes() method
    public should_separate_json_attributes(): boolean {
        return this.separate_json_attributes;
    }

    // 1:1 translation of should_indent() method
    public should_indent(): boolean {
        return this.indent;
    }

    // 1:1 translation of should_validate_checksums() method
    public should_validate_checksums(): boolean {
        return this.validate_checksums;
    }

    // 1:1 translation of get_num_threads() method
    public get_num_threads(): number {
        return this.num_threads;
    }

    // 1:1 translation of clone() functionality
    public clone(): ParserSettings {
        return new ParserSettings(
            this.num_threads,
            this.validate_checksums,
            this.separate_json_attributes,
            this.indent,
            this.ansi_codec
        );
    }
}