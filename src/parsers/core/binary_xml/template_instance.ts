/**
 * Template Instance for Binary XML parsing
 *
 * Represents a specific instance of a template with actual substitution data.
 * This is the critical component that combines templates with substitution arrays.
 */

import { BinXmlTokenType } from './value_types';
import { IBinXmlToken, ChunkInfo, SubstitutionArrayEntry } from './tokens/base';
import { SubstitutionArrayEntry as SubstitutionEntry } from './substitution_entry';
import { Template } from './template';

/**
 * Represents an instance of a template with specific substitution data
 * This is parsed from TemplateInstanceToken (0x0D) in the binary stream
 */
export class TemplateInstance implements IBinXmlToken {
  public readonly tokenType = BinXmlTokenType.TemplateInstanceToken;

  public readonly templateId: number;
  public readonly template: Template | undefined;
  public readonly substitutions: SubstitutionArrayEntry[];
  public readonly dataSize: number;

  constructor(
    templateId: number,
    substitutions: SubstitutionArrayEntry[],
    dataSize: number,
    template?: Template
  ) {
    this.templateId = templateId;
    this.substitutions = substitutions;
    this.dataSize = dataSize;
    this.template = template;
  }

  /**
   * Convert this template instance to XML by applying substitutions to template
   * @param _substitutions Unused - this instance has its own substitutions
   * @param chunkInfo Chunk information for template lookup
   * @returns XML string representation
   */
  public asXml(_substitutions: SubstitutionArrayEntry[], chunkInfo: ChunkInfo): string {
    // Use the template from chunkInfo if we don't have one
    const template = this.template || chunkInfo.getTemplate(this.templateId);

    if (!template) {
      return `[Missing Template ${this.templateId}]`;
    }

    // Apply our substitutions to the template
    try {
      return template.asXml(this.substitutions);
    } catch (error) {
      return `[Template Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  /**
   * Get debug information about this template instance
   */
  public toString(): string {
    return `TemplateInstance[${this.templateId}] (${this.substitutions.length} substitutions, ${this.dataSize} bytes)`;
  }

  /**
   * Check if this template instance is valid
   */
  public isValid(): boolean {
    return this.templateId >= 0 && this.substitutions.length >= 0 && this.dataSize >= 0;
  }

  /**
   * Get a substitution by index
   * @param index The substitution index
   * @returns The substitution entry or undefined
   */
  public getSubstitution(index: number): SubstitutionArrayEntry | undefined {
    if (index >= 0 && index < this.substitutions.length) {
      return this.substitutions[index];
    }
    return undefined;
  }

  /**
   * Parse a TemplateInstance from buffer
   * @param buffer The buffer containing binary data
   * @param offset Current offset in buffer
   * @param chunkInfo Chunk information for template lookup
   * @returns New template instance and next offset
   */
  public static parse(
    buffer: Buffer,
    offset: number,
    chunkInfo: ChunkInfo
  ): { instance: TemplateInstance; nextOffset: number } {
    if (offset + 10 > buffer.length) {
      throw new Error(`Buffer too small for TemplateInstance header at offset ${offset}`);
    }

    // Parse template instance header:
    // Bytes 0-3: Template ID
    // Bytes 4-7: Substitution array offset (relative to start of this token)
    // Bytes 8-9: Number of substitutions
    const templateId = buffer.readUInt32LE(offset);
    const substitutionArrayOffset = buffer.readUInt32LE(offset + 4);
    const substitutionCount = buffer.readUInt16LE(offset + 8);

    // Calculate absolute offset for substitution array
    const absoluteSubstitutionOffset = offset + substitutionArrayOffset;

    if (absoluteSubstitutionOffset > buffer.length) {
      throw new Error(`Substitution array offset out of bounds: ${absoluteSubstitutionOffset}`);
    }

    // Parse substitution array
    let substitutions: SubstitutionArrayEntry[] = [];
    try {
      substitutions = SubstitutionEntry.parseArray(
        buffer,
        absoluteSubstitutionOffset,
        substitutionCount
      );
    } catch (error) {
      console.warn(`Failed to parse substitution array: ${error}`);
    }

    // Calculate total data size
    const headerSize = 10;
    const lastSubstitution =
      substitutions.length > 0 ? substitutions[substitutions.length - 1] : null;
    const dataSize = substitutionArrayOffset + (lastSubstitution ? lastSubstitution.size + 4 : 0);

    // Try to get the template from chunk info (cast to our Template class)
    const template = chunkInfo.getTemplate(templateId) as Template | undefined;

    const instance = new TemplateInstance(templateId, substitutions, dataSize, template);

    return {
      instance,
      nextOffset: offset + Math.max(headerSize, dataSize),
    };
  }

  /**
   * Create a template instance with typed substitution entries
   * @param templateId The template identifier
   * @param substitutionData Array of {type, data} objects
   * @param template Optional template reference
   * @returns New TemplateInstance
   */
  public static create(
    templateId: number,
    substitutionData: Array<{ type: number; data: Buffer }>,
    template?: Template
  ): TemplateInstance {
    const substitutions = substitutionData.map(
      (sub, index) => new SubstitutionEntry(index, sub.data.length, sub.type, sub.data)
    );

    const dataSize = substitutions.reduce((total, sub) => total + sub.size + 4, 10);

    return new TemplateInstance(templateId, substitutions, dataSize, template);
  }

  /**
   * Export substitution data for debugging
   */
  public exportSubstitutions(): Array<{
    index: number;
    type: string;
    value: string;
    size: number;
  }> {
    return this.substitutions.map((sub) => ({
      index: sub.position,
      type: `0x${sub.valueType.toString(16).toUpperCase()}`,
      value: sub.getDataAsString(),
      size: sub.size,
    }));
  }
}
