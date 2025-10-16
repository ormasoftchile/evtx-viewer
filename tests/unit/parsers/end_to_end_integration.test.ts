/**
 * @file End-to-End Binary XML Integration Tests
 * @description Tests for complete EVTX → Binary XML → Enhanced EventData workflow
 */

import { EventExtractor } from '../../../src/parsers/core/event_extractor';
import { EvtxParser } from '../../../src/parsers/core/evtx_parser';

describe('EndToEndBinaryXmlIntegration', () => {
  describe('Complete EVTX Processing Workflow', () => {
    it('should handle EVTX parsing workflow with Binary XML enhancement', async () => {
      // Simulate a complete EventRecord from EVTX parsing
      const xmlString = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Microsoft-Windows-Security-Auditing" Guid="{54849625-5478-4994-a5ba-3e3b0328c30d}"/>
    <EventID>4624</EventID>
    <Version>2</Version>
    <Level>0</Level>
    <Task>12544</Task>
    <Opcode>0</Opcode>
    <Keywords>0x8020000000000000</Keywords>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>12345</EventRecordID>
    <Correlation ActivityID="{A6F86B95-E8E3-4D50-9F3A-BBBF5B5F5AAA}"/>
    <Execution ProcessID="516" ThreadID="640"/>
    <Channel>Security</Channel>
    <Computer>WIN-SERVER-01</Computer>
    <Security/>
  </System>
  <EventData>
    <Data Name="SubjectUserSid">S-1-5-21-1234567890-987654321-1111111111-500</Data>
    <Data Name="SubjectUserName">Administrator</Data>
    <Data Name="SubjectDomainName">WIN-SERVER-01</Data>
    <Data Name="SubjectLogonId">0x3e7</Data>
    <Data Name="TargetUserSid">S-1-5-21-1234567890-987654321-1111111111-1001</Data>
    <Data Name="TargetUserName">testuser</Data>
    <Data Name="TargetDomainName">WIN-SERVER-01</Data>
    <Data Name="TargetLogonId">0x12345678</Data>
    <Data Name="LogonType">2</Data>
    <Data Name="LogonProcessName">User32</Data>
    <Data Name="AuthenticationPackageName">Negotiate</Data>
    <Data Name="WorkstationName">WIN-CLIENT-01</Data>
    <Data Name="LogonGuid">{12345678-1234-5678-9012-123456789ABC}</Data>
    <Data Name="TransmittedServices">-</Data>
    <Data Name="LmPackageName">-</Data>
    <Data Name="KeyLength">0</Data>
    <Data Name="ProcessId">0x1234</Data>
    <Data Name="ProcessName">C:\\Windows\\System32\\winlogon.exe</Data>
    <Data Name="IpAddress">192.168.1.100</Data>
    <Data Name="IpPort">12345</Data>
    <Data Name="ImpersonationLevel">%%1833</Data>
    <Data Name="RestrictedAdminMode">-</Data>
    <Data Name="TargetOutboundUserName">-</Data>
    <Data Name="TargetOutboundDomainName">-</Data>
    <Data Name="VirtualAccount">%%1843</Data>
    <Data Name="TargetLinkedLogonId">0x0</Data>
    <Data Name="ElevatedToken">%%1842</Data>
  </EventData>
</Event>`;

      // Test 1: Basic EventRecord creation from XML
      const eventRecord = EventExtractor.xmlToEventRecord(xmlString, BigInt(12345));
      
      expect(eventRecord).not.toBeNull();
      expect(eventRecord!.eventId).toBe(4624);
      expect(eventRecord!.provider).toBe('Microsoft-Windows-Security-Auditing');
      expect(eventRecord!.computer).toBe('WIN-SERVER-01');
      expect(eventRecord!.channel).toBe('Security');

      // Test 2: EventData extraction with all fields
      expect(eventRecord!.eventData).toBeDefined();
      expect(eventRecord!.eventData!.SubjectUserName).toBe('Administrator');
      expect(eventRecord!.eventData!.TargetUserName).toBe('testuser');
      expect(eventRecord!.eventData!.LogonType).toBe(2); // Numbers are converted from XML
      expect(eventRecord!.eventData!.WorkstationName).toBe('WIN-CLIENT-01');
      expect(eventRecord!.eventData!.IpAddress).toBe('192.168.1.100');

      // Test 3: Enhanced extraction with Binary XML enabled
      const extracted = EventExtractor.extractEventData(eventRecord!, {
        enableBinaryXml: true,
        includeBinaryXmlDebug: true,
        includeRawXml: true
      });

      expect(extracted.core.eventId).toBe(4624);
      expect(extracted.core.provider).toBe('Microsoft-Windows-Security-Auditing');
      expect(extracted.eventData).toBeDefined();
      
      // Verify all critical fields are preserved
      expect(extracted.eventData!.SubjectUserName).toBe('Administrator');
      expect(extracted.eventData!.TargetUserName).toBe('testuser');
      expect(extracted.eventData!.LogonType).toBe(2); // Numbers are converted from XML
      expect(extracted.eventData!.WorkstationName).toBe('WIN-CLIENT-01');
      expect(extracted.eventData!.IpAddress).toBe('192.168.1.100');
      expect(extracted.eventData!.ProcessName).toBe('C:\\Windows\\System32\\winlogon.exe');

      // Test 4: System information extraction
      expect(extracted.system).toBeDefined();
      expect(extracted.system!.processId).toBe(516);
      expect(extracted.system!.threadId).toBe(640);

      // Test 5: Correlation information
      expect(extracted.correlation).toBeDefined();
      expect(extracted.correlation!.activityId).toBe('{A6F86B95-E8E3-4D50-9F3A-BBBF5B5F5AAA}');

      // Test 6: Raw XML preservation when requested
      expect(extracted.rawXml).toBeDefined();
      expect(extracted.rawXml).toContain('Microsoft-Windows-Security-Auditing');
    });

    it('should handle complex event data with various field types', async () => {
      const complexXmlString = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Microsoft-Windows-Kernel-General" Guid="{A68CA8B7-004F-D7B6-A698-07E2DE0F1F5D}"/>
    <EventID>12</EventID>
    <Version>2</Version>
    <Level>4</Level>
    <Task>0</Task>
    <Opcode>0</Opcode>
    <Keywords>0x8000000000000000</Keywords>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>98765</EventRecordID>
    <Correlation/>
    <Execution ProcessID="4" ThreadID="8"/>
    <Channel>System</Channel>
    <Computer>TEST-MACHINE</Computer>
    <Security/>
  </System>
  <EventData>
    <Data Name="ProcessName">test.exe</Data>
    <Data Name="ImagePath">C:\\test\\test.exe</Data>
    <Data Name="CommandLine">test.exe --verbose --config config.json</Data>
    <Data Name="ProcessId">1234</Data>
    <Data Name="ParentProcessId">567</Data>
    <Data Name="SessionId">1</Data>
    <Data Name="IntegrityLevel">0x2000</Data>
    <Data Name="TokenElevationType">1</Data>
    <Data Name="CreationUtcTime">2024-01-15 10:30:00.123</Data>
    <Data Name="AdditionalInformation">This field often goes missing in traditional parsing</Data>
  </EventData>
</Event>`;

      const eventRecord = EventExtractor.xmlToEventRecord(complexXmlString, BigInt(98765));
      
      expect(eventRecord).not.toBeNull();
      expect(eventRecord!.eventId).toBe(12);

      // Extract with Binary XML enhancement
      const extracted = EventExtractor.extractEventData(eventRecord!, {
        enableBinaryXml: true,
        includeBinaryXmlDebug: false
      });

      expect(extracted.core.eventId).toBe(12);
      expect(extracted.eventData).toBeDefined();
      
      // Verify all fields including potentially missing ones
      expect(extracted.eventData!.ProcessName).toBe('test.exe');
      expect(extracted.eventData!.ImagePath).toBe('C:\\test\\test.exe');
      expect(extracted.eventData!.CommandLine).toBe('test.exe --verbose --config config.json');
      expect(extracted.eventData!.ProcessId).toBe(1234); // Numbers are converted from XML
      expect(extracted.eventData!.ParentProcessId).toBe(567); // Numbers are converted from XML
      expect(extracted.eventData!.AdditionalInformation).toBe('This field often goes missing in traditional parsing');
    });

    it('should demonstrate performance within constitutional limits', async () => {
      // Test processing multiple events to ensure performance requirements
      const events: any[] = [];
      
      const baseXml = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Test-Provider"/>
    <EventID>1001</EventID>
    <Level>4</Level>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>{{RECORD_ID}}</EventRecordID>
    <Channel>Application</Channel>
    <Computer>PERF-TEST</Computer>
  </System>
  <EventData>
    <Data Name="Field1">value1</Data>
    <Data Name="Field2">value2</Data>
    <Data Name="Field3">value3</Data>
  </EventData>
</Event>`;

      const startTime = performance.now();
      
      // Process 100 events
      for (let i = 0; i < 100; i++) {
        const xmlString = baseXml.replace('{{RECORD_ID}}', (1000 + i).toString());
        const eventRecord = EventExtractor.xmlToEventRecord(xmlString, BigInt(1000 + i));
        
        if (eventRecord) {
          const extracted = EventExtractor.extractEventData(eventRecord, {
            enableBinaryXml: true
          });
          events.push(extracted);
        }
      }
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(events).toHaveLength(100);
      expect(processingTime).toBeLessThan(1000); // Should process 100 events in under 1 second
      
      // Verify all events were processed correctly
      events.forEach((extracted, index) => {
        expect(extracted.core.eventId).toBe(1001);
        expect(extracted.core.eventRecordId).toBe((1000 + index).toString());
        expect(extracted.eventData!.Field1).toBe('value1');
      });
    });

    it('should handle edge cases gracefully', async () => {
      // Test with minimal event
      const minimalXml = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Minimal-Provider"/>
    <EventID>1</EventID>
    <Level>4</Level>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>1</EventRecordID>
    <Channel>System</Channel>
    <Computer>MINIMAL</Computer>
  </System>
</Event>`;

      const eventRecord = EventExtractor.xmlToEventRecord(minimalXml, BigInt(1));
      const extracted = EventExtractor.extractEventData(eventRecord!, {
        enableBinaryXml: true
      });

      expect(extracted.core.eventId).toBe(1);
      // Even without EventData section, System fields are extracted
      expect(extracted.eventData).toBeDefined();
      expect(extracted.eventData?.EventID).toBe(1);
      expect(extracted.eventData?.Channel).toBe('System');

      // Test with malformed data (should not crash)
      const malformedXml = `<?xml version="1.0" encoding="utf-8"?>
<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="Malformed-Provider"/>
    <EventID>999</EventID>
    <Level>4</Level>
    <TimeCreated SystemTime="2024-01-15T10:30:00.000000000Z"/>
    <EventRecordID>999</EventRecordID>
    <Channel>System</Channel>
    <Computer>MALFORMED</Computer>
  </System>
  <EventData>
    <Data Name="IncompleteField">`;

      const malformedRecord = EventExtractor.xmlToEventRecord(malformedXml, BigInt(999));
      
      // Should not crash and should handle gracefully
      if (malformedRecord) {
        const malformedExtracted = EventExtractor.extractEventData(malformedRecord, {
          enableBinaryXml: true
        });
        expect(malformedExtracted.core.eventId).toBe(999);
      }
    });
  });
});