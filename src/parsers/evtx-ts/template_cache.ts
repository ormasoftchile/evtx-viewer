
import { BinXMLTemplateDefinition } from './model/deserialized.js';
import { read_template_definition } from './binxml/tokens.js';

// Type alias for clarity
export type CachedTemplate = BinXMLTemplateDefinition;
export type ChunkOffset = number;

// TypeScript Result type
type Result<T, E = Error> = { kind: 'ok'; value: T } | { kind: 'err'; error: E };

function ok<T>(value: T): Result<T> {
    return { kind: 'ok', value };
}

function err<E extends Error>(error: E): Result<never, E> {
    return { kind: 'err', error };
}

/**
 * 1:1 translation of TemplateCache from src/template_cache.rs
 * 
 * Caches template definitions from EVTX chunk data for fast lookup during
 * template expansion. Templates are pre-parsed and stored by their chunk offset.
 */
export class TemplateCache {
    private cache: Map<ChunkOffset, CachedTemplate>;

    constructor() {
        this.cache = new Map();
    }

    /**
     * 1:1 translation of TemplateCache::populate
     * 
     * Populates the cache by reading all template definitions from chunk data.
     * Follows the next_template_offset chain to find all linked templates.
     * 
     * @param data - Chunk data buffer containing template definitions
     * @param offsets - Array of chunk offsets pointing to first templates in each chain
     * @param ansi_codec - Character encoding for string data (e.g., "windows-1252")
     * @returns Result containing populated TemplateCache or error
     */
    static populate(
        data: Buffer,
        offsets: ChunkOffset[],
        ansi_codec: string
    ): Result<TemplateCache, Error> {
        const cache_instance = new TemplateCache();
        
        // console.log(`DEBUG TemplateCache.populate: Processing ${offsets.length} offset(s)`);
        
        // Filter to only positive offsets (offset > 0)
        const valid_offsets = offsets.filter(offset => offset > 0);
        // console.log(`DEBUG TemplateCache.populate: ${valid_offsets.length} valid offset(s)`);

        for (const offset of valid_offsets) {
            // console.log(`DEBUG TemplateCache.populate: Starting chain at offset ${offset}`);
            
            let current_offset = offset;
            let chain_count = 0;

            // Follow the template chain (next_template_offset links)
            while (true) {
                const table_offset = current_offset;
                
                // console.log(`DEBUG TemplateCache.populate: Reading template at offset ${table_offset}`);
                
                // Read template definition from chunk data
                // Note: read_template_definition expects to read from a specific position in the buffer
                const definition_result = read_template_definition(
                    data,
                    table_offset,
                    null, // chunk parameter (may be needed for name resolution)
                    ansi_codec
                );

                if (definition_result.kind === 'err') {
                    console.error(`Failed to read template at offset ${table_offset}: ${definition_result.error}`);
                    return definition_result;
                }

                const definition = definition_result.value;
                const next_template_offset = definition.header.next_template_offset;
                
                // Store in cache
                cache_instance.cache.set(table_offset, definition);
                chain_count++;
                
                // console.log(`DEBUG TemplateCache.populate: Cached template at offset ${table_offset}, next_offset=${next_template_offset}`);

                // Break if end of chain
                if (next_template_offset === 0) {
                    // console.log(`DEBUG TemplateCache.populate: End of chain, cached ${chain_count} template(s)`);
                    break;
                }

                // Move to next template in chain
                current_offset = next_template_offset;
            }
        }

        // console.log(`DEBUG TemplateCache.populate: Total cached templates: ${cache_instance.len()}`);
        return ok(cache_instance);
    }

    /**
     * 1:1 translation of TemplateCache::get_template
     * 
     * Retrieves a cached template by its chunk offset.
     * 
     * @param offset - Chunk offset of the template
     * @returns Template definition or null if not found
     */
    get_template(offset: ChunkOffset): CachedTemplate | null {
        const template = this.cache.get(offset);
        if (template) {
            // console.log(`DEBUG TemplateCache.get_template: Found template at offset ${offset}`);
            return template;
        } else {
            // console.log(`DEBUG TemplateCache.get_template: Template NOT found at offset ${offset}`);
            return null;
        }
    }

    /**
     * 1:1 translation of TemplateCache::len
     * 
     * @returns Number of cached templates
     */
    len(): number {
        return this.cache.size;
    }

    /**
     * Utility method for debugging
     * 
     * @returns Array of all cached template offsets
     */
    get_cached_offsets(): ChunkOffset[] {
        return Array.from(this.cache.keys());
    }
}
