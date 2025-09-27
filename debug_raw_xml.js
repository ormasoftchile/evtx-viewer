#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript files
const { EvtxParser } = require('./out/src/parsers/core/evtx_parser.js');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file.js');

async function examineRawXml() {
    try {
        const samplePath = path.join(__dirname, 'tests', 'test_data', 'sample.evtx');
        console.log('Loading sample file:', samplePath);
        
        const buffer = fs.readFileSync(samplePath);
        console.log('File size:', buffer.length, 'bytes');
        
        const evtxFile = new EvtxFile(samplePath);
        
        // Parse with includeRawXml to see the actual XML content
        const eventRecords = await EvtxParser.parseFile(evtxFile, {
            maxEvents: 10,
            includeRawXml: true
        });
        
        console.log(`\nParsed ${eventRecords.length} event records\n`);
        
        // Examine the first event in detail
        for (let i = 0; i < Math.min(5, eventRecords.length); i++) {
            const record = eventRecords[i];
            console.log(`=== EVENT ${i + 1} DETAILS ===`);
            console.log('- Event ID:', record.eventId);
            console.log('- Level:', record.level);
            console.log('- Provider:', record.provider);
            console.log('- Message:', record.message);
            console.log('- Raw XML String:', record.xml ? record.xml.substring(0, 500) + '...' : 'Not available');
            
            if (record.xml) {
                // Look for data elements
                const dataMatches = record.xml.match(/<Data[^>]*>([^<]+)<\/Data>/gi);
                if (dataMatches) {
                    console.log('- Data Elements Found:');
                    dataMatches.forEach((match, idx) => {
                        console.log(`  ${idx + 1}: ${match}`);
                    });
                }
                
                // Look for other potential message sources
                const systemMatches = record.xml.match(/<System[^>]*>.*?<\/System>/is);
                if (systemMatches) {
                    console.log('- System Section Preview:', systemMatches[0].substring(0, 200) + '...');
                }
                
                const eventDataMatches = record.xml.match(/<EventData[^>]*>.*?<\/EventData>/is);
                if (eventDataMatches) {
                    console.log('- EventData Section:', eventDataMatches[0]);
                }
            }
            console.log('\n' + '='.repeat(50) + '\n');
        }
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    }
}

examineRawXml();