const { EvtxTsAdapter } = require('./out/src/parsers/evtx-ts-adapter');

async function test() {
    console.log('Testing REAL evtx-ts parser...\n');
    
    const testFile = 'tests/test_data/sample.evtx';
    const events = await EvtxTsAdapter.parseFile(testFile, 5);
    
    console.log(`\n✅ Parsed ${events.length} events\n`);
    
    if (events.length > 0) {
        const firstEvent = events[0];
        console.log('First Event:');
        console.log('- Record ID:', firstEvent.eventRecordId);
        console.log('- Event ID:', firstEvent.eventId);
        console.log('- Timestamp:', firstEvent.timestamp);
        console.log('- Computer:', firstEvent.computer?.trim());
        console.log('- Channel:', firstEvent.channel?.trim());
        console.log('- Provider:', firstEvent.provider);
        console.log('- EventData fields:', Object.keys(firstEvent.eventData || {}).length);
        
        if (firstEvent.eventData && Object.keys(firstEvent.eventData).length > 0) {
            console.log('\n📋 EventData Contents:');
            for (const [key, value] of Object.entries(firstEvent.eventData)) {
                const displayValue = String(value).length > 100 ? String(value).substring(0, 100) + '...' : value;
                console.log(`  - ${key}: ${displayValue}`);
            }
            
            // Check for AdditionalInformation specifically
            if (firstEvent.eventData.AdditionalInformation) {
                console.log('\n🎯 SUCCESS! AdditionalInformation field extracted:');
                const additionalInfo = firstEvent.eventData.AdditionalInformation;
                const displayInfo = String(additionalInfo).length > 200 ? String(additionalInfo).substring(0, 200) + '...' : additionalInfo;
                console.log(displayInfo);
            }
        } else {
            console.log('\n⚠️  No EventData fields found - checking XML...');
            console.log(firstEvent.xml?.substring(0, 500));
        }
    }
}

test().catch(console.error);
