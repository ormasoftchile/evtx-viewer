const { EvtxParser } = require('./out/src/parsers/core/evtx_parser');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file');

async function test() {
    console.log('Testing VS Code Extension Integration with evtx-ts parser...\n');
    
    const testFilePath = 'tests/test_data/sample.evtx';
    const evtxFile = new EvtxFile(testFilePath);
    
    console.log('Calling EvtxParser.parseFile (as extension does)...');
    const events = await EvtxParser.parseFile(evtxFile, { maxEvents: 5 });
    
    console.log(`\n✅ Extension returned ${events.length} events\n`);
    
    if (events.length > 0) {
        const firstEvent = events[0];
        console.log('First Event from Extension:');
        console.log('- Record ID:', firstEvent.eventRecordId);
        console.log('- Event ID:', firstEvent.eventId);
        console.log('- Timestamp:', firstEvent.timestamp);
        console.log('- Computer:', firstEvent.computer?.trim());
        console.log('- Channel:', firstEvent.channel?.trim());
        console.log('- EventData fields:', Object.keys(firstEvent.eventData || {}).length);
        
        if (firstEvent.eventData && Object.keys(firstEvent.eventData).length > 0) {
            console.log('\n📋 EventData from Extension:');
            for (const [key, value] of Object.entries(firstEvent.eventData)) {
                const displayValue = String(value).length > 100 ? String(value).substring(0, 100) + '...' : value;
                console.log(`  ✓ ${key}: ${displayValue}`);
            }
            
            // The key test - AdditionalInformation field
            if (firstEvent.eventData.AdditionalInformation) {
                console.log('\n🎯 SUCCESS! Extension now extracts AdditionalInformation field!');
                console.log('Content:', firstEvent.eventData.AdditionalInformation);
            } else {
                console.log('\n❌ FAILED: AdditionalInformation still missing');
            }
        } else {
            console.log('\n⚠️ WARNING: No EventData extracted by extension');
        }
    }
    
    // Clean up
    if (evtxFile.fileHandle) {
        await evtxFile.fileHandle.close();
    }
}

test().catch(console.error);
