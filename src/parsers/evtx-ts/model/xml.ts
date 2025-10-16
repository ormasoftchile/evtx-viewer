import { BinXmlName } from '../binxml/name.js';
import { BinXmlValue } from '../binxml/value_variant.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// Cow<T> equivalent - either borrowed or owned
export type Cow<T> = { kind: 'borrowed'; value: T } | { kind: 'owned'; value: T };

export function borrowed<T>(value: T): Cow<T> {
  return { kind: 'borrowed', value };
}

export function owned<T>(value: T): Cow<T> {
  return { kind: 'owned', value };
}

// 1:1 translation of XmlModel enum
export type XmlModel =
  | { kind: 'OpenElement'; value: XmlElement }
  | { kind: 'CloseElement' }
  | { kind: 'PI'; value: BinXmlPI }
  | { kind: 'EntityRef'; value: Cow<BinXmlName> }
  | { kind: 'Value'; value: Cow<BinXmlValue> }
  | { kind: 'EndOfStream' }
  | { kind: 'StartOfStream' };

// 1:1 translation of XmlAttribute struct
export class XmlAttribute {
  name: Cow<BinXmlName>;
  value: Cow<BinXmlValue>;

  constructor(name: Cow<BinXmlName>, value: Cow<BinXmlValue>) {
    this.name = name;
    this.value = value;
  }
}

// 1:1 translation of XmlElement struct
export class XmlElement {
  name: Cow<BinXmlName>;
  attributes: XmlAttribute[];

  constructor(name: Cow<BinXmlName>, attributes: XmlAttribute[]) {
    this.name = name;
    this.attributes = attributes;
  }
}

// 1:1 translation of BinXmlPI struct
export class BinXmlPI {
  name: Cow<BinXmlName>;
  data: Cow<string>;

  constructor(name: Cow<BinXmlName>, data: Cow<string>) {
    this.name = name;
    this.data = data;
  }
}

// 1:1 translation of XmlElementBuilder struct
export class XmlElementBuilder {
  private element_name: Cow<BinXmlName> | null = null;
  private attributes: XmlAttribute[] = [];
  private current_attribute_name: Cow<BinXmlName> | null = null;
  private current_attribute_value: Cow<BinXmlValue> | null = null;

  constructor() {}

  name(name: Cow<BinXmlName>): void {
    this.element_name = name;
  }

  attribute_name(name: Cow<BinXmlName>): void {
    if (this.current_attribute_name !== null) {
      console.error('invalid state, overriding name');
    }
    this.current_attribute_name = name;
  }

  attribute_value(value: Cow<BinXmlValue>): Result<void> {
    // If we are in an attribute value without a name, simply ignore the request.
    // This is consistent with what windows is doing.
    if (this.current_attribute_name === null) {
      return ok(undefined);
    }

    if (this.current_attribute_value !== null) {
      return err(new Error('invalid state, there should not be a value'));
    }

    this.current_attribute_value = value;

    this.attributes.push(
      new XmlAttribute(this.current_attribute_name, this.current_attribute_value)
    );

    this.current_attribute_name = null;
    this.current_attribute_value = null;

    return ok(undefined);
  }

  finish(): Result<XmlElement> {
    if (this.element_name === null) {
      return err(new Error('Element name should be set'));
    }

    return ok(new XmlElement(this.element_name, this.attributes));
  }
}

// 1:1 translation of XmlPIBuilder struct
export class XmlPIBuilder {
  private pi_name: Cow<BinXmlName> | null = null;
  private pi_data: Cow<string> | null = null;

  constructor() {}

  name(name: Cow<BinXmlName>): void {
    this.pi_name = name;
  }

  data(data: Cow<string>): void {
    this.pi_data = data;
  }

  finish(): XmlModel {
    if (this.pi_name === null) {
      throw new Error('Element name should be set');
    }
    if (this.pi_data === null) {
      throw new Error('Data should be set');
    }

    return {
      kind: 'PI',
      value: new BinXmlPI(this.pi_name, this.pi_data),
    };
  }
}
