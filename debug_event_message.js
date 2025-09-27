const { EvtxParser } = require('./out/src/parsers/core/evtx_parser');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file');
const fs = require('fs');

async function debugEventMessage() {
  console.log('Testing EventRecord message field...\n');
  
  const buffer = fs.readFileSync('./tests/test_data/sample.evtx');
  const evtxFile = new EvtxFile('./tests/test_data/sample.evtx', buffer);
  
  // Parse to get EventRecord objects
  const eventRecords = await EvtxParser.parseFile(evtxFile, {
    maxEvents: 3, // Just test first 3 events
    includeRawXml: false
  });
  
  console.log('EventRecord message field test:');
  eventRecords.forEach((record, i) => {
    console.log(`Event ${i + 1}:`);
    console.log(`  - Event ID: ${record.eventId}`);
    console.log(`  - Level: ${record.level}`);
    console.log(`  - Provider: ${record.provider}`);
    console.log(`  - Message getter: "${record.message}"`);
    console.log(`  - Message from _data: "${record._data?.message}"`);
    console.log('');
  });
}

debugEventMessage().catch(console.error);