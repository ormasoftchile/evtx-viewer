const { EvtxTsAdapter } = require('./out/src/parsers/evtx-ts-adapter');

async function test() {
    const events = await EvtxTsAdapter.parseFile('tests/test_data/sample.evtx', 1);
    
    if (events.length > 0) {
        const ed = events[0].eventData;
        console.log('EventData fields:');
        for (const [key, value] of Object.entries(ed)) {
            console.log(`\n${key}:`);
            console.log(`  Value: "${value}"`);
            console.log(`  Length: ${value.length}`);
            console.log(`  First char code: ${value.charCodeAt(0)}`);
            console.log(`  Last char code: ${value.charCodeAt(value.length - 1)}`);
        }
    }
}

test().catch(console.error);
