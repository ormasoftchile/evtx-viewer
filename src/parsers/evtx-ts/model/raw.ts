// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
// Following exact Rust file structure and function organization

// 1:1 translation of BinXMLRawToken enum
export type BinXMLRawToken =
  | { kind: 'EndOfStream' }
  | { kind: 'OpenStartElement'; value: OpenStartElementTokenMeta }
  | { kind: 'CloseStartElement' }
  | { kind: 'CloseEmptyElement' }
  | { kind: 'CloseElement' }
  | { kind: 'Value' }
  | { kind: 'Attribute'; value: AttributeTokenMeta }
  | { kind: 'CDataSection' }
  | { kind: 'CharReference' }
  | { kind: 'EntityReference' }
  | { kind: 'ProcessingInstructionTarget' }
  | { kind: 'ProcessingInstructionData' }
  | { kind: 'TemplateInstance' }
  | { kind: 'NormalSubstitution' }
  | { kind: 'ConditionalSubstitution' }
  | { kind: 'StartOfStream' };

// 1:1 translation of OpenStartElementTokenMeta struct
export class OpenStartElementTokenMeta {
  has_attributes: boolean;

  constructor(has_attributes: boolean) {
    this.has_attributes = has_attributes;
  }
}

// 1:1 translation of AttributeTokenMeta struct
export class AttributeTokenMeta {
  more_attributes_expected: boolean;

  constructor(more_attributes_expected: boolean) {
    this.more_attributes_expected = more_attributes_expected;
  }
}

// 1:1 translation of raw_token_from_u8 function - EXACT copy from Rust
export function raw_token_from_u8(byte: number): BinXMLRawToken | null {
  switch (byte) {
    case 0x00:
      return { kind: 'EndOfStream' };
    case 0x01:
      return { kind: 'OpenStartElement', value: new OpenStartElementTokenMeta(false) };
    case 0x41:
      return { kind: 'OpenStartElement', value: new OpenStartElementTokenMeta(true) };
    case 0x02:
      return { kind: 'CloseStartElement' };
    case 0x03:
      return { kind: 'CloseEmptyElement' };
    case 0x04:
      return { kind: 'CloseElement' };
    case 0x05:
    case 0x45:
      return { kind: 'Value' };
    case 0x21:
      return { kind: 'Value' };
    case 0x06:
      return { kind: 'Attribute', value: new AttributeTokenMeta(false) };
    case 0x46:
      return { kind: 'Attribute', value: new AttributeTokenMeta(true) };
    case 0x07:
    case 0x47:
      return { kind: 'CDataSection' };
    case 0x08:
    case 0x48:
      return { kind: 'CharReference' };
    case 0x09:
    case 0x49:
      return { kind: 'EntityReference' };
    case 0x0a:
      return { kind: 'ProcessingInstructionTarget' };
    case 0x0b:
      return { kind: 'ProcessingInstructionData' };
    case 0x0c:
      return { kind: 'TemplateInstance' };
    case 0x0d:
      return { kind: 'NormalSubstitution' };
    case 0x0e:
      return { kind: 'ConditionalSubstitution' };
    case 0x0f:
      return { kind: 'StartOfStream' };
    default:
      return null;
  }
}
