/**
 * @file Binary XML Integration Tests
 * @description Tests for Binary XML parser integration with EVTX EventExtractor
 */

import { EventExtractor } from '../../../src/parsers/core/event_extractor';

describe('BinaryXmlIntegration', () => {
  describe('EventExtractor with Binary XML enhancement', () => {
    it('should extract basic EventData from XML', () => {
      // Simple test to verify the enhanced EventExtractor works
      const xmlString = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Microsoft-Windows-Kernel-General"/>
    <EventID>12</EventID>
    <Level>4</Level>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>12345</EventRecordID>
    <Channel>System</Channel>
    <Computer>TEST-MACHINE</Computer>
  </System>
  <EventData>
    <Data Name="ProcessName">test.exe</Data>
    <Data Name="ImagePath">C:\\test\\test.exe</Data>
  </EventData>
</Event>`;

      // Create EventRecord using the xmlToEventRecord method
      const eventRecord = EventExtractor.xmlToEventRecord(xmlString, BigInt(12345));
      
      expect(eventRecord).not.toBeNull();
      expect(eventRecord!.eventId).toBe(12);
      expect(eventRecord!.computer).toBe('TEST-MACHINE');
      expect(eventRecord!.eventData).toBeDefined();
      
      // Basic EventData should be extracted
      expect(eventRecord!.eventData!.ProcessName).toBe('test.exe');
      expect(eventRecord!.eventData!.ImagePath).toBe('C:\\test\\test.exe');
    });

    it('should extract data with Binary XML options enabled', () => {
      const xmlString = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Test-Provider"/>
    <EventID>1001</EventID>
    <Level>4</Level>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>54321</EventRecordID>
    <Channel>Application</Channel>
    <Computer>TEST-PC</Computer>
  </System>
  <EventData>
    <Data Name="Field1">value1</Data>
    <Data Name="Field2">value2</Data>
  </EventData>
</Event>`;

      const eventRecord = EventExtractor.xmlToEventRecord(xmlString, BigInt(54321));
      
      // Extract with Binary XML enabled (default)
      const extractedWithBinaryXml = EventExtractor.extractEventData(eventRecord!, {
        enableBinaryXml: true,
        includeBinaryXmlDebug: false
      });

      expect(extractedWithBinaryXml.core.eventId).toBe(1001);
      expect(extractedWithBinaryXml.eventData).toBeDefined();
      expect(extractedWithBinaryXml.eventData!.Field1).toBe('value1');
      expect(extractedWithBinaryXml.eventData!.Field2).toBe('value2');
    });

    it('should complete extraction in reasonable time', () => {
      const xmlString = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Performance-Provider"/>
    <EventID>5001</EventID>
    <Level>4</Level>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>33333</EventRecordID>
    <Channel>Application</Channel>
    <Computer>PERF-PC</Computer>
  </System>
  <EventData>
    <Data Name="PerfField1">perfValue1</Data>
  </EventData>
</Event>`;

      const eventRecord = EventExtractor.xmlToEventRecord(xmlString, BigInt(33333));
      
      const startTime = performance.now();
      const extracted = EventExtractor.extractEventData(eventRecord!, {
        enableBinaryXml: true
      });
      const endTime = performance.now();

      expect(extracted.core.eventId).toBe(5001);
      expect(extracted.eventData!.PerfField1).toBe('perfValue1');
      
      // Should complete in reasonable time (less than 100ms for simple extraction)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle events without EventData', () => {
      const xmlString = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="No-EventData-Provider"/>
    <EventID>4001</EventID>
    <Level>1</Level>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>22222</EventRecordID>
    <Channel>System</Channel>
    <Computer>MINIMAL-PC</Computer>
  </System>
</Event>`;

      const eventRecord = EventExtractor.xmlToEventRecord(xmlString, BigInt(22222));
      
      const extracted = EventExtractor.extractEventData(eventRecord!, {
        enableBinaryXml: true
      });

      expect(extracted.core.eventId).toBe(4001);
      // Even without EventData section, System fields are extracted
      expect(extracted.eventData).toBeDefined();
      expect(extracted.eventData?.EventID).toBe(4001);
      expect(extracted.eventData?.Channel).toBe('System');
    });
  });
});