/**
 * Agent Skill: Context Item Types
 * 
 * This skill defines patterns and procedures for implementing context item types
 * in the context-window-planner project.
 */

export const skill = {
  name: 'context-item',
  description: 'Implementing context item types',
  version: '1.0.0',
};

/**
 * Template for a new context item type
 */
export function createContextItem(name, description, properties, options = {}) {
  const {
    defaultPriority = 'Priority.Medium',
    summarizable = false,
    additionalMethods = [],
  } = options;

  const fileName = `packages/core/src/items/${name}.ts`;
  const hasTokenizeProp = properties.some(p => p.name === 'tokenCount');
  
  return {
    type: 'file',
    name: fileName,
    content: `/**
 * ${description}
 * 
 * @module
 */

import type { ContextItem, ContextItemType } from '../types/index.js';
import { Priority } from '../types/priority.js';
import type { TokenizerAdapter } from '../tokenizer/index.js';

/**
 * Properties for creating a ${name}
 */
export interface ${capitalize(name)}Properties {
  ${properties.map(p => `/** ${p.description} */
  ${p.name}${p.optional ? '?' : ''}: ${p.type};`).join('\n  ')}
  /** Optional identifier (auto-generated if omitted) */
  id?: string;
  /** Priority level for this item */
  priority?: Priority;
  /** Pre-computed token count (required if not using factory) */
  tokenCount?: number;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * ${description}
 * 
 * A ${name} represents ${description.toLowerCase()} within the context window.
 */
export class ${capitalize(name)} implements ContextItem {
  readonly id: string;
  readonly type: ContextItemType = '${name.replace(/-/g, '_')}' as ContextItemType;
  readonly priority: Priority;
  readonly tokenCount: number;
  readonly metadata?: Record<string, unknown>;
  ${properties.map(p => `
  /** ${p.description} */
  readonly ${p.name}: ${p.type};`).join('')}

  constructor(properties: ${capitalize(name)}Properties) {
    this.id = properties.id ?? generateId();
    this.priority = properties.priority ?? ${defaultPriority};
    this.metadata = properties.metadata;
    ${properties.map(p => `this.${p.name} = properties.${p.name}${p.default ? ` ?? ${p.default}` : ''};`).join('\n    ')}

    if (properties.tokenCount === undefined) {
      throw new Error('tokenCount is required. Use the create${capitalize(name)} factory to compute it from a tokenizer.');
    }
    this.tokenCount = properties.tokenCount;
  }

  /**
   * Check if this item can be summarized.
   */
  canSummarize(): boolean {
    return ${summarizable};
  }
  ${summarizable ? `

  /**
   * Estimated token count after summarization.
   * Override in subclasses for custom estimation.
   */
  get estimatedSummarizedTokenCount(): number {
    return Math.ceil(this.tokenCount * 0.3);
  }

  /**
   * Create a summarized version of this item.
   */
  summarize(targetTokens?: number): ${capitalize(name)} {
    // Default summarization: return a new item with reduced token count
    // Override in subclasses for custom summarization logic
    return new ${capitalize(name)}({
      ...this,
      id: generateId(),
      tokenCount: targetTokens ?? this.estimatedSummarizedTokenCount,
    });
  }` : ''}
  ${additionalMethods.map(m => `

  /**
   * ${m.description}
   */
  ${m.signature} {
    ${m.implementation}
  }`).join('')}
}

/**
 * Generate a unique identifier.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return \`\${Date.now().toString(36)}-\${Math.random().toString(36).slice(2)}\`;
}

/**
 * Factory function to create a ${name} with token counting.
 * 
 * @param properties - Item properties
 * @param tokenizer - Tokenizer for counting tokens
 * @returns A new ${capitalize(name)} instance
 */
export function create${capitalize(name)}(
  properties: Omit<${capitalize(name)}Properties, 'tokenCount'>,
  tokenizer: TokenizerAdapter,
): ${capitalize(name)} {
  const content = ${getContentForTokenization(properties)};
  const tokenCount = tokenizer.count(content);

  return new ${capitalize(name)}({
    ...properties,
    tokenCount,
  });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
`,
  };
}

/**
 * Get content for tokenization based on properties
 */
function getContentForTokenization(properties) {
  const contentParts = [];
  
  for (const prop of properties) {
    if (prop.tokenize !== false && prop.type === 'string') {
      contentParts.push(`properties.${prop.name}`);
    }
  }
  
  if (contentParts.length === 0) {
    return "''";
  }
  
  if (contentParts.length === 1) {
    return contentParts[0];
  }
  
  return `[${contentParts.join(', ')}].join('\\n')`;
}

/**
 * Create System Prompt item
 */
export function createSystemPrompt() {
  return createContextItem('system-prompt', 'System prompt for the LLM', [
    { name: 'content', type: 'string', description: 'The system prompt content', default: "''" },
    { name: 'role', type: 'string', description: 'Optional role description', optional: true },
  ], {
    defaultPriority: 'Priority.Critical',
    summarizable: false,
  });
}

/**
 * Create System Prompt with token counting
 */
export function createSystemPromptFactory() {
  return createContextItem('system-prompt', 'System prompt for the LLM', [
    { name: 'content', type: 'string', description: 'The system prompt content', default: "''" },
    { name: 'role', type: 'string', description: 'Optional role description', optional: true },
  ], {
    defaultPriority: 'Priority.Critical',
    summarizable: false,
  });
}

/**
 * Create Conversation Turn item
 */
export function createConversationTurn() {
  return createContextItem('conversation-turn', 'A single turn in a conversation', [
    { name: 'role', type: 'string', description: 'The role of the speaker (user, assistant, system)', default: "''" },
    { name: 'content', type: 'string', description: 'The message content', default: "''" },
    { name: 'timestamp', type: 'number', description: 'Unix timestamp of the message', default: 'Date.now()' },
  ], {
    defaultPriority: 'Priority.High',
    summarizable: true,
    additionalMethods: [
      {
        description: 'Check if this is a user message',
        signature: 'isUser(): boolean',
        implementation: 'return this.role === \'user\';',
      },
      {
        description: 'Check if this is an assistant message',
        signature: 'isAssistant(): boolean',
        implementation: 'return this.role === \'assistant\';',
      },
      {
        description: 'Get the age of this message in milliseconds',
        signature: 'getAge(): number',
        implementation: 'return Date.now() - this.timestamp;',
      },
    ],
  });
}

/**
 * Create RAG Chunk item
 */
export function createRAGChunk() {
  return createContextItem('rag-chunk', 'A chunk of retrieved context from RAG', [
    { name: 'content', type: 'string', description: 'The chunk content', default: "''" },
    { name: 'relevanceScore', type: 'number', description: 'Relevance score (0-1)', default: '0' },
    { name: 'source', type: 'string', description: 'Source document identifier', optional: true },
    { name: 'chunkIndex', type: 'number', description: 'Index of this chunk in the source', optional: true },
  ], {
    defaultPriority: 'Priority.Medium',
    summarizable: true,
    additionalMethods: [
      {
        description: 'Check if this chunk meets minimum relevance threshold',
        signature: 'meetsThreshold(minScore: number): boolean',
        implementation: 'return this.relevanceScore >= minScore;',
      },
    ],
  });
}

/**
 * Create Tool Schema item
 */
export function createToolSchema() {
  return createContextItem('tool-schema', 'A function/tool schema for the LLM', [
    { name: 'name', type: 'string', description: 'The tool name', default: "''" },
    { name: 'description', type: 'string', description: 'Tool description', optional: true },
    { name: 'schema', type: 'Record<string, unknown>', description: 'JSON Schema for the tool parameters', default: '{}' },
  ], {
    defaultPriority: 'Priority.High',
    summarizable: false,
    additionalMethods: [
      {
        description: 'Get the tool definition in OpenAI format',
        signature: 'toOpenAIFormat(): { type: string; function: { name: string; description?: string; parameters: Record<string, unknown> } }',
        implementation: `return {
      type: 'function',
      function: {
        name: this.name,
        description: this.description,
        parameters: this.schema,
      },
    };`,
      },
    ],
  });
}

/**
 * Create Tool Result item
 */
export function createToolResult() {
  return createContextItem('tool-result', 'Result from executing a tool/function', [
    { name: 'toolName', type: 'string', description: 'Name of the tool that was executed', default: "''" },
    { name: 'result', type: 'string', description: 'The result content', default: "''" },
    { name: 'success', type: 'boolean', description: 'Whether the tool execution succeeded', default: 'true' },
    { name: 'error', type: 'string', description: 'Error message if execution failed', optional: true },
  ], {
    defaultPriority: 'Priority.Medium',
    summarizable: true,
  });
}

/**
 * Create Generation Buffer item
 */
export function createGenerationBuffer() {
  return {
    type: 'file',
    name: 'packages/core/src/items/generation-buffer.ts',
    content: `/**
 * Generation Buffer
 * 
 * Reserved space for LLM output generation.
 * 
 * @module
 */

import type { ContextItem, ContextItemType } from '../types/index.js';
import { Priority } from '../types/priority.js';

/**
 * Properties for creating a generation buffer
 */
export interface GenerationBufferProperties {
  /** Number of tokens to reserve */
  reservedTokens: number;
  /** Optional identifier */
  id?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Generation Buffer - reserves tokens for LLM output.
 * 
 * This is a special context item that doesn't contain actual content
 * but reserves space in the budget for the model's response.
 */
export class GenerationBuffer implements ContextItem {
  readonly id: string;
  readonly type: ContextItemType = 'generation_buffer' as ContextItemType;
  readonly priority: Priority = Priority.Critical;
  readonly tokenCount: number;
  readonly metadata?: Record<string, unknown>;

  /** Number of tokens reserved for generation */
  readonly reservedTokens: number;

  constructor(properties: GenerationBufferProperties) {
    this.id = properties.id ?? generateId();
    this.reservedTokens = properties.reservedTokens;
    this.tokenCount = properties.reservedTokens;
    this.metadata = properties.metadata;
  }

  /**
   * Generation buffers cannot be summarized.
   */
  canSummarize(): boolean {
    return false;
  }

  /**
   * Get the reserved token count.
   */
  getReservedTokens(): number {
    return this.reservedTokens;
  }
}

/**
 * Generate a unique identifier.
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return \`\${Date.now().toString(36)}-\${Math.random().toString(36).slice(2)}\`;
}

/**
 * Factory function to create a generation buffer.
 * 
 * @param properties - Buffer properties
 * @returns A new GenerationBuffer instance
 */
export function createGenerationBuffer(
  properties: GenerationBufferProperties,
): GenerationBuffer {
  return new GenerationBuffer(properties);
}
`,
  };
}

/**
 * Create the items index file
 */
export function createItemsIndex() {
  return {
    type: 'file',
    name: 'packages/core/src/items/index.ts',
    content: `/**
 * Context Item Types
 * 
 * Provides various context item implementations for different content types.
 * 
 * @module
 */

export * from './system-prompt.js';
export * from './conversation-turn.js';
export * from './rag-chunk.js';
export * from './tool-schema.js';
export * from './tool-result.js';
export * from './generation-buffer.js';
`,
  };
}

/**
 * Generate all context item files
 */
export function generateContextItemFiles() {
  const files = {};

  // Individual item types
  const systemPrompt = createSystemPrompt();
  const conversationTurn = createConversationTurn();
  const ragChunk = createRAGChunk();
  const toolSchema = createToolSchema();
  const toolResult = createToolResult();
  const generationBuffer = createGenerationBuffer();

  files[systemPrompt.name] = systemPrompt.content;
  files[conversationTurn.name] = conversationTurn.content;
  files[ragChunk.name] = ragChunk.content;
  files[toolSchema.name] = toolSchema.content;
  files[toolResult.name] = toolResult.content;
  files[generationBuffer.name] = generationBuffer.content;

  // Index file
  const index = createItemsIndex();
  files[index.name] = index.content;

  return files;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default skill;
