import { EventRecord, EventRecordData } from './models/event_record';
import { EvtxParser } from './evtx-ts/evtx_parser';
import * as fs from 'fs';

export class EvtxTsAdapter {
  static async parseFile(filePath: string, maxEvents: number = 1000): Promise<EventRecord[]> {
    console.log('🔥 EvtxTsAdapter: Using REAL evtx-ts parser');

    const events: EventRecord[] = [];

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const parserResult = EvtxParser.from_buffer(fileBuffer);

      if (parserResult.kind === 'err') {
        console.error('Failed to create parser:', parserResult.error.message);
        return events;
      }

      const parser = parserResult.value;
      let count = 0;

      for (const recordResult of parser.records()) {
        if (count >= maxEvents) break;

        if (recordResult.kind === 'err') {
          console.error('Error parsing record:', recordResult.error.message);
          continue;
        }

        const record = recordResult.value;
        const eventData: Record<string, any> = {};
        const xml = record.data;

        const eventDataMatch = xml.match(/<EventData>(.*?)<\/EventData>/s);
        if (eventDataMatch) {
          const dataSection = eventDataMatch[1]!;
          const dataFields = dataSection.matchAll(/<Data Name="([^"]+)">([^<]*)<\/Data>/gs);

          for (const match of dataFields) {
            const value = (match[2] || '').trim();
            eventData[match[1]!] = value;
          }
        }

        const data: EventRecordData = {
          eventRecordId: BigInt(record.event_record_id),
          eventId: this.extractEventId(xml),
          level: this.extractLevel(xml),
          timestamp: record.timestamp,
          provider: this.extractProvider(xml),
          channel: this.extractChannel(xml),
          computer: this.extractComputer(xml),
          xml: xml,
          message: this.extractMessage(xml),
          eventData: eventData,
          task: 0,
          opcode: 0,
        };

        events.push(new EventRecord(data));
        count++;
      }

      console.log(`✅ Parsed ${events.length} events with evtx-ts`);
      if (events.length > 0 && events[0]!.eventData) {
        console.log(`🔍 Sample EventData keys: ${Object.keys(events[0]!.eventData).join(', ')}`);
        console.log(
          `✅ AdditionalInformation present: ${!!events[0]!.eventData.AdditionalInformation}`
        );
      }
    } catch (error) {
      console.error('Error in EvtxTsAdapter:', error);
    }

    return events;
  }

  private static extractEventId(xml: string): number {
    const match = xml.match(/<EventID[^>]*>(\d+)<\/EventID>/);
    return match ? parseInt(match[1]!) : 0;
  }

  private static extractLevel(xml: string): number {
    const match = xml.match(/<Level>(\d+)<\/Level>/);
    return match ? parseInt(match[1]!) : 4;
  }

  private static extractProvider(xml: string): string {
    const match = xml.match(/<Provider Name="([^"]+)"/);
    return match ? match[1]! : 'Unknown';
  }

  private static extractChannel(xml: string): string {
    const match = xml.match(/<Channel>([^<]+)<\/Channel>/);
    return match ? match[1]!.trim() : 'Unknown';
  }

  private static extractComputer(xml: string): string {
    const match = xml.match(/<Computer>([^<]+)<\/Computer>/);
    return match ? match[1]!.trim() : 'Unknown';
  }

  private static extractMessage(xml: string): string {
    const match = xml.match(/<Message>([^<]+)<\/Message>/);
    return match ? match[1]! : '';
  }
}
