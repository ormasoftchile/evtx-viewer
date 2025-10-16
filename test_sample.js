const { EvtxParser } = require('./out/src/parsers/core/evtx_parser');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file');

async function test() {
  try {
    console.log('🧪 Testing evtx-ts with sample.evtx...');
    const filePath = './tests/test_data/sample.evtx';
    const evtxFile = new EvtxFile(filePath);
    
    console.log('🔍 Calling EvtxParser.parseFile with useEvtxTs: true');
    const events = await EvtxParser.parseFile(evtxFile, { 
      useEvtxTs: true, 
      maxEvents: 3,
      validateChecksums: false
    });
    
    console.log('✅ SUCCESS: evtx-ts integration works with sample.evtx!');
    console.log('📊 Results:');
    console.log('  - Event count:', events.length);
    
    for (let i = 0; i < Math.min(events.length, 3); i++) {
      const event = events[i];
      console.log(`\n  - Event ${i + 1}:`);
      console.log('    - Event ID:', event.eventId);
      console.log('    - Provider:', event.provider);
      console.log('    - EventData keys:', Object.keys(event.eventData || {}));
      const hasAdditionalInfo = !!(event.eventData && event.eventData.AdditionalInformation);
      console.log('    - Has AdditionalInformation:', hasAdditionalInfo);
      
      if (hasAdditionalInfo) {
        const info = event.eventData.AdditionalInformation;
        console.log('🎉 AdditionalInformation found:');
        console.log('     ', info.substring(0, 150) + '...');
      }
      
      // Show all EventData fields
      if (event.eventData) {
        console.log('    - All EventData fields:');
        for (const [key, value] of Object.entries(event.eventData)) {
          const displayValue = typeof value === 'string' && value.length > 50 
            ? value.substring(0, 50) + '...' 
            : value;
          console.log(`      * ${key}: ${displayValue}`);
        }
      }
    }
  } catch (error) {
    console.log('❌ FAILED: evtx-ts integration error:', error.message);
    console.log('Stack:', error.stack);
  }
}

test();
