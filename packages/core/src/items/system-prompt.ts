/**
 * System prompt for the LLM
 *
 * @module
 */

import { InvalidItemError } from '../errors.js';
import type { TokenizerAdapter } from '../tokenizer/index.js';
import type { ContextItem, ContextItemType } from '../types/index.js';
import { Priority } from '../types/priority.js';
import { generateId } from '../utils/id.js';

/**
 * Properties for creating a SystemPrompt
 */
export interface SystemPromptProperties {
  /** The system prompt content */
  content: string;
  /** Optional role description */
  role?: string;
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
 * System prompt for the LLM.
 */
export class SystemPrompt implements ContextItem {
  readonly id: string;
  readonly type: ContextItemType = 'system_prompt';
  readonly priority: Priority;
  readonly tokenCount: number;
  readonly metadata: Record<string, unknown> | undefined;

  /** The system prompt content */
  readonly content: string;
  /** Optional role description */
  readonly role: string;

  constructor(properties: SystemPromptProperties) {
    this.id = properties.id ?? generateId();
    this.priority = properties.priority ?? Priority.Critical;
    this.metadata = properties.metadata;
    this.content = properties.content;
    this.role = properties.role ?? '';

    if (properties.tokenCount === undefined) {
      throw new InvalidItemError(
        'tokenCount is required. Use the createSystemPrompt factory to compute it from a tokenizer.',
        { reason: 'tokenCount' },
      );
    }
    this.tokenCount = properties.tokenCount;
  }

  /**
   * System prompts cannot be summarized; they define agent behavior.
   */
  canSummarize(): boolean {
    return false;
  }
}

/**
 * Factory function to create a SystemPrompt with token counting.
 *
 * @param properties - Item properties
 * @param tokenizer - Tokenizer for counting tokens
 * @returns A new SystemPrompt instance
 */
export function createSystemPrompt(
  properties: Omit<SystemPromptProperties, 'tokenCount'>,
  tokenizer: TokenizerAdapter,
): SystemPrompt {
  const text = properties.role ? `${properties.role}\n${properties.content}` : properties.content;
  const tokenCount = tokenizer.count(text);

  return new SystemPrompt({
    ...properties,
    tokenCount,
  });
}
