const { EvtxParser } = require('./out/src/parsers/core/evtx_parser');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file');

async function test() {
  try {
    console.log('🧪 Testing evtx-ts with REAL EVTX file...');
    const filePath = './tests/test_data/performance_test.evtx';
    const evtxFile = new EvtxFile(filePath);
    
    console.log('🔍 Calling EvtxParser.parseFile with useEvtxTs: true');
    const events = await EvtxParser.parseFile(evtxFile, { 
      useEvtxTs: true, 
      maxEvents: 5,
      validateChecksums: false
    });
    
    console.log('✅ SUCCESS: evtx-ts integration works with real file!');
    console.log('📊 Results:');
    console.log('  - Event count:', events.length);
    
    for (let i = 0; i < Math.min(events.length, 3); i++) {
      const event = events[i];
      console.log(`  - Event ${i + 1}:`);
      console.log('    - Event ID:', event.eventId);
      console.log('    - Provider:', event.provider);
      console.log('    - EventData keys:', Object.keys(event.eventData || {}));
      const hasAdditionalInfo = !!(event.eventData && event.eventData.AdditionalInformation);
      console.log('    - Has AdditionalInformation:', hasAdditionalInfo);
      
      if (hasAdditionalInfo) {
        const info = event.eventData.AdditionalInformation;
        console.log('🎉 AdditionalInformation found:');
        console.log('     ', info.substring(0, 100) + '...');
      }
    }
  } catch (error) {
    console.log('❌ FAILED: evtx-ts integration error:', error.message);
    console.log('Stack:', error.stack);
  }
}

test();
