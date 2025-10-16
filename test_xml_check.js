const { EvtxParser } = require('./out/src/parsers/evtx-ts/evtx_parser');
const fs = require('fs');

const buffer = fs.readFileSync('tests/test_data/sample.evtx');
const result = EvtxParser.from_buffer(buffer);

if (result.kind === 'ok') {
    const parser = result.value;
    let count = 0;
    for (const recordResult of parser.records()) {
        if (count >= 1) break;
        if (recordResult.kind === 'ok') {
            const xml = recordResult.value.data;
            console.log('=== RAW XML ===');
            console.log(xml.substring(0, 2000));
            console.log('\n=== EventData Section ===');
            const match = xml.match(/<EventData>(.*?)<\/EventData>/s);
            if (match) {
                console.log(match[1]);
                console.log('\n=== Hex Dump of first Data field ===');
                const dataMatch = match[1].match(/<Data Name="([^"]+)">([^<]*)<\/Data>/);
                if (dataMatch) {
                    console.log('Field:', dataMatch[1]);
                    console.log('Value:', dataMatch[2]);
                    console.log('Hex:', Buffer.from(dataMatch[2]).toString('hex'));
                }
            }
        }
        count++;
    }
}
