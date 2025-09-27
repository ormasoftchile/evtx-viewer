#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Import the compiled JavaScript files
const { EvtxParser } = require('./out/src/parsers/core/evtx_parser.js');
const { EventExtractor } = require('./out/src/parsers/core/event_extractor.js');
const { EvtxFile } = require('./out/src/parsers/models/evtx_file.js');

async function debugSample() {
    try {
        const samplePath = path.join(__dirname, 'tests', 'test_data', 'sample.evtx');
        console.log('Loading sample file:', samplePath);
        
        const buffer = fs.readFileSync(samplePath);
        console.log('File size:', buffer.length, 'bytes');
        
        console.log('\n=== PARSING WITH EVTX PARSER ===');
        const evtxFile = new EvtxFile(samplePath);
        const eventRecords = await EvtxParser.parseFile(evtxFile);
        
        console.log(`Parsed ${eventRecords.length} event records`);
        
        // Check the first few events
        for (let i = 0; i < Math.min(3, eventRecords.length); i++) {
            const record = eventRecords[i];
            console.log(`\nEvent ${i + 1}:`);
            console.log('- Event ID:', record.eventId);
            console.log('- Level:', record.level, '(type:', typeof record.level, ')');
            console.log('- Provider:', record.provider);
            console.log('- Computer:', record.computer);
        }
        
        console.log('\n=== EXTRACTING WITH EVENT EXTRACTOR ===');
        const extractionResult = EventExtractor.extractBatch(eventRecords, {
            includeRawXml: false,
            maxDepth: 5,
            fieldMappings: EventExtractor.createStandardFieldMapping(),
            typeConversions: EventExtractor.createStandardTypeConversions(),
        });
        
        console.log(`Extracted ${extractionResult.data.length} events`);
        
        // Check the extracted data
        for (let i = 0; i < Math.min(3, extractionResult.data.length); i++) {
            const extracted = extractionResult.data[i];
            console.log(`\nExtracted Event ${i + 1}:`);
            console.log('- Core Event ID:', extracted.core.eventId);
            console.log('- Core Level:', extracted.core.level, '(type:', typeof extracted.core.level, ')');
            console.log('- Core Provider:', extracted.core.provider);
            console.log('- Core Computer:', extracted.core.computer);
        }
        
        // Count level distribution
        const levelCounts = {};
        extractionResult.data.forEach(event => {
            const level = event.core.level;
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        });
        
        console.log('\nLevel Distribution:', levelCounts);
        
    } catch (error) {
        console.error('Error:', error);
        console.error('Stack:', error.stack);
    }
}

debugSample();