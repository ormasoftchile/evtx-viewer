const { EvtxParser } = require('./out/src/parsers/core/evtx_parser');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file');

async function test() {
  try {
    console.log('🧪 Testing evtx-ts integration...');
    const mockFilePath = '/dev/null';
    const mockFile = new EvtxFile(mockFilePath);
    
    console.log('🔍 Calling EvtxParser.parseFile with useEvtxTs: true');
    const events = await EvtxParser.parseFile(mockFile, { 
      useEvtxTs: true, 
      maxEvents: 1,
      validateChecksums: false
    });
    
    console.log('✅ SUCCESS: evtx-ts integration works!');
    console.log('📊 Results:');
    console.log('  - Event count:', events.length);
    
    if (events.length > 0) {
      const event = events[0];
      console.log('  - Event ID:', event.eventId);
      console.log('  - Provider:', event.provider);
      console.log('  - EventData keys:', Object.keys(event.eventData || {}));
      const hasAdditionalInfo = !!(event.eventData && event.eventData.AdditionalInformation);
      console.log('  - Has AdditionalInformation:', hasAdditionalInfo);
      
      if (hasAdditionalInfo) {
        const info = event.eventData.AdditionalInformation;
        console.log('🎉 AdditionalInformation found:');
        console.log('   ', info.substring(0, 200) + '...');
      }
    }
  } catch (error) {
    console.log('❌ FAILED: evtx-ts integration error:', error.message);
    console.log('Stack:', error.stack);
  }
}

test();
