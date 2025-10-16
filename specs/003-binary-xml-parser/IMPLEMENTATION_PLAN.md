# Binary XML Parser - Implementation Plan

## Quick Reference

**Location**: `/Volumes/Projects/evtx-viewer/specs/003-binary-xml-parser/`
**Status**: Planning Complete - Ready for Implementation
**Estimated Time**: 5 weeks (200 hours)
**Priority**: CRITICAL - Blocks AdditionalInformation extraction

---

## The Problem We're Solving

Windows Event Viewer shows these fields for Event ID 1098:
```
Error: value1
ErrorMessage: value2  
AdditionalInformation: value3  ← Missing from our parser!
```

Our parser shows:
```
EventData: {} ← Empty!
```

**Why?** We search for field names like "AdditionalInformation" in the binary data, but:
- Field names are in the TEMPLATE (stored in chunk)
- Event data contains only VALUES in a substitution array
- Can't find what isn't there!

---

## The Solution

Implement a proper Binary XML parser that:
1. Reads binary tokens (0x0C, 0x0D, 0x01, etc.)
2. Finds template by ID
3. Extracts substitution array (types + data)
4. Applies template with substitutions
5. Generates complete XML text
6. Uses existing XML DOM parser

```
Binary Data → Token Parser → Template + Subst → XML String → DOM Parser → EventData
```

---

## Architecture

### New Directory Structure
```
src/parsers/core/binary_xml/
├── index.ts                    # Exports
├── binary_xml_parser.ts        # Main class
├── token_parser.ts             # Token dispatch
├── value_types.ts              # Type enum
├── tokens/
│   ├── base.ts                 # Interface
│   ├── stream_tokens.ts        # Start/End
│   ├── element_tokens.ts       # Open/Close
│   ├── template_instance.ts    # CRITICAL
│   ├── template.ts             # CRITICAL
│   ├── substitution.ts         # CRITICAL
│   ├── attribute.ts            
│   └── value.ts
└── substitution_entry.ts       # CRITICAL - Type conversion
```

---

## Phase 1: Core Foundation (Week 1)

### What to Build
1. BinXmlValueType enum (30+ types)
2. SubstitutionArrayEntry class
3. IBinXmlToken interface
4. Simple tokens (Start/EndOfStream, Close tags)
5. NormalSubstitution class
6. TokenParser dispatch

### Key Code: BinXmlValueType
```typescript
enum BinXmlValueType {
  StringType = 0x01,      // UTF-16LE
  Int32Type = 0x07,       
  FileTimeType = 0x11,    // Timestamp
  GuidType = 0x0F,
  // ... 26 more types
}
```

### Key Code: SubstitutionArrayEntry
```typescript
class SubstitutionArrayEntry {
  position: number;
  size: number;
  valueType: BinXmlValueType;
  dataBytes: Buffer;
  
  getDataAsString(): string {
    switch (this.valueType) {
      case BinXmlValueType.StringType:
        return this.dataBytes.toString('utf16le');
      case BinXmlValueType.Int32Type:
        return this.dataBytes.readInt32LE(0).toString();
      // ... handle all 30+ types
    }
  }
}
```

### Success Criteria
- Can identify all token types
- Can convert all value types to strings
- Basic token parsing works

---

## Phase 2: Template System (Week 2)

### What to Build
1. Template class
2. TemplateInstance class
3. Substitution array parsing
4. Template caching
5. AsXml() method

### Key Code: TemplateInstance
```typescript
class TemplateInstance {
  templateId: number;
  template: Template;
  substitutions: SubstitutionArrayEntry[];
  
  constructor(buffer: Buffer, offset: number) {
    // Read template ID
    this.templateId = buffer.readUInt32LE(offset + 2);
    
    // Read substitution array
    const count = buffer.readUInt32LE(substOffset);
    for (let i = 0; i < count; i++) {
      const size = buffer.readUInt16LE(...);
      const type = buffer.readUInt16LE(...);
      this.substitutions.push(new SubstitutionArrayEntry(i, size, type));
    }
    
    // Read data bytes
    for (const sub of this.substitutions) {
      sub.dataBytes = buffer.slice(dataOffset, dataOffset + sub.size);
    }
  }
  
  asXml(): string {
    return this.template.asXml(this.substitutions);
  }
}
```

### Success Criteria
- Can parse substitution arrays
- Can apply template with substitutions
- Generates basic XML

---

## Phase 3: Element Parsing (Week 3)

### What to Build
1. OpenStartElementTag
2. AttributeToken
3. ValueToken  
4. OptionalSubstitution
5. String table integration
6. XML escaping

### Key Code: OpenStartElementTag
```typescript
class OpenStartElementTag {
  name: string;
  attributes: AttributeToken[];
  children: IBinXmlToken[];
  
  asXml(substitutions: SubstitutionArrayEntry[]): string {
    let xml = `<${this.name}`;
    
    // Add attributes
    for (const attr of this.attributes) {
      xml += ` ${attr.asXml(substitutions)}`;
    }
    
    xml += '>';
    
    // Add children
    for (const child of this.children) {
      if (child instanceof NormalSubstitution) {
        xml += escapeXml(child.asXml(substitutions));
      } else {
        xml += child.asXml(substitutions);
      }
    }
    
    return xml;
  }
}
```

### Success Criteria
- Generates well-formed XML
- Handles nested elements
- Proper XML escaping

---

## Phase 4: Integration (Week 4)

### What to Change in evtx_parser.ts
```typescript
private static parseByHeuristics(data: Buffer): any {
  console.debug('Using binary XML parser');
  
  try {
    // NEW: Convert binary XML to text XML
    const binaryXmlParser = new BinaryXmlParser();
    const xmlString = binaryXmlParser.parseBinaryXml(data);
    
    // Use existing XML DOM parser
    const xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
    const result = EventExtractor.xmlToEventRecord(xmlDoc, data);
    
    return result;
  } catch (error) {
    // Fallback to old heuristics
    return this.parseByHeuristicsLegacy(data);
  }
}
```

### Success Criteria
- Event ID 1098 shows AdditionalInformation
- All EventData fields match Windows Event Viewer
- No regressions

---

## Phase 5: Polish (Week 5)

### Tasks
1. Handle nested BinXML
2. Memory optimization
3. Comprehensive tests
4. Performance benchmarks
5. Error handling
6. Documentation

---

## Critical Binary Structures

### TemplateInstance Structure
```
Offset 0:  0x0C (token)
Offset 1:  0x?? (unknown)
Offset 2:  Template ID (uint32)
Offset 6:  Template offset (uint32)
Offset 10: Next template offset (uint32)
Offset 14: Substitution array length (uint32)
Offset 18: Substitution metadata [(size, type), ...]
Offset ?:  Substitution data [bytes...]
```

### Substitution Array
```
Count: 3
Metadata:
  [0]: size=16, type=0x01 (StringType)
  [1]: size=32, type=0x01 (StringType)
  [2]: size=256, type=0x01 (StringType)
Data:
  [0]: "Error value" (UTF-16LE, 16 bytes)
  [1]: "ErrorMessage value" (UTF-16LE, 32 bytes)
  [2]: "AdditionalInformation value" (UTF-16LE, 256 bytes)
```

### Template Structure
```
<Data Name="Error">%0%</Data>
<Data Name="ErrorMessage">%1%</Data>
<Data Name="AdditionalInformation">%2%</Data>
```

After substitution:
```xml
<Data Name="Error">Error value</Data>
<Data Name="ErrorMessage">ErrorMessage value</Data>
<Data Name="AdditionalInformation">AdditionalInformation value</Data>
```

---

## Token Reference

| Hex  | Name                 | Priority | Purpose                    |
|------|---------------------|----------|----------------------------|
| 0x00 | EndOfBXmlStream     | HIGH     | End marker                 |
| 0x01 | OpenStartElementTag | HIGH     | `<Element>`                |
| 0x02 | CloseStartElementTag| HIGH     | `>`                        |
| 0x03 | CloseEmptyElementTag| HIGH     | `/>`                       |
| 0x04 | EndElementTag       | HIGH     | `</Element>`               |
| 0x05 | Value               | MEDIUM   | Direct value               |
| 0x0C | TemplateInstance    | CRITICAL | Template + data            |
| 0x0D | NormalSubstitution  | CRITICAL | Replace with value         |
| 0x0F | StartOfBXmlStream   | HIGH     | Start marker               |

---

## Type Conversion Examples

### StringType (0x01) - Most Common
```typescript
// Size is in characters, not bytes (UTF-16LE)
const str = buffer.toString('utf16le', offset, offset + size * 2);
return str.replace(/[\x00-\x1F]+/g, ', ').trim('\0');
```

### FileTimeType (0x11) - Timestamps
```typescript
const fileTime = buffer.readBigInt64LE(offset);
const epoch = 116444736000000000n;
const unixMs = Number((fileTime - epoch) / 10000n);
return new Date(unixMs).toISOString();
```

### GuidType (0x0F)
```typescript
const guid = [
  buffer.readUInt32LE(0).toString(16).padStart(8, '0'),
  buffer.readUInt16LE(4).toString(16).padStart(4, '0'),
  buffer.readUInt16LE(6).toString(16).padStart(4, '0'),
  buffer.slice(8, 10).toString('hex'),
  buffer.slice(10, 16).toString('hex'),
].join('-').toUpperCase();
```

---

## Testing Approach

### Unit Tests
```typescript
describe('SubstitutionArrayEntry', () => {
  test('converts StringType to string', () => {
    const entry = new SubstitutionArrayEntry(0, 10, BinXmlValueType.StringType);
    entry.dataBytes = Buffer.from('Hello\0', 'utf16le');
    expect(entry.getDataAsString()).toBe('Hello');
  });
  
  test('converts Int32Type to string', () => {
    const entry = new SubstitutionArrayEntry(0, 4, BinXmlValueType.Int32Type);
    entry.dataBytes = Buffer.alloc(4);
    entry.dataBytes.writeInt32LE(1098);
    expect(entry.getDataAsString()).toBe('1098');
  });
});
```

### Integration Tests
```typescript
test('Event ID 1098 extracts AdditionalInformation', async () => {
  const evtxData = await fs.readFile('test_data/event_1098.evtx');
  const parser = new EvtxParser();
  const events = await parser.parseFile(evtxData);
  
  const event1098 = events.find(e => e.eventId === 1098);
  expect(event1098.eventData).toHaveProperty('AdditionalInformation');
  expect(event1098.eventData.AdditionalInformation).toBeTruthy();
});
```

---

## C# Reference Mapping

| C# Class                | Our TypeScript Class      | Purpose                    |
|------------------------|--------------------------|----------------------------|
| TagBuilder             | TokenParser              | Token dispatch             |
| TemplateInstance       | TemplateInstance         | Template + substitution    |
| Template               | Template                 | Template definition        |
| SubstitutionArrayEntry | SubstitutionArrayEntry   | Value conversion           |
| OpenStartElementTag    | OpenStartElementTag      | XML element                |
| NormalSubstitution     | NormalSubstitution       | Value placeholder          |
| IBinXml                | IBinXmlToken             | Base interface             |

---

## Implementation Checklist

### Phase 1
- [ ] Create binary_xml directory structure
- [ ] Implement BinXmlValueType enum
- [ ] Implement SubstitutionArrayEntry class
- [ ] Implement IBinXmlToken interface
- [ ] Implement simple token classes
- [ ] Implement NormalSubstitution
- [ ] Implement TokenParser.buildToken()
- [ ] Unit tests for type conversions

### Phase 2
- [ ] Implement Template class
- [ ] Implement TemplateInstance class
- [ ] Parse substitution array
- [ ] Template caching in chunk
- [ ] AsXml() method
- [ ] Unit tests for templates

### Phase 3
- [ ] Implement OpenStartElementTag
- [ ] Implement AttributeToken
- [ ] Implement ValueToken
- [ ] Implement OptionalSubstitution
- [ ] String table integration
- [ ] XML escaping
- [ ] Unit tests for elements

### Phase 4
- [ ] Implement BinaryXmlParser main class
- [ ] Modify parseByHeuristics() in evtx_parser.ts
- [ ] Integration tests
- [ ] Test with Event ID 1098
- [ ] Verify vs Windows Event Viewer
- [ ] Error handling

### Phase 5
- [ ] Handle nested BinXML
- [ ] Memory optimization
- [ ] Performance benchmarks
- [ ] Comprehensive tests
- [ ] Documentation
- [ ] Code review

---

## Success Criteria

✅ Event ID 1098 shows all EventData fields
✅ AdditionalInformation matches Windows Event Viewer
✅ No regressions in existing parsing
✅ Parsing speed > 5MB/sec
✅ Memory usage < 100MB overhead
✅ 90%+ test coverage

---

## Risk Mitigation

**High Risk: Template cycles**
- Track visited templates
- Limit depth to 5 levels

**High Risk: Large events**
- Stream XML generation
- Truncate > 2MB with warning

**Medium Risk: Unknown tokens**
- Log and skip gracefully
- Return partial XML

---

## Next Steps

1. Review this plan
2. Approve/adjust scope
3. Set up directory structure
4. Start Phase 1 implementation
5. Weekly progress reviews

---

**Document Version**: 1.0
**Last Updated**: October 3, 2025
**Status**: Ready for Implementation
