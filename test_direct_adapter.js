const { EvtxTsAdapter } = require('./out/src/parsers/evtx-ts-adapter');

async function test() {
  try {
    console.log('🧪 Testing EvtxTsAdapter directly...');
    
    const events = await EvtxTsAdapter.parseFile('./tests/test_data/sample.evtx', 3);
    
    console.log('✅ SUCCESS: EvtxTsAdapter works!');
    console.log('📊 Results:');
    console.log('  - Event count:', events.length);
    
    for (let i = 0; i < Math.min(events.length, 3); i++) {
      const event = events[i];
      console.log(`\n  - Event ${i + 1}:`);
      console.log('    - Event ID:', event.eventId);
      console.log('    - Provider:', event.provider);
      console.log('    - Level:', event.level, `(${event.levelText})`);
      console.log('    - EventData keys:', Object.keys(event.eventData || {}));
      const hasAdditionalInfo = !!(event.eventData && event.eventData.AdditionalInformation);
      console.log('    - Has AdditionalInformation:', hasAdditionalInfo);
      
      if (hasAdditionalInfo) {
        const info = event.eventData.AdditionalInformation;
        console.log('🎉 AdditionalInformation found:');
        console.log('     ', info.substring(0, 100) + '...');
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
    console.log('❌ FAILED: EvtxTsAdapter error:', error.message);
    console.log('Stack:', error.stack);
  }
}

test();
