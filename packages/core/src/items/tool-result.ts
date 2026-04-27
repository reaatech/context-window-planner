/**
 * Result from executing a tool/function
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
 * Properties for creating a ToolResult
 */
export interface ToolResultProperties {
  /** Name of the tool that was executed */
  toolName: string;
  /** The result content */
  result: string;
  /** Whether the tool execution succeeded */
  success?: boolean;
  /** Error message if execution failed */
  error?: string;
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
 * Result from executing a tool/function.
 */
export class ToolResult implements ContextItem, Summarizable {
  readonly id: string;
  readonly type: ContextItemType = 'tool_result';
  readonly priority: Priority;
  readonly tokenCount: number;
  readonly metadata: Record<string, unknown> | undefined;

  /** Name of the tool that was executed */
  readonly toolName: string;
  /** The result content */
  readonly result: string;
  /** Whether the tool execution succeeded */
  readonly success: boolean;
  /** Error message if execution failed */
  readonly error: string;

  constructor(properties: ToolResultProperties) {
    this.id = properties.id ?? generateId();
    this.priority = properties.priority ?? Priority.Medium;
    this.metadata = properties.metadata;
    this.toolName = properties.toolName;
    this.result = properties.result;
    this.success = properties.success ?? true;
    this.error = properties.error ?? '';

    if (properties.tokenCount === undefined) {
      throw new InvalidItemError(
        'tokenCount is required. Use the createToolResult factory to compute it from a tokenizer.',
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

  summarize(targetTokens?: number): ToolResult {
    const budget = targetTokens ?? this.estimatedSummarizedTokenCount;
    const truncatedResult = truncateContent(this.result, this.tokenCount, budget);
    return new ToolResult({
      toolName: this.toolName,
      result: truncatedResult,
      success: this.success,
      error: this.error,
      priority: this.priority,
      metadata: this.metadata,
      id: generateId(),
      tokenCount: budget,
    });
  }
}

/**
 * Factory function to create a ToolResult with token counting.
 *
 * @param properties - Item properties
 * @param tokenizer - Tokenizer for counting tokens
 * @returns A new ToolResult instance
 */
export function createToolResult(
  properties: Omit<ToolResultProperties, 'tokenCount'>,
  tokenizer: TokenizerAdapter,
): ToolResult {
  const text = `${properties.toolName}\n${properties.result}`;
  const tokenCount = tokenizer.count(text);

  return new ToolResult({
    ...properties,
    tokenCount,
  });
}
