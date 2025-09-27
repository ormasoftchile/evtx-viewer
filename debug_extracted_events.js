const { EvtxParser } = require('./out/src/parsers/core/evtx_parser');
const { EventExtractor } = require('./out/src/parsers/core/event_extractor');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file');
const fs = require('fs');

async function debugExtractedEvents() {
  console.log('Testing EventExtractor output format...\n');
  
  const buffer = fs.readFileSync('./tests/test_data/sample.evtx');
  const evtxFile = new EvtxFile('./tests/test_data/sample.evtx', buffer);
  
  // Parse to get EventRecord objects
  const eventRecords = await EvtxParser.parseFile(evtxFile, {
    maxEvents: 2, // Just test first 2 events
    includeRawXml: false
  });
  
  console.log('EventRecord objects from parser:');
  eventRecords.forEach((record, i) => {
    console.log(`Event ${i + 1}:`, {
      eventId: record.eventId,
      level: record.level,
      levelType: typeof record.level,
      provider: record.provider
    });
  });
  
  console.log('\n--- EXTRACTION ---\n');
  
  // Extract to get ExtractedEventData objects
  const extractionResult = EventExtractor.extractBatch(eventRecords, {
    includeRawXml: false,
    maxDepth: 5,
    fieldMappings: EventExtractor.createStandardFieldMapping(),
    typeConversions: EventExtractor.createStandardTypeConversions(),
  });
  
  console.log('ExtractedEventData objects from EventExtractor:');
  extractionResult.data.forEach((extracted, i) => {
    console.log(`Extracted Event ${i + 1}:`, {
      'core.eventId': extracted.core?.eventId,
      'core.level': extracted.core?.level,
      'core.levelType': typeof extracted.core?.level,
      'core.provider': extracted.core?.provider,
      'core.message': extracted.core?.message,
      'hasCore': !!extracted.core,
      'fullCoreObject': extracted.core
    });
  });
  
  console.log('\nJSON serialization test:');
  const serialized = JSON.stringify(extractionResult.data[0]);
  const deserialized = JSON.parse(serialized);
  console.log('After JSON.stringify + JSON.parse:');
  console.log('core.level:', deserialized.core?.level, 'type:', typeof deserialized.core?.level);
}

debugExtractedEvents().catch(console.error);