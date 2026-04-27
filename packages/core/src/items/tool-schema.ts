/**
 * A function/tool schema for the LLM
 *
 * @module
 */

import { InvalidItemError } from '../errors.js';
import type { TokenizerAdapter } from '../tokenizer/index.js';
import type { ContextItem, ContextItemType } from '../types/index.js';
import { Priority } from '../types/priority.js';
import { generateId } from '../utils/id.js';

/**
 * Properties for creating a ToolSchema
 */
export interface ToolSchemaProperties {
  /** The tool name */
  name: string;
  /** Tool description */
  description?: string;
  /** JSON Schema for the tool parameters */
  schema: Record<string, unknown>;
  /** Optional identifier */
  id?: string;
  /** Priority level for this item */
  priority?: Priority;
  /** Pre-computed token count */
  tokenCount?: number;
  /** Optional metadata */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * A function/tool schema for the LLM.
 */
export class ToolSchema implements ContextItem {
  readonly id: string;
  readonly type: ContextItemType = 'tool_schema';
  readonly priority: Priority;
  readonly tokenCount: number;
  readonly metadata: Record<string, unknown> | undefined;

  /** The tool name */
  readonly name: string;
  /** Tool description */
  readonly description: string;
  /** JSON Schema for the tool parameters */
  readonly schema: Record<string, unknown>;

  constructor(properties: ToolSchemaProperties) {
    this.id = properties.id ?? generateId();
    this.priority = properties.priority ?? Priority.High;
    this.metadata = properties.metadata;
    this.name = properties.name;
    this.description = properties.description ?? '';
    this.schema = properties.schema;

    if (properties.tokenCount === undefined) {
      throw new InvalidItemError(
        'tokenCount is required. Use the createToolSchema factory to compute it from a tokenizer.',
        { reason: 'tokenCount' },
      );
    }
    this.tokenCount = properties.tokenCount;
  }

  canSummarize(): boolean {
    return false;
  }

  /**
   * Get the tool definition in OpenAI function-calling format.
   */
  toOpenAIFormat(): {
    type: string;
    function: { name: string; description?: string; parameters: Record<string, unknown> };
  } {
    return {
      type: 'function',
      function: {
        name: this.name,
        ...(this.description ? { description: this.description } : {}),
        parameters: this.schema,
      },
    };
  }
}

/**
 * Factory function to create a ToolSchema with token counting.
 *
 * @param properties - Item properties
 * @param tokenizer - Tokenizer for counting tokens
 * @returns A new ToolSchema instance
 */
export function createToolSchema(
  properties: Omit<ToolSchemaProperties, 'tokenCount'>,
  tokenizer: TokenizerAdapter,
): ToolSchema {
  const text = JSON.stringify({
    name: properties.name,
    description: properties.description,
    parameters: properties.schema,
  });
  const tokenCount = tokenizer.count(text);

  return new ToolSchema({
    ...properties,
    tokenCount,
  });
}
