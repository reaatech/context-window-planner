/**
 * Agent Skill: Documentation Generation
 * 
 * This skill defines patterns and procedures for generating and updating
 * documentation in the context-window-planner project.
 */

export const skill = {
  name: 'docs',
  description: 'Documentation generation and updates',
  version: '1.0.0',
};

/**
 * Create README.md for the core package
 */
export function createReadme() {
  return {
    type: 'file',
    name: 'packages/core/README.md',
    content: `# context-window-planner

Optimize token allocation within LLM context windows. A TypeScript library that solves context window packing as a resource allocation problem.

## Installation

\`\`\`bash
npm install context-window-planner
# or
pnpm add context-window-planner
# or
yarn add context-window-planner
\`\`\`

## Quick Start

\`\`\`typescript
import {
  ContextPlanner,
  SystemPrompt,
  ConversationTurn,
  GenerationBuffer,
  Priority,
  strategies,
  tokenizers,
} from 'context-window-planner';

// Create a planner with token budget
const tokenizer = tokenizers.create('gpt-4');
const planner = new ContextPlanner({
  budget: 128000, // e.g., GPT-4 Turbo
  tokenizer,
  strategy: strategies.priorityGreedy(),
});

// Add context items
planner
  .add(createSystemPrompt({
    content: 'You are a helpful AI assistant.',
    priority: Priority.Critical,
  }, tokenizer))
  .add(new GenerationBuffer({ reservedTokens: 4096 }))
  .add(createConversationTurn({
    role: 'user',
    content: 'What is TypeScript?',
  }, tokenizer));

// Get optimal packing
const result = planner.pack();

console.log('Included:', result.included.length, 'items');
console.log('Tokens used:', result.usedTokens);
console.log('Remaining:', result.remainingTokens);
\`\`\`

## Features

- **Priority-based packing**: Items are included based on priority level
- **Multiple strategies**: Greedy, sliding window, summarize-and-replace, RAG selection
- **Tokenizer adapters**: Support for OpenAI (tiktoken) and Anthropic models
- **Type-safe**: Full TypeScript support with strict types
- **Extensible**: Easy to add custom item types and strategies

## Context Item Types

| Type | Description | Default Priority |
|------|-------------|------------------|
| SystemPrompt | Model instructions | Critical |
| ConversationTurn | Chat messages | High |
| RAGChunk | Retrieved documents | Medium |
| ToolSchema | Function definitions | High |
| ToolResult | Tool outputs | Medium |
| GenerationBuffer | Reserved output space | Critical |

## Packing Strategies

### Priority Greedy
Fills the context window by priority, highest first.

\`\`\`typescript
strategies.priorityGreedy()
\`\`\`

### Sliding Window
Keeps the most recent N conversation turns.

\`\`\`typescript
strategies.slidingWindow({ windowSize: 10 })
\`\`\`

### Summarize and Replace
Actively summarizes older items to fit more content.

\`\`\`typescript
strategies.summarizeReplace({ compressionRatio: 0.3 })
\`\`\`

### RAG Selection
Selects RAG chunks by relevance score.

\`\`\`typescript
strategies.ragSelection({ ragBudgetRatio: 0.3 })
\`\`\`

## API Reference

### ContextPlanner

The main planning engine.

\`\`\`typescript
class ContextPlanner {
  add(item: ContextItem): this;
  addAll(items: ContextItem[]): this;
  remove(id: string): this;
  pack(): PackingResult;
  getSummary(): PackingSummary;
  getTokenUsage(): TokenUsage;
  clear(): this;
}
\`\`\`

### PackingResult

\`\`\`typescript
interface PackingResult {
  readonly included: ReadonlyArray<ContextItem>;    // Items to include as-is
  readonly summarize: ReadonlyArray<ContextItem>;   // Items to summarize
  readonly dropped: ReadonlyArray<ContextItem>;     // Items to drop
  readonly usedTokens: number;                      // Total tokens used
  readonly remainingTokens: number;                 // Remaining budget
  readonly warnings: ReadonlyArray<PackWarning>;    // Optimization warnings
}
\`\`\`

## License

MIT
`,
  };
}

/**
 * Create TypeDoc configuration
 */
export function createTypeDocConfig() {
  return {
    type: 'file',
    name: 'typedoc.json',
    content: `{
  "entryPoints": ["packages/core/src/index.ts"],
  "out": "docs/api",
  "name": "context-window-planner",
  "includeVersion": true,
  "readme": "README.md",
  "theme": "default",
  "plugin": [],
  "excludePrivate": true,
  "excludeProtected": false,
  "excludeInternal": true,
  "categorizeByGroup": true,
  "categoryOrder": [
    "Core",
    "Types",
    "Items",
    "Strategies",
    "Tokenizers",
    "Utilities",
    "*"
  ],
  "sort": ["source-order", "alphabetical"],
  "visibilityFilters": {
    "protected": false,
    "private": false,
    "inherited": true,
    "external": false
  },
  "navigationLinks": {
    "GitHub": "https://github.com/reaatech/context-window-planner",
    "npm": "https://www.npmjs.com/package/context-window-planner"
  }
}
`,
  };
}

/**
 * Create example documentation files
 */
export function createExamples() {
  return [
    {
      type: 'file',
      name: 'examples/basic-packing/README.md',
      content: `# Basic Packing Example

This example demonstrates basic context window packing with the priority greedy strategy.

\`\`\`typescript
import {
  ContextPlanner,
  SystemPrompt,
  ConversationTurn,
  Priority,
  strategies,
  tokenizers,
} from 'context-window-planner';

const tokenizer = tokenizers.create('gpt-4');

const planner = new ContextPlanner({
  budget: 8000,
  tokenizer,
  strategy: strategies.priorityGreedy(),
});

// Add system prompt
planner.add(createSystemPrompt({
  content: 'You are a helpful coding assistant.',
  priority: Priority.Critical,
}, tokenizer));

// Add conversation history
planner.addAll([
  createConversationTurn({ role: 'user', content: 'How do I sort an array?' }, tokenizer),
  createConversationTurn({ role: 'assistant', content: 'Use Array.sort()...' }, tokenizer),
]);

const result = planner.pack();
console.log(result);
\`\`\`
`,
    },
    {
      type: 'file',
      name: 'examples/with-rag/README.md',
      content: `# RAG Example

This example demonstrates using the RAG selection strategy with relevance-scored chunks.

\`\`\`typescript
import {
  ContextPlannerBuilder,
  RAGChunk,
  SystemPrompt,
  strategies,
  tokenizers,
} from 'context-window-planner';

const tokenizer = tokenizers.create('gpt-4');

const planner = new ContextPlannerBuilder()
  .withBudget(128000)
  .withTokenizer(tokenizer)
  .withStrategy(strategies.ragSelection({
    ragBudgetRatio: 0.4, // 40% of budget for RAG
    minRelevanceScore: 0.6,
  }))
  .addItem(createSystemPrompt({ content: 'Answer based on the provided context.' }, tokenizer))
  .addItems(
    ragChunks.map(chunk => createRAGChunk({
      content: chunk.text,
      relevanceScore: chunk.score,
      source: chunk.source,
    }, tokenizer))
  )
  .build();

const result = planner.pack();
console.log('Selected chunks:', result.included.filter(i => i.type === 'rag_chunk').length);
\`\`\`
`,
    },
    {
      type: 'file',
      name: 'examples/conversation-management/README.md',
      content: `# Conversation Management Example

This example demonstrates using the sliding window strategy for conversation history.

\`\`\`typescript
import {
  ContextPlannerBuilder,
  ConversationTurn,
  SystemPrompt,
  strategies,
  tokenizers,
} from 'context-window-planner';

const tokenizer = tokenizers.create('gpt-4');

const planner = new ContextPlannerBuilder()
  .withBudget(32000)
  .withTokenizer(tokenizer)
  .withStrategy(strategies.slidingWindow({
    windowSize: 5, // Keep last 5 turns
  }))
  .addItem(createSystemPrompt({ content: 'You are a helpful assistant.' }, tokenizer))
  .addItems(conversationHistory.map(turn =>
    createConversationTurn({
      role: turn.role,
      content: turn.content,
      timestamp: turn.timestamp,
    }, tokenizer)
  ))
  .build();

const result = planner.pack();
console.log('Included turns:', result.included.filter(i => i.type === 'conversation_turn').length);
\`\`\`
`,
    },
  ];
}

/**
 * Create contributing guide
 */
export function createContributing() {
  return {
    type: 'file',
    name: 'CONTRIBUTING.md',
    content: `# Contributing to context-window-planner

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: \`git clone https://github.com/YOUR_USERNAME/context-window-planner.git\`
3. Install dependencies: \`pnpm install\`
4. Create a branch: \`git checkout -b feat/your-feature\`

## Development

### Project Structure

\`\`\`
packages/
  core/           # Main library
    src/
      types/      # Type definitions
      items/      # Context item types
      strategies/ # Packing strategies
      tokenizer/  # Tokenizer adapters
      utils/      # Utilities
    test/         # Tests
examples/         # Usage examples
skills/          # Agent skills
\`\`\`

### Commands

\`\`\`bash
pnpm build        # Build all packages
pnpm test         # Run tests
pnpm test:coverage # Run with coverage
pnpm lint         # Run linter
pnpm typecheck    # Type check
\`\`\`

## Guidelines

### Code Style

- Use strict TypeScript
- Follow the existing code style (enforced by ESLint/Prettier)
- Use meaningful variable names
- Add JSDoc comments for public APIs

### Testing

- Maintain ≥90% test coverage
- Test edge cases
- Use property-based testing for algorithms

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

\`\`\`
feat: add new strategy
fix: correct token calculation
docs: update README
test: add edge case tests
\`\`\`

### Pull Requests

1. One logical change per PR
2. Include tests for new functionality
3. Update documentation as needed
4. Ensure all CI checks pass

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
`,
  };
}

/**
 * Create changelog template
 */
export function createChangelog() {
  return {
    type: 'file',
    name: 'CHANGELOG.md',
    content: `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release with core functionality

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A

---

## [0.1.0] - YYYY-MM-DD

### Added
- Priority-based greedy packing strategy
- Sliding window strategy for conversations
- Summarize and replace strategy
- RAG selection strategy with relevance scoring
- Tokenizer adapters for OpenAI and Anthropic models
- Context item types: SystemPrompt, ConversationTurn, RAGChunk, ToolSchema, ToolResult, GenerationBuffer
- Fluent builder API via ContextPlannerBuilder
- Comprehensive test suite with ≥90% coverage
- TypeScript strict mode with full type definitions
- MIT License
`,
  };
}

/**
 * Generate all documentation files
 */
export function generateDocsFiles() {
  const files = {};

  const readme = createReadme();
  const typedoc = createTypeDocConfig();
  const contributing = createContributing();
  const changelog = createChangelog();

  files[readme.name] = readme.content;
  files[typedoc.name] = typedoc.content;
  files[contributing.name] = contributing.content;
  files[changelog.name] = changelog.content;

  // Examples
  const examples = createExamples();
  for (const example of examples) {
    files[example.name] = example.content;
  }

  return files;
}

export default skill;
