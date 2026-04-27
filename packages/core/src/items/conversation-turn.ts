/**
 * A single turn in a conversation
 *
 * @module
 */

import { InvalidItemError } from '../errors.js';
import type { TokenizerAdapter } from '../tokenizer/index.js';
import type { ContextItem, ContextItemType } from '../types/index.js';
import { Priority } from '../types/priority.js';
import type { Summarizable } from '../types/summarizable.js';
import { generateId } from '../utils/id.js';
import { truncateContent } from '../utils/validation.js';

/**
 * Properties for creating a ConversationTurn
 */
export interface ConversationTurnProperties {
  /** The role of the speaker (user, assistant, system) */
  role: string;
  /** The message content */
  content: string;
  /** Unix timestamp of the message */
  timestamp?: number;
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
 * A single turn in a conversation.
 */
export class ConversationTurn implements ContextItem, Summarizable {
  readonly id: string;
  readonly type: ContextItemType = 'conversation_turn';
  readonly priority: Priority;
  readonly tokenCount: number;
  readonly metadata: Record<string, unknown> | undefined;

  /** The role of the speaker (user, assistant, system) */
  readonly role: string;
  /** The message content */
  readonly content: string;
  /** Unix timestamp of the message */
  readonly timestamp: number;

  constructor(properties: ConversationTurnProperties) {
    this.id = properties.id ?? generateId();
    this.priority = properties.priority ?? Priority.High;
    this.metadata = properties.metadata;
    this.role = properties.role;
    this.content = properties.content;
    this.timestamp = properties.timestamp ?? Date.now();

    if (properties.tokenCount === undefined) {
      throw new InvalidItemError(
        'tokenCount is required. Use the createConversationTurn factory to compute it from a tokenizer.',
        { reason: 'tokenCount' },
      );
    }
    this.tokenCount = properties.tokenCount;
  }

  canSummarize(): boolean {
    return true;
  }

  /**
   * Estimated token count after summarization (approx. 30% of original).
   */
  get estimatedSummarizedTokenCount(): number {
    return Math.ceil(this.tokenCount * 0.3);
  }

  summarize(targetTokens?: number): ConversationTurn {
    const budget = targetTokens ?? this.estimatedSummarizedTokenCount;
    const truncatedContent = truncateContent(this.content, this.tokenCount, budget);
    return new ConversationTurn({
      role: this.role,
      content: truncatedContent,
      timestamp: this.timestamp,
      priority: this.priority,
      metadata: this.metadata,
      id: generateId(),
      tokenCount: budget,
    });
  }

  isUser(): boolean {
    return this.role === 'user';
  }

  isAssistant(): boolean {
    return this.role === 'assistant';
  }

  /** Milliseconds since this message was created. */
  getAge(): number {
    return Date.now() - this.timestamp;
  }
}

/**
 * Factory function to create a ConversationTurn with token counting.
 *
 * @param properties - Item properties
 * @param tokenizer - Tokenizer for counting tokens
 * @returns A new ConversationTurn instance
 */
export function createConversationTurn(
  properties: Omit<ConversationTurnProperties, 'tokenCount'>,
  tokenizer: TokenizerAdapter,
): ConversationTurn {
  const text = `${properties.role}\n${properties.content}`;
  const tokenCount = tokenizer.count(text);

  return new ConversationTurn({
    ...properties,
    tokenCount,
  });
}
