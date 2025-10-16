// import { BinXmlValue } from './value_variant.js';
import { read_template_definition } from './tokens';
import { BinXmlName, BinXmlNameRef } from './name';
import {
  BinXMLDeserializedTokens,
  BinXmlTemplateRef,
  TemplateSubstitutionDescriptor,
} from '../model/deserialized.js';
import { XmlModel, XmlElementBuilder, XmlPIBuilder, Cow, borrowed, owned } from '../model/xml.js';

// TypeScript Result type for error handling
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function ok<T>(value: T): Result<T> {
  return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
  return { kind: 'err', error };
}

// Constants from Rust
const BINXML_NAME_LINK_SIZE = 6;

// 1:1 translation of create_record_model function
export function create_record_model(
  tokens: Cow<BinXMLDeserializedTokens>[],
  chunk: any
): Result<XmlModel[]> {
  let current_element: XmlElementBuilder | null = null;
  let current_pi: XmlPIBuilder | null = null;
  const model: XmlModel[] = [];

  for (const token of tokens) {
    // Handle all places where we don't care if it's an Owned or a Borrowed value.
    const tokenValue = token.value;

    switch (tokenValue.kind) {
      case 'FragmentHeader':
        // Skip fragment headers
        break;

      case 'TemplateInstance':
        return err(new Error('Call `expand_templates` before calling this function'));

      case 'AttributeList':
        // Skip attribute lists
        break;

      case 'CloseElement':
        model.push({ kind: 'CloseElement' });
        break;

      case 'CloseStartElement':
        // console.log("DEBUG CloseStartElement: current_element exists:", current_element !== null);
        if (current_element === null) {
          return err(new Error('close start - Bad parser state'));
        }
        const finishResult = current_element.finish();
        if (finishResult.kind === 'err') {
          return finishResult;
        }
        // console.log("DEBUG CloseStartElement: Pushing OpenElement to model");
        model.push({ kind: 'OpenElement', value: finishResult.value });
        current_element = null;
        break;

      case 'CDATASection':
        return err(new Error('Unimplemented - CDATA'));

      case 'CharRef':
        return err(new Error('Unimplemented - CharacterReference'));

      case 'EntityRef':
        const entityResult = expand_string_ref(tokenValue.value.name, chunk);
        if (entityResult.kind === 'err') {
          return entityResult;
        }
        model.push({ kind: 'EntityRef', value: entityResult.value });
        break;

      case 'PITarget':
        const builder = new XmlPIBuilder();
        if (current_pi !== null) {
          console.warn('PITarget without following PIData, previous target will be ignored.');
        }
        const nameResult = expand_string_ref(tokenValue.value.name, chunk);
        if (nameResult.kind === 'err') {
          return nameResult;
        }
        builder.name(nameResult.value);
        current_pi = builder;
        break;

      case 'PIData':
        if (current_pi === null) {
          return err(new Error('PI Data without PI target - Bad parser state'));
        }
        const piData =
          token.kind === 'owned' ? owned(tokenValue.value) : borrowed(tokenValue.value);
        current_pi.data(piData);
        model.push(current_pi.finish());
        current_pi = null;
        break;

      case 'Substitution':
        return err(new Error('Call `expand_templates` before calling this function'));

      case 'EndOfStream':
        model.push({ kind: 'EndOfStream' });
        break;

      case 'StartOfStream':
        model.push({ kind: 'StartOfStream' });
        break;

      case 'CloseEmptyElement':
        if (current_element === null) {
          return err(new Error('close empty - Bad parser state'));
        }
        const emptyFinishResult = current_element.finish();
        if (emptyFinishResult.kind === 'err') {
          return emptyFinishResult;
        }
        model.push({ kind: 'OpenElement', value: emptyFinishResult.value });
        model.push({ kind: 'CloseElement' });
        current_element = null;
        break;

      case 'Attribute':
        // console.log("DEBUG Attribute token:", tokenValue.value);
        if (current_element === null) {
          return err(new Error('attribute - Bad parser state'));
        }
        const attrNameResult = expand_string_ref(tokenValue.value.name, chunk);
        if (attrNameResult.kind === 'err') {
          return attrNameResult;
        }
        current_element.attribute_name(attrNameResult.value);
        break;

      case 'OpenStartElement':
        // console.log("DEBUG OpenStartElement token:", tokenValue.value);
        const elementBuilder = new XmlElementBuilder();
        const elemNameResult = expand_string_ref(tokenValue.value.name, chunk);
        if (elemNameResult.kind === 'err') {
          return elemNameResult;
        }
        elementBuilder.name(elemNameResult.value);
        current_element = elementBuilder;
        break;

      case 'Value':
        // console.log("DEBUG Value token:", tokenValue.value);
        const value = tokenValue.value;

        if (current_element === null) {
          if (value.kind === 'EvtXml') {
            return err(new Error('Call `expand_templates` before calling this function'));
          }
          const cowValue = token.kind === 'owned' ? owned(value) : borrowed(value);
          model.push({ kind: 'Value', value: cowValue });
        } else {
          const cowValue = token.kind === 'owned' ? owned(value) : borrowed(value);
          const attrResult = current_element.attribute_value(cowValue);
          if (attrResult.kind === 'err') {
            return attrResult;
          }
        }
        break;

      default:
        // console.log("DEBUG: Unhandled token type:", (tokenValue as any).kind);
        break;
    }
  }

  return ok(model);
}

// 1:1 translation of expand_string_ref function
function expand_string_ref(string_ref: BinXmlNameRef, chunk: any): Result<Cow<BinXmlName>> {
  // console.log(`DEBUG expand_string_ref: Called with offset ${string_ref.offset}`);
  // console.log(`DEBUG expand_string_ref: Chunk data size: ${chunk.data ? chunk.data.length : 'undefined'}`);

  // Check string cache first (if available)
  if (chunk.string_cache && chunk.string_cache.get_cached_string) {
    const cached = chunk.string_cache.get_cached_string(string_ref.offset);
    if (cached) {
      // console.log(`DEBUG expand_string_ref: Found cached string: ${cached.as_str()}`);
      return ok(borrowed(cached));
    }
  }

  // Cache miss - read from chunk data
  try {
    const cursor_position = string_ref.offset + BINXML_NAME_LINK_SIZE;
    // console.log(`DEBUG expand_string_ref: Reading from position ${cursor_position} (offset ${string_ref.offset} + ${BINXML_NAME_LINK_SIZE})`);
    // console.log(`DEBUG expand_string_ref: Chunk data length: ${chunk.data.length}, position valid: ${cursor_position < chunk.data.length}`);

    const string_result = BinXmlName.from_stream(chunk.data, cursor_position);
    if (string_result.kind === 'err') {
      // console.log(`DEBUG expand_string_ref: Failed to read string: ${string_result.error}`);
      return err(string_result.error);
    }

    const name = string_result.value;
    // console.log(`DEBUG expand_string_ref: Successfully read string: ${name.as_str()}`);
    return ok(owned(name));
  } catch (error) {
    // console.log(`DEBUG expand_string_ref: Exception: ${error}`);
    return err(new Error(`Failed to expand string ref at offset ${string_ref.offset}: ${error}`));
  }
}

// 1:1 translation of expand_token_substitution function
function expand_token_substitution(
  template: BinXmlTemplateRef,
  substitution_descriptor: TemplateSubstitutionDescriptor,
  chunk: any,
  stack: Cow<BinXMLDeserializedTokens>[]
): Result<void> {
  if (substitution_descriptor.ignore) {
    return ok(undefined);
  }

  const value = template.substitution_array[substitution_descriptor.substitution_index];

  if (value !== undefined) {
    // Replace the value with NullType to avoid using it again
    template.substitution_array[substitution_descriptor.substitution_index] = {
      kind: 'Value',
      value: { kind: 'NullType' },
    };
    const expandResult = _expand_templates(owned(value), chunk, stack);
    if (expandResult.kind === 'err') {
      return expandResult;
    }
  } else {
    const expandResult = _expand_templates(
      owned({ kind: 'Value', value: { kind: 'NullType' } }),
      chunk,
      stack
    );
    if (expandResult.kind === 'err') {
      return expandResult;
    }
  }

  return ok(undefined);
}

// 1:1 translation of expand_template function
function expand_template(
  template: BinXmlTemplateRef,
  chunk: any,
  stack: Cow<BinXMLDeserializedTokens>[]
): Result<void> {
  // console.log(`DEBUG expandTemplate: Looking for template at offset ${template.template_def_offset}`);

  if (chunk.template_table && chunk.template_table.get_template) {
    const template_def = chunk.template_table.get_template(template.template_def_offset);
    if (template_def) {
      // console.log(`DEBUG expandTemplate: Found template with ${template_def.tokens.length} tokens`);
      // We expect to find all the templates in the template cache.
      for (const token of template_def.tokens) {
        if (token.kind === 'Substitution') {
          const subResult = expand_token_substitution(template, token.value, chunk, stack);
          if (subResult.kind === 'err') {
            return subResult;
          }
        } else {
          const expandResult = _expand_templates(borrowed(token), chunk, stack);
          if (expandResult.kind === 'err') {
            return expandResult;
          }
        }
      }
    } else {
      // If the file was not closed correctly, there can be a template which was not found in the header.
      // In that case, we will try to read it directly from the chunk.
      // console.log(`DEBUG expandTemplate: Template in offset ${template.template_def_offset} was not found in cache`);

      try {
        const template_def = read_template_definition(
          chunk.data,
          template.template_def_offset,
          chunk,
          'windows-1252' // ansi_codec
        );

        if (template_def.kind === 'err') {
          return template_def;
        }

        // console.log(`DEBUG expandTemplate: Read template definition with ${template_def.value.tokens.length} tokens`);
        for (const token of template_def.value.tokens) {
          if (token.kind === 'Substitution') {
            const subResult = expand_token_substitution(template, token.value, chunk, stack);
            if (subResult.kind === 'err') {
              return subResult;
            }
          } else {
            const expandResult = _expand_templates(owned(token), chunk, stack);
            if (expandResult.kind === 'err') {
              return expandResult;
            }
          }
        }
      } catch (error) {
        return err(new Error(`Failed to read template definition: ${error}`));
      }
    }
  }

  return ok(undefined);
}

// 1:1 translation of _expand_templates function
function _expand_templates(
  token: Cow<BinXMLDeserializedTokens>,
  chunk: any,
  stack: Cow<BinXMLDeserializedTokens>[]
): Result<void> {
  const tokenValue = token.value;

  switch (token.kind) {
    case 'owned':
      if (tokenValue.kind === 'Value' && tokenValue.value.kind === 'BinXmlType') {
        // Owned values can be consumed when flattening, and passed on as owned.
        for (const nestedToken of tokenValue.value.value) {
          const expandResult = _expand_templates(owned(nestedToken), chunk, stack);
          if (expandResult.kind === 'err') {
            return expandResult;
          }
        }
      } else if (tokenValue.kind === 'TemplateInstance') {
        // Actual template handling.
        const expandResult = expand_template(tokenValue.value, chunk, stack);
        if (expandResult.kind === 'err') {
          return expandResult;
        }
      } else {
        stack.push(token);
      }
      break;

    case 'borrowed':
      if (tokenValue.kind === 'Value' && tokenValue.value.kind === 'BinXmlType') {
        for (const nestedToken of tokenValue.value.value) {
          const expandResult = _expand_templates(borrowed(nestedToken), chunk, stack);
          if (expandResult.kind === 'err') {
            return expandResult;
          }
        }
      } else if (tokenValue.kind === 'TemplateInstance') {
        // This can happen if a template has a token which is:
        // 1. Another template.
        // 2. Is not a substitution (because they are `Owned` values).
        // We never actually see this in practice, so we don't mind paying for `clone` here.
        const clonedTemplate = {
          template_def_offset: tokenValue.value.template_def_offset,
          substitution_array: [...tokenValue.value.substitution_array],
        };
        const expandResult = expand_template(clonedTemplate, chunk, stack);
        if (expandResult.kind === 'err') {
          return expandResult;
        }
      } else {
        stack.push(token);
      }
      break;
  }

  return ok(undefined);
}

// 1:1 translation of expand_templates function
export function expand_templates(
  token_tree: BinXMLDeserializedTokens[],
  chunk: any
): Result<Cow<BinXMLDeserializedTokens>[]> {
  // console.log(`DEBUG expandTemplates: Input ${token_tree.length} tokens`);
  // We can assume the new tree will be at least as big as the old one.
  const stack: Cow<BinXMLDeserializedTokens>[] = [];

  for (let i = 0; i < token_tree.length; i++) {
    // const token = token_tree[i];
    // console.log(`DEBUG expandTemplates: Processing token ${i}: ${token.kind}`);
    const expandResult = _expand_templates(
      owned(token_tree[i]! as BinXMLDeserializedTokens),
      chunk,
      stack
    );
    if (expandResult.kind === 'err') {
      return expandResult;
    }
  }

  // console.log(`DEBUG expandTemplates: Output ${stack.length} tokens`);
  return ok(stack);
}
