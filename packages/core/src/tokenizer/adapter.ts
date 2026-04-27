/**
 * Tokenizer Adapter Interface
 *
 * Defines the contract for tokenizer implementations.
 *
 * @module
 */

/**
 * A message structure for token counting
 */
export interface Message {
  /** The role of the message sender (e.g., 'user', 'assistant', 'system') */
  readonly role: string;

  /** The content of the message */
  readonly content: string;
}

/**
 * Token pattern types for estimation
 */
export interface TokenPatternText {
  readonly type: 'text';
  readonly text: string;
}

export interface TokenPatternMessage {
  readonly type: 'message';
  readonly message: Message;
}

export interface TokenPatternEstimated {
  readonly type: 'estimated_length';
  readonly estimatedLength: number;
}

export type TokenPattern = TokenPatternText | TokenPatternMessage | TokenPatternEstimated;

/**
 * Interface for tokenizer adapters.
 *
 * Tokenizer adapters provide token counting functionality for different
 * LLM providers and models.
 */
export interface TokenizerAdapter {
  /** The model identifier for this tokenizer */
  readonly model: string;

  /**
   * Count tokens in a text string.
   *
   * @param text - The text to count tokens for
   * @returns The number of tokens
   */
  count(text: string): number;

  /**
   * Count tokens for a message structure.
   *
   * @param message - The message to count tokens for
   * @returns The number of tokens
   */
  countMessage(message: Message): number;

  /**
   * Estimate tokens for known patterns.
   *
   * @param pattern - The token pattern to estimate
   * @returns Estimated token count
   */
  estimate(pattern: TokenPattern): number;
}

/**
 * Factory interface for creating tokenizer adapters
 */
export interface TokenizerFactory {
  /**
   * Create a tokenizer adapter for a given model.
   *
   * @param model - The model identifier
   * @returns A tokenizer adapter for the model
   */
  create(model: string): TokenizerAdapter;
}
