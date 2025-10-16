
import { BinXmlNameRef } from '../binxml/name.js';
import { BinXmlValue, BinXmlValueType } from '../binxml/value_variant.js';

export type ChunkOffset = number;

// 1:1 translation of BinXMLDeserializedTokens enum
export type BinXMLDeserializedTokens = 
    | { kind: 'FragmentHeader'; value: BinXMLFragmentHeader }
    | { kind: 'TemplateInstance'; value: BinXmlTemplateRef }
    | { kind: 'OpenStartElement'; value: BinXMLOpenStartElement }
    | { kind: 'AttributeList' }
    | { kind: 'Attribute'; value: BinXMLAttribute }
    | { kind: 'CloseStartElement' }
    | { kind: 'CloseEmptyElement' }
    | { kind: 'CloseElement' }
    | { kind: 'Value'; value: BinXmlValue }
    | { kind: 'CDATASection' }
    | { kind: 'CharRef' }
    | { kind: 'EntityRef'; value: BinXmlEntityReference }
    | { kind: 'PITarget'; value: BinXMLProcessingInstructionTarget }
    | { kind: 'PIData'; value: string }
    | { kind: 'Substitution'; value: TemplateSubstitutionDescriptor }
    | { kind: 'EndOfStream' }
    | { kind: 'StartOfStream' };

// 1:1 translation of BinXMLProcessingInstructionTarget struct
export class BinXMLProcessingInstructionTarget {
    name: BinXmlNameRef;

    constructor(name: BinXmlNameRef) {
        this.name = name;
    }
}

// 1:1 translation of BinXMLOpenStartElement struct
export class BinXMLOpenStartElement {
    data_size: number;
    name: BinXmlNameRef;

    constructor(data_size: number, name: BinXmlNameRef) {
        this.data_size = data_size;
        this.name = name;
    }
}

// 1:1 translation of BinXmlTemplateDefinitionHeader struct
export class BinXmlTemplateDefinitionHeader {
    next_template_offset: ChunkOffset;
    guid: string; // Using string for GUID representation
    data_size: number;

    constructor(next_template_offset: ChunkOffset, guid: string, data_size: number) {
        this.next_template_offset = next_template_offset;
        this.guid = guid;
        this.data_size = data_size;
    }
}

// 1:1 translation of remaining structs
export class BinXMLFragmentHeader {
    major_version: number;
    minor_version: number;
    flags: number;

    constructor(major_version: number, minor_version: number, flags: number) {
        this.major_version = major_version;
        this.minor_version = minor_version;
        this.flags = flags;
    }
}

export class BinXmlTemplateRef {
    template_def_offset: ChunkOffset;
    substitution_array: BinXMLDeserializedTokens[];

    constructor(template_def_offset: ChunkOffset, substitution_array: BinXMLDeserializedTokens[]) {
        this.template_def_offset = template_def_offset;
        this.substitution_array = substitution_array;
    }
}

export class BinXMLAttribute {
    name: BinXmlNameRef;

    constructor(name: BinXmlNameRef) {
        this.name = name;
    }
}

export class BinXmlEntityReference {
    name: BinXmlNameRef;

    constructor(name: BinXmlNameRef) {
        this.name = name;
    }
}

export class TemplateSubstitutionDescriptor {
    substitution_index: number;
    value_type: BinXmlValueType;
    ignore: boolean;

    constructor(substitution_index: number, value_type: BinXmlValueType, ignore: boolean) {
        this.substitution_index = substitution_index;
        this.value_type = value_type;
        this.ignore = ignore;
    }
}

export class TemplateValueDescriptor {
    size: number;
    value_type: BinXmlValueType;

    constructor(size: number, value_type: BinXmlValueType) {
        this.size = size;
        this.value_type = value_type;
    }
}

export class BinXMLTemplateDefinition {
    header: BinXmlTemplateDefinitionHeader;
    tokens: BinXMLDeserializedTokens[];

    constructor(header: BinXmlTemplateDefinitionHeader, tokens: BinXMLDeserializedTokens[]) {
        this.header = header;
        this.tokens = tokens;
    }
}