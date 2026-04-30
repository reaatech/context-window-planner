# @reaatech/context-window-planner

[![npm version](https://img.shields.io/npm/v/@reaatech/context-window-planner.svg)](https://www.npmjs.com/package/@reaatech/context-window-planner)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/context-window-planner/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/context-window-planner/ci.yml?branch=main&label=CI)](https://github.com/reaatech/context-window-planner/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Canonical TypeScript types, packing strategies, tokenizer adapters, and context item primitives for managing LLM context windows. This package is the single source of truth for deciding **what to include, what to summarize, and what to drop** when packing prompts for Claude, GPT, and other LLMs.

## Installation

```bash
npm install @reaatech/context-window-planner
# or
pnpm add @reaatech/context-window-planner
```

## Feature Overview

- **88 exported types, classes, and factories** — every context packing concept has a corresponding implementation
- **6 typed context item primitives** — `SystemPrompt`, `ConversationTurn`, `RAGChunk`, `ToolSchema`, `ToolResult`, `GenerationBuffer`
- **4 packing strategies** — priority-greedy, sliding-window, summarize-and-replace, and RAG relevance selection
- **3 tokenizer adapters** — OpenAI (tiktoken), Anthropic (approximate), and mock (for testing)
- **7 typed error classes** — all extend `ContextPlannerError` with stable error codes
- **Pluggable architecture** — custom strategies, tokenizers, summarizers, and item types via interfaces
- **Deterministic and framework-agnostic** — zero runtime dependencies beyond `js-tiktoken`
- **Dual ESM/CJS output** — works with `import` and `require`

## Quick Start

```typescript
import {
  ContextPlannerBuilder,
  createTokenizer,
  createPriorityGreedyStrategy,
  createSystemPrompt,
  createConversationTurn,
  createGenerationBuffer,
  Priority,
} from "@reaatech/context-window-planner";

const tokenizer = createTokenizer("gpt-4");

const planner = new ContextPlannerBuilder()
  .withBudget(8000)
  .withReserved(1000)
  .withTokenizer(tokenizer)
  .withStrategy(createPriorityGreedyStrategy())
  .build();

planner.addAll([
  createSystemPrompt({ content: "You are a helpful assistant." }, tokenizer),
  createConversationTurn({ role: "user", content: "Hello!" }, tokenizer),
  createGenerationBuffer({ reservedTokens: 500 }),
]);

const result = planner.pack();
console.log(result.included.length, "items fit");
console.log(result.summarize.length, "items to summarize");
console.log(result.dropped.length, "items dropped");
console.log(result.warnings); // machine-readable warnings
```

## API Reference

### Context Items

Six built-in item types with factory functions that auto-compute `tokenCount`:

| Export | Default Priority | Summarizable | Description |
|--------|:----------------:|:------------:|-------------|
| `SystemPrompt` / `createSystemPrompt` | Critical | no | Model instructions, fixed at packing |
| `ConversationTurn` / `createConversationTurn` | High | yes | Chat message with `role`, `content`, `timestamp` |
| `ToolSchema` / `createToolSchema` | High | no | Function/tool definition with JSON Schema |
| `ToolResult` / `createToolResult` | Medium | yes | Tool execution output with `toolName`, `result` |
| `RAGChunk` / `createRAGChunk` | Medium | yes | Retrieved document chunk with `relevanceScore` |
| `GenerationBuffer` / `createGenerationBuffer` | Critical | no | Reserved output space, no content |

All items implement the `ContextItem` interface (`id`, `type`, `priority`, `tokenCount`, `canSummarize()`, `summarize?()`). Summarizable items also implement `Summarizable` which adds `estimatedSummarizedTokenCount` and guarantees a `summarize(targetTokens?)` method.

### Packing Strategies

| Strategy | Name | Options | Behavior |
|----------|------|---------|----------|
| `PriorityGreedyStrategy` | `"priority-greedy"` | none | Fill highest-priority items first, then fall through to lower ones |
| `SlidingWindowStrategy` | `"sliding-window"` | `windowSize`, `prioritizeRecent` | Keep N most recent conversation turns; older turns become summarizable |
| `SummarizeAndReplaceStrategy` | `"summarize-replace"` | `compressionRatio`, `maxSummaries`, `summarizer` | Actively summarize items that don't fit, up to `maxSummaries` |
| `RelevanceScoredRAGStrategy` | `"rag-selection"` | `ragBudgetRatio`, `minRelevanceScore`, `maxChunks` | Allocate a budget fraction to RAG chunks sorted by relevance |

Create strategies via the centralized factory:

```typescript
import { strategies } from "@reaatech/context-window-planner";

const greedy = strategies.create("priority-greedy");
const window = strategies.create("sliding-window", { windowSize: 10 });
const replace = strategies.create("summarize-replace", { compressionRatio: 0.3 });
const rag = strategies.create("rag-selection", { ragBudgetRatio: 0.4, minRelevanceScore: 0.6 });
```

Or use the direct factory functions: `createPriorityGreedyStrategy()`, `createSlidingWindowStrategy(opts)`, `createSummarizeAndReplaceStrategy(opts)`, `createRAGSelectionStrategy(opts)`.

### Planner & Builder

| Export | Description |
|--------|-------------|
| `ContextPlanner` | Main planning engine. Manages items, budget, and strategy. Methods: `add()`, `addAll()`, `remove()`, `removeByType()`, `pack()`, `repack()`, `plan()`, `getSummary()`, `getTokenUsage()`, `clear()`, `getItems()`, `fitsInBudget()`, `getBudget()`. Property: `isDirty`. |
| `ContextPlannerBuilder` | Fluent builder. Methods: `withBudget()`, `withTokenizer()`, `withStrategy()`, `withReserved()`, `withSafetyMargin()`, `addItem()`, `addItems()`, `build()`. |
| `PriorityResolver` | Dynamically adjusts item priorities based on recency, age decay, type overrides, and custom rules. |

### Token Budget

| Export | Description |
|--------|-------------|
| `TokenBudget` | Manages `total`, `reserved`, and `available` (`total − reserved`) tokens. |
| `createBudget` | Validates and creates a `TokenBudget` from raw values. |
| `validateBudget` | Throws `ValidationError` if budget is invalid. |
| `safetyMargin` (option) | Defaults to `0.05` (5%), applied once inside the planner. Strategies work against `budget.available` directly. |

### Packing Result

Every `pack()` call returns a `PackingResult`:

| Field | Type | Description |
|-------|------|-------------|
| `included` | `ReadonlyArray<ContextItem>` | Items packed as-is |
| `summarize` | `ReadonlyArray<ContextItem>` | Items to summarize before inclusion |
| `dropped` | `ReadonlyArray<ContextItem>` | Items that didn't fit |
| `usedTokens` | `number` | Total tokens used by included items |
| `remainingTokens` | `number` | Remaining available tokens |
| `warnings` | `ReadonlyArray<PackWarning>` | Machine-readable alerts (`code`, `message`, `item?`, `suggestion?`) |

### Tokenizer Adapters

| Adapter | Model Prefix | Description |
|---------|-------------|-------------|
| `TiktokenTokenizerAdapter` | `gpt-4*`, `gpt-3.5*` | Accurate token counting via `js-tiktoken` |
| `AnthropicTokenizerAdapter` | `claude*` | Approximate counting (~3.5 chars/token) |
| `MockTokenizerAdapter` | `mock` | Deterministic word-based counter for tests |

```typescript
import { tokenizers } from "@reaatech/context-window-planner";

const gpt4 = tokenizers.create("gpt-4");
const claude = tokenizers.create("claude-3-opus-20240229");
const mock = tokenizers.create("mock");
```

Or use `createTokenizer(model)` as a convenience alias.

### Error Classes

All errors extend `ContextPlannerError` which includes `code: string`, `message: string`, and optional `details?: Record<string, unknown>`.

| Class | Code | When |
|-------|------|------|
| `ContextPlannerError` | (base) | Base class for all context planner errors |
| `BudgetExceededError` | `BUDGET_EXCEEDED` | Packing result exceeds available budget |
| `TokenCountError` | `TOKEN_COUNT_ERROR` | Token counting failed |
| `InvalidItemError` | `INVALID_ITEM` | Invalid context item provided |
| `TokenizerError` | `TOKENIZER_ERROR` | Tokenizer operation failed |
| `StrategyError` | `STRATEGY_ERROR` | Invalid strategy configuration |
| `ValidationError` | `VALIDATION_ERROR` | Input validation failed |

```typescript
import { ContextPlannerError } from "@reaatech/context-window-planner";

try {
  const result = planner.pack();
} catch (err) {
  if (err instanceof ContextPlannerError) {
    console.error(err.code, err.message, err.details);
  }
}
```

### Utilities

| Export | Description |
|--------|-------------|
| `generateId` | Generates unique IDs via `crypto.randomUUID()` |
| `TokenCache` | LRU cache for token counts keyed by content |
| `PackingMemoizer` | Memoizes packing results by item fingerprint |
| `validateContextItem` | Validates an item's `id`, `type`, `priority`, and `tokenCount` |
| `validateModel` | Validates model identifier is non-empty and ≤100 chars |
| `truncateContent` | Truncates content to fit a target token count |

### Custom Strategies

Implement the `PackingStrategy` interface:

```typescript
import type {
  PackingStrategy,
  PackingContext,
  PackingResult,
} from "@reaatech/context-window-planner";

class MyStrategy implements PackingStrategy {
  readonly name = "my-strategy";

  execute(context: PackingContext): PackingResult {
    // decide which items go into `included`, `summarize`, or `dropped`
    // and return usedTokens / remainingTokens / warnings
  }
}

const planner = new ContextPlanner({ budget: 128000, tokenizer, strategy: new MyStrategy() });
```

## Related Packages

- [`@reaatech/context-window-planner-cli`](https://www.npmjs.com/package/@reaatech/context-window-planner-cli) — CLI tool for reading context items from stdin and producing a packing plan

## Examples

Runnable examples live in the repository under [`examples/`](https://github.com/reaatech/context-window-planner/tree/main/examples):

| Example | Demonstrates |
|---------|-------------|
| `basic-packing` | Minimal end-to-end planner usage |
| `conversation-management` | Sliding-window over chat history |
| `custom-strategy` | Implementing a custom `PackingStrategy` |
| `with-rag` | Relevance-scored RAG chunk selection |

## License

[MIT](https://github.com/reaatech/context-window-planner/blob/main/LICENSE)
