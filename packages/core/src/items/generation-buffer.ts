/**
 * Generation Buffer
 *
 * Reserved space for LLM output generation.
 *
 * @module
 */

import type { ContextItem, ContextItemType } from '../types/index.js';
import { Priority } from '../types/priority.js';
import { generateId } from '../utils/id.js';

/**
 * Properties for creating a generation buffer
 */
export interface GenerationBufferProperties {
  /** Number of tokens to reserve */
  reservedTokens: number;
  /** Optional identifier */
  id?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Generation Buffer - reserves tokens for LLM output.
 *
 * This is a special context item that doesn't contain actual content
 * but reserves space in the budget for the model's response.
 */
export class GenerationBuffer implements ContextItem {
  readonly id: string;
  readonly type: ContextItemType = 'generation_buffer';
  readonly priority: Priority = Priority.Critical;
  readonly tokenCount: number;
  readonly metadata: Record<string, unknown> | undefined;

  /** Number of tokens reserved for generation */
  readonly reservedTokens: number;

  constructor(properties: GenerationBufferProperties) {
    this.id = properties.id ?? generateId();
    this.reservedTokens = properties.reservedTokens;
    this.tokenCount = properties.reservedTokens;
    this.metadata = properties.metadata;
  }

  canSummarize(): boolean {
    return false;
  }

  getReservedTokens(): number {
    return this.reservedTokens;
  }
}

/**
 * Factory function to create a generation buffer.
 *
 * @param properties - Buffer properties
 * @returns A new GenerationBuffer instance
 */
export function createGenerationBuffer(properties: GenerationBufferProperties): GenerationBuffer {
  return new GenerationBuffer(properties);
}
