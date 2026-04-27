/**
 * Types of context items that can be included in the context window.
 *
 * @module
 */

export type ContextItemType =
  | 'system_prompt'
  | 'conversation_turn'
  | 'rag_chunk'
  | 'tool_schema'
  | 'tool_result'
  | 'generation_buffer'
  | 'custom';
