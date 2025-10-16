/**
 * Test script to demonstrate the new EvtxRecord extraction
 * Shows comparison between old ExtractedEventData and new EvtxRecord format
 */

import { EventExtractor } from './src/parsers/core/event_extractor';
import { EventRecord } from './src/parsers/models/event_record';
import { extractEventMessage } from './src/shared/utils/evtx_normalizer';

// Create a sample EventRecord for testing
const sampleEventRecord: EventRecord = {
  eventId: 2326069467,
  level: 3,
  provider: 'AAD',
  channel: 'Microsoft-Windows-AAD/Operational',
  timestamp: new Date('2023-10-04T12:34:56.789Z'),
  computer: 'DESKTOP-1D5ALF0',
  eventRecordId: BigInt(1097),
  processId: 1234,
  threadId: 5678,
  userId: 'S-1-5-21-123456789-987654321-111111111-1001',
  eventData: {
    Error: '2326069467',
    ErrorMessage: 'The cache has been partitioned successfully.',
    AdditionalInformation: 'Logged at CachePartitioning.cpp, line: 35, method: CachePartitioning::Apply.'
  },
  xml: `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
    <System>
      <Provider Name="AAD" Guid="{4DE9BC9C-B27A-43C9-8994-0915F1A5E24F}" />
      <EventID>1097</EventID>
      <Version>0</Version>
      <Level>3</Level>
      <Task>0</Task>
      <Opcode>0</Opcode>
      <Keywords>0x8000000000000000</Keywords>
      <TimeCreated SystemTime="2023-10-04T12:34:56.789Z" />
      <EventRecordID>1097</EventRecordID>
      <Correlation />
      <Execution ProcessID="1234" ThreadID="5678" />
      <Channel>Microsoft-Windows-AAD/Operational</Channel>
      <Computer>DESKTOP-1D5ALF0</Computer>
      <Security UserID="S-1-5-21-123456789-987654321-111111111-1001" />
    </System>
    <EventData>
      <Data Name="Error">2326069467</Data>
      <Data Name="ErrorMessage">The cache has been partitioned successfully.</Data>
      <Data Name="AdditionalInformation">Logged at CachePartitioning.cpp, line: 35, method: CachePartitioning::Apply.</Data>
    </EventData>
  </Event>`
};

console.log('🧪 Testing EvtxRecord Extraction vs Old Format');
console.log('=' .repeat(80));

// Test old format
console.log('\n📊 OLD FORMAT (ExtractedEventData):');
const oldFormat = EventExtractor.extractEventData(sampleEventRecord, { 
  enableBinaryXml: true,
  includeRawXml: false
});
console.log('Old Provider:', oldFormat.core.provider);
console.log('Old Event ID:', oldFormat.core.eventId);
console.log('Old Message:', oldFormat.message);
console.log('Old EventData:', oldFormat.eventData);

// Test new format
console.log('\n🎯 NEW FORMAT (EvtxRecord):');
const newFormat = EventExtractor.extractEvtxRecord(sampleEventRecord, {
  enableBinaryXml: true,
  includeRawXml: false
});
console.log('New Provider:', newFormat.Event.System.Provider?.Name);
console.log('New Event ID:', newFormat.Event.System.EventID);
console.log('New Message:', extractEventMessage(newFormat));
console.log('New EventData:', newFormat.Event.EventData);

// Show the structured data elements
if (newFormat.Event.EventData?.Data) {
  console.log('\n📋 Structured Data Elements:');
  const dataElements = Array.isArray(newFormat.Event.EventData.Data) 
    ? newFormat.Event.EventData.Data 
    : [newFormat.Event.EventData.Data];
    
  dataElements.forEach((element, index) => {
    console.log(`  ${index + 1}. ${element['#attributes']?.Name}: ${element['#text']}`);
  });
}

console.log('\n✅ EvtxRecord format test completed!');
console.log('This demonstrates the new standardized format that matches the proven WASM implementation.');