// Ported from the Rust project "evtx" by Omer Ben-Amram and contributors.
// SPDX-License-Identifier: MIT
// © 2025 Cristian Ormazábal (translation); original authors retain their copyrights.
/**
 * Template definition for Binary XML parsing
 *
 * Templates define the structure of XML elements with placeholders
 * for substitution values. They are reusable across multiple records.
 */

import { BinXmlTokenType } from './value_types';
import {
  IBinXmlToken,
  ChunkInfo,
  SubstitutionArrayEntry,
  Template as ITemplate,
} from './tokens/base';

/**
 * Represents a template definition that can be applied with substitutions
 * Templates define the XML structure with placeholders for dynamic content
 */
export class Template implements ITemplate {
  public readonly id: number;
  public readonly rootToken: IBinXmlToken;

  /**
   * Additional metadata about the template
   */
  public readonly nextTemplateOffset: number;
  public readonly templateInstanceGuid: Buffer;
  public readonly dataLength: number;

  constructor(
    id: number,
    rootToken: IBinXmlToken,
    nextTemplateOffset: number = 0,
    templateInstanceGuid: Buffer = Buffer.alloc(16),
    dataLength: number = 0
  ) {
    this.id = id;
    this.rootToken = rootToken;
    this.nextTemplateOffset = nextTemplateOffset;
    this.templateInstanceGuid = templateInstanceGuid;
    this.dataLength = dataLength;
  }

  /**
   * Convert template to XML using provided substitutions
   * @param substitutions Array of substitution values
   * @returns XML string representation
   */
  public asXml(_substitutions: SubstitutionArrayEntry[]): string {
    // Create a dummy ChunkInfo for the template conversion
    // In practice, this would be provided by the parser
    const dummyChunkInfo: ChunkInfo = {
      templates: new Map(),
      stringTable: new Map(),
      getTemplate: () => undefined,
      getString: () => undefined,
    };

    return this.rootToken.asXml(_substitutions, dummyChunkInfo);
  }

  /**
   * Get debug information about this template
   */
  public toString(): string {
    return `Template[${this.id}] (dataLength: ${this.dataLength}, nextOffset: ${this.nextTemplateOffset})`;
  }

  /**
   * Parse a template definition from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @param chunkInfo Chunk information for parsing child tokens
   * @returns New template and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number,
    _chunkInfo: ChunkInfo
  ): { template: Template; nextOffset: number } {
    if (offset + 24 > buffer.length) {
      throw new Error(`Buffer too small for Template header at offset ${offset}`);
    }

    // Parse template header:
    // Bytes 0-3: Next template offset
    // Bytes 4-7: Template ID
    // Bytes 8-23: Template instance GUID (16 bytes)
    // Bytes 24-27: Data length
    const nextTemplateOffset = buffer.readUInt32LE(offset);
    const templateId = buffer.readUInt32LE(offset + 4);
    const templateInstanceGuid = buffer.slice(offset + 8, offset + 24);
    const dataLength = buffer.readUInt32LE(offset + 24);

    // Parse the root token that follows
    const tokenOffset = offset + 28;
    if (tokenOffset >= buffer.length) {
      throw new Error(`Buffer too small for Template token at offset ${tokenOffset}`);
    }

    // For now, create a placeholder token - in a full implementation,
    // we would parse the actual token structure
    const rootToken = new PlaceholderToken();

    const template = new Template(
      templateId,
      rootToken,
      nextTemplateOffset,
      templateInstanceGuid,
      dataLength
    );

    return {
      template,
      nextOffset: tokenOffset + dataLength,
    };
  }

  /**
   * Check if this template is valid
   */
  public isValid(): boolean {
    return this.id >= 0 && this.rootToken !== null && this.dataLength >= 0;
  }

  /**
   * Get the GUID as a formatted string
   */
  public getGuidString(): string {
    if (this.templateInstanceGuid.length !== 16) {
      return 'Invalid GUID';
    }

    const hex = this.templateInstanceGuid.toString('hex').toUpperCase();
    return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`;
  }
}

/**
 * Template cache for efficient template lookup and reuse
 */
export class TemplateCache {
  private templates: Map<number, Template> = new Map();

  /**
   * Add a template to the cache
   * @param template The template to cache
   */
  public addTemplate(template: Template): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get a template by ID
   * @param templateId The template identifier
   * @returns The template or undefined if not found
   */
  public getTemplate(templateId: number): Template | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Check if a template exists
   * @param templateId The template identifier
   * @returns true if template exists
   */
  public hasTemplate(templateId: number): boolean {
    return this.templates.has(templateId);
  }

  /**
   * Get all template IDs
   * @returns Array of template IDs
   */
  public getTemplateIds(): number[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get number of cached templates
   * @returns Template count
   */
  public size(): number {
    return this.templates.size;
  }

  /**
   * Clear all cached templates
   */
  public clear(): void {
    this.templates.clear();
  }

  /**
   * Remove a specific template
   * @param templateId The template identifier to remove
   * @returns true if template was removed
   */
  public removeTemplate(templateId: number): boolean {
    return this.templates.delete(templateId);
  }

  /**
   * Get debug information about cached templates
   */
  public toString(): string {
    const ids = this.getTemplateIds().sort((a, b) => a - b);
    return `TemplateCache(${this.size()} templates: [${ids.join(', ')}])`;
  }
}

/**
 * Placeholder token for template parsing
 * Used when the actual token parsing is not yet implemented
 */
class PlaceholderToken implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.ValueToken;

  public asXml(_substitutions: SubstitutionArrayEntry[], _chunkInfo: ChunkInfo): string {
    return '[Template Content]';
  }

  public toString(): string {
    return 'PlaceholderToken';
  }
}
