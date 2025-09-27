#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript files
const { EvtxParser } = require('./out/src/parsers/core/evtx_parser.js');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file.js');

async function findEvent1098() {
    try {
        const samplePath = path.join(__dirname, 'tests', 'test_data', 'sample.evtx');
        console.log('Looking for Event ID 1098 in:', samplePath);
        
        const evtxFile = new EvtxFile(samplePath);
        
        // Parse all events to find 1098
        const eventRecords = await EvtxParser.parseFile(evtxFile, {
            includeRawXml: true
        });
        
        console.log(`\nFound ${eventRecords.length} total events\n`);
        
        // Find the first 1098 event
        const event1098 = eventRecords.find(record => record.eventId === 1098);
        
        if (event1098) {
            console.log('=== EVENT ID 1098 DETAILS ===');
            console.log('- Event ID:', event1098.eventId);
            console.log('- Level:', event1098.level);
            console.log('- Provider:', event1098.provider);
            console.log('- Message:', event1098.message);
            console.log('- Raw XML:');
            console.log(event1098.xml);
            
            // Look for EventData or UserData sections
            const eventDataMatch = event1098.xml.match(/<EventData[^>]*>.*?<\/EventData>/is);
            const userDataMatch = event1098.xml.match(/<UserData[^>]*>.*?<\/UserData>/is);
            
            if (eventDataMatch) {
                console.log('\n- EventData Section Found:', eventDataMatch[0]);
            } else {
                console.log('\n- No EventData section found');
            }
            
            if (userDataMatch) {
                console.log('\n- UserData Section Found:', userDataMatch[0]);
            } else {
                console.log('\n- No UserData section found');
            }
        } else {
            console.log('No Event ID 1098 found in the file');
        }
        
        // Show event distribution
        const eventIdCounts = {};
        eventRecords.forEach(record => {
            eventIdCounts[record.eventId] = (eventIdCounts[record.eventId] || 0) + 1;
        });
        
        console.log('\n=== EVENT ID DISTRIBUTION ===');
        Object.entries(eventIdCounts).forEach(([eventId, count]) => {
            console.log(`Event ID ${eventId}: ${count} occurrences`);
        });
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    }
}

findEvent1098();