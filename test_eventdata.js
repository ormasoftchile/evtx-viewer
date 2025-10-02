const { EvtxParser } = require('./out/src/parsers/core/evtx_parser');
const path = require('path');

async function test() {
  console.log('Testing EventData Extraction...\n');
  const file = path.join(__dirname, 'tests', 'test_data', 'sample.evtx');

  try {
    const result = await EvtxParser.parseFile(file);
    console.log(`Events parsed: ${result.events.length}\n`);

    for (let i = 0; i < Math.min(3, result.events.length); i++) {
      const e = result.events[i];
      console.log(`Event ${i + 1}:`);
      console.log(`  ID: ${e.eventId}, Provider: ${e.provider}`);
      console.log(`  Provider GUID: ${e.providerGuid || 'N/A'}`);
      console.log(`  Task Name: ${e.taskName || 'N/A'}`);
      console.log(`  OpCode: ${e.opcodeName || 'N/A'}`);
      console.log(`  Keywords: ${e.keywordsNames?.join(', ') || 'N/A'}`);
      
      if (e.eventData) {
        console.log(`  EventData (${Object.keys(e.eventData).length} fields):`);
        for (const [k, v] of Object.entries(e.eventData)) {
          const val = String(v).length > 100 ? String(v).substring(0, 100) + '...' : v;
          console.log(`    ${k}: ${val}`);
        }
      } else {
        console.log('  EventData: None');
      }
      console.log('');
    }
    console.log('✓ Test completed successfully');
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
}

test();
