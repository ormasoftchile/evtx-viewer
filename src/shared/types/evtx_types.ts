/**
 * EVTX Record Types
 *
 * Based on proven working implementation from evtx-wasm viewer.
 * These types handle the complete EVTX record structure including EventData.
 */

/**
 * Complete EVTX record structure
 */
export interface EvtxRecord {
  Event: {
    System: EvtxSystemData;
    EventData?: EvtxEventData | null;
    UserData?: unknown;
    RenderingInfo?: unknown;
  };
}

/**
 * System section data - contains core event metadata
 */
export interface EvtxSystemData {
  Provider?: {
    Name?: string;
    Guid?: string;
  };
  /** Fallback for nested attributes structure from Binary XML */
  Provider_attributes?: {
    Name?: string;
    Guid?: string;
  };
  EventID?: number | string;
  Version?: number;
  Level?: number;
  Task?: number;
  Opcode?: number;
  Keywords?: string;
  TimeCreated?: {
    SystemTime?: string;
  };
  /** Fallback for nested attributes structure */
  TimeCreated_attributes?: {
    SystemTime?: string;
  };
  EventRecordID?: number;
  Correlation?: unknown;
  Execution?: {
    ProcessID?: number;
    ThreadID?: number;
  };
  /** Fallback for nested attributes structure */
  Execution_attributes?: {
    ProcessID?: number;
    ThreadID?: number;
  };
  Channel?: string;
  Computer?: string;
  Security?: {
    UserID?: string;
  };
  /** Fallback for nested attributes structure */
  Security_attributes?: {
    UserID?: string;
  };
}

/**
 * EventData section - contains structured event data
 * This is where Error/ErrorMessage/AdditionalInformation fields are found
 */
export interface EvtxEventData {
  /** Can be single DataElement or array */
  Data?: DataElement | DataElement[];
  /** Raw text content */
  '#text'?: string;
  /** Allow additional properties for flexibility */
  [key: string]: unknown;
}

/**
 * Individual data element within EventData
 */
export interface DataElement {
  /** Text content of the data element */
  '#text'?: string;
  /** Attributes including Name field */
  '#attributes'?: {
    Name?: string;
    [key: string]: unknown;
  };
  /** Allow additional properties */
  [key: string]: unknown;
}

/**
 * Parse result containing records and metadata
 */
export interface ParseResult {
  records: EvtxRecord[];
  totalRecords: number;
  errors: string[];
}

/**
 * File information
 */
export interface EvtxFileInfo {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  nextRecordId: string;
  isDirty: boolean;
  isFull: boolean;
  chunks: ChunkInfo[];
}

/**
 * Chunk information
 */
export interface ChunkInfo {
  chunkNumber: number;
  recordCount: string;
  firstRecordId: string;
  lastRecordId: string;
}

/**
 * EVTX Extraction statistics
 */
export interface EvtxExtractionStatistics {
  totalRecords: number;
  successfullyParsed: number;
  parsingErrors: number;
  binaryXmlRecords: number;
  templateCacheHits: number;
  averageParsingTimeMs: number;
}

/**
 * EVTX Extraction options
 */
export interface EvtxExtractionOptions {
  includeRawXml?: boolean;
  includeBinaryXmlDebug?: boolean;
  maxRecords?: number;
  startOffset?: number;
  enableBinaryXml?: boolean;
}
