// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.

/* eslint-disable */
// TypeScript XML output implementation for EVTX
// Simplified version focused on converting XmlModel to XML strings

import { XmlModel, XmlElement, BinXmlPI, Cow } from './model/xml.js';
import { BinXmlValue } from './binxml/value_variant.js';
import { BinXmlName } from './binxml/name.js';
import { ParserSettings } from './parser_settings.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// Helper to unwrap Cow values
function unwrap_cow<T>(cow: Cow<T>): T {
  return cow.value;
}

// Helper to convert BinXmlName to string
function name_to_string(name: Cow<BinXmlName>): string {
  return unwrap_cow(name).str;
}

// Helper to convert BinXmlValue to string
function value_to_string(value: BinXmlValue): string {
  switch (value.kind) {
    case 'NullType':
      return '';
    case 'StringType':
      return value.value;
    case 'AnsiStringType':
      return value.value;
    case 'BoolType':
      return value.value ? 'true' : 'false';
    case 'Int8Type':
    case 'UInt8Type':
    case 'Int16Type':
    case 'UInt16Type':
    case 'Int32Type':
    case 'UInt32Type':
    case 'Int64Type':
    case 'UInt64Type':
    case 'SizeTType':
      return String(value.value);
    case 'Real32Type':
    case 'Real64Type':
      return String(value.value);
    case 'BinXmlType':
      return ''; // Binary XML not supported in text
    case 'GuidType':
    case 'SidType':
    case 'HexInt32Type':
    case 'HexInt64Type':
      return value.value;
    case 'FileTimeType':
    case 'SysTimeType':
      return value.value.toISOString();
    default:
      return '';
  }
}

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// XmlOutput class - builds XML from XmlModel
export class XmlOutput {
  private output: string[];
  private indent_level: number;
  private settings: ParserSettings;
  private element_stack: string[];

  constructor(settings: ParserSettings) {
    this.output = [];
    this.indent_level = 0;
    this.settings = settings;
    this.element_stack = [];
  }

  public into_string(): string {
    return this.output.join('');
  }

  private write_indent(): void {
    if (this.settings.should_indent()) {
      this.output.push('  '.repeat(this.indent_level));
    }
  }

  public visit_open_start_element(element: XmlElement): Result<void> {
    this.write_indent();

    const name = name_to_string(element.name);
    this.element_stack.push(name);

    this.output.push('<');
    this.output.push(name);

    // Write attributes
    for (const attr of element.attributes) {
      const attr_name = name_to_string(attr.name);
      const attr_value = value_to_string(unwrap_cow(attr.value));

      if (attr_value.length > 0) {
        this.output.push(' ');
        this.output.push(attr_name);
        this.output.push('="');
        this.output.push(escapeXml(attr_value));
        this.output.push('"');
      }
    }

    this.output.push('>');

    if (this.settings.should_indent()) {
      this.output.push('\n');
    }

    this.indent_level++;

    return ok(undefined);
  }

  public visit_close_element(): Result<void> {
    this.indent_level--;

    const name = this.element_stack.pop();
    if (!name) {
      return err(new Error('Element stack underflow'));
    }

    this.write_indent();
    this.output.push('</');
    this.output.push(name);
    this.output.push('>');

    if (this.settings.should_indent()) {
      this.output.push('\n');
    }

    return ok(undefined);
  }

  public visit_characters(value: BinXmlValue): Result<void> {
    const text = value_to_string(value);
    this.output.push(escapeXml(text));
    return ok(undefined);
  }

  public visit_entity_reference(entity_name: BinXmlName): Result<void> {
    this.output.push('&');
    this.output.push(entity_name.str);
    return ok(undefined);
  }

  public visit_processing_instruction(pi: BinXmlPI): Result<void> {
    this.write_indent();
    this.output.push('<?');
    this.output.push(name_to_string(pi.name));
    this.output.push(' ');
    this.output.push(unwrap_cow(pi.data));
    this.output.push('?>');

    if (this.settings.should_indent()) {
      this.output.push('\n');
    }

    return ok(undefined);
  }
}

// Function to convert XmlModel array to XML string
export function xml_models_to_string(models: XmlModel[], settings: ParserSettings): Result<string> {
  const output = new XmlOutput(settings);

  for (const model of models) {
    const result = process_xml_model(model, output);
    if (result.kind === 'err') {
      return result;
    }
  }

  return ok(output.into_string());
}

// Helper function to process a single XmlModel
function process_xml_model(model: XmlModel, output: XmlOutput): Result<void> {
  switch (model.kind) {
    case 'OpenElement':
      return output.visit_open_start_element(model.value);

    case 'CloseElement':
      return output.visit_close_element();

    case 'Value':
      return output.visit_characters(unwrap_cow(model.value));

    case 'EntityRef':
      return output.visit_entity_reference(unwrap_cow(model.value));

    case 'PI':
      return output.visit_processing_instruction(model.value);

    case 'EndOfStream':
    case 'StartOfStream':
      return ok(undefined);

    default:
      return err(new Error(`Unknown XmlModel kind: ${(model as any).kind}`));
  }
}
