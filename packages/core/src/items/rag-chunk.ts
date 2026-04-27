/**
 * A chunk of retrieved context from RAG
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
 * Properties for creating a RAGChunk
 */
export interface RAGChunkProperties {
  /** The chunk content */
  content: string;
  /** Relevance score (0-1) */
  relevanceScore?: number;
  /** Source document identifier */
  source?: string;
  /** Index of this chunk in the source */
  chunkIndex?: number;
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
 * A chunk of retrieved context from RAG.
 */
export class RAGChunk implements ContextItem, Summarizable {
  readonly id: string;
  readonly type: ContextItemType = 'rag_chunk';
  readonly priority: Priority;
  readonly tokenCount: number;
  readonly metadata: Record<string, unknown> | undefined;

  /** The chunk content */
  readonly content: string;
  /** Relevance score (0-1) */
  readonly relevanceScore: number;
  /** Source document identifier */
  readonly source: string;
  /** Index of this chunk in the source */
  readonly chunkIndex: number;

  constructor(properties: RAGChunkProperties) {
    this.id = properties.id ?? generateId();
    this.priority = properties.priority ?? Priority.Medium;
    this.metadata = properties.metadata;
    this.content = properties.content;
    this.relevanceScore = properties.relevanceScore ?? 0;
    this.source = properties.source ?? '';
    this.chunkIndex = properties.chunkIndex ?? 0;

    if (properties.tokenCount === undefined) {
      throw new InvalidItemError(
        'tokenCount is required. Use the createRAGChunk factory to compute it from a tokenizer.',
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

  summarize(targetTokens?: number): RAGChunk {
    const budget = targetTokens ?? this.estimatedSummarizedTokenCount;
    const truncatedContent = truncateContent(this.content, this.tokenCount, budget);
    return new RAGChunk({
      content: truncatedContent,
      relevanceScore: this.relevanceScore,
      source: this.source,
      chunkIndex: this.chunkIndex,
      priority: this.priority,
      metadata: this.metadata,
      id: generateId(),
      tokenCount: budget,
    });
  }

  /** True if the chunk's relevance meets the given threshold. */
  meetsThreshold(minScore: number): boolean {
    return this.relevanceScore >= minScore;
  }
}

/**
 * Factory function to create a RAGChunk with token counting.
 *
 * @param properties - Item properties
 * @param tokenizer - Tokenizer for counting tokens
 * @returns A new RAGChunk instance
 */
export function createRAGChunk(
  properties: Omit<RAGChunkProperties, 'tokenCount'>,
  tokenizer: TokenizerAdapter,
): RAGChunk {
  const tokenCount = tokenizer.count(properties.content);

  return new RAGChunk({
    ...properties,
    tokenCount,
  });
}
