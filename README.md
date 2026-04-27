# context-window-planner

<p align="center">
  <a href="https://github.com/reaatech/context-window-planner/actions/workflows/ci.yml">
    <img src="https://github.com/reaatech/context-window-planner/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="https://www.npmjs.com/package/@reaatech/context-window-planner">
    <img src="https://img.shields.io/npm/v/@reaatech/context-window-planner" alt="npm version">
  </a>
  <a href="https://opensource.org/licenses/MIT">
    <img src="https://img.shields.io/npm/l/@reaatech/context-window-planner" alt="license">
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-5.3-blue" alt="TypeScript">
  </a>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/node/v/@reaatech/context-window-planner" alt="node">
  </a>
</p>

> Optimize token allocation within LLM context windows. A small,
> dependency-light TypeScript library that decides **what to include, what to
> summarize, and what to drop** when packing prompts for Claude, GPT, and other
> LLMs.

## Why?

Building LLM applications means wrestling with context window limits. You have
system prompts, conversation history, RAG chunks, tool definitions, and tool
results — all competing for a fixed token budget. Existing solutions are:

- **Ad-hoc** — inline logic duplicated across every project
- **Inconsistent** — different rules for different item types, no unified
  priority
- **Hard to test** — edge cases (over-full budget, summarization fallback)
  missed

**context-window-planner** treats context packing as a resource allocation
problem. Give it a token budget, a set of prioritized items, and a strategy — it
returns a deterministic packing decision with machine-readable warnings.

## Features

- **Pluggable tokenizer adapters** — OpenAI tiktoken, Anthropic estimate, mock
  for testing; create your own via the `TokenizerAdapter` interface
- **Pluggable packing strategies** — priority-greedy, sliding-window,
  summarize-and-replace, RAG relevance selection; compose or write custom
  strategies
- **Typed context item primitives** — `SystemPrompt`, `ConversationTurn`,
  `RAGChunk`, `ToolSchema`, `ToolResult`, `GenerationBuffer`
- **Budget enforcement** — total budget, reserved tokens, and configurable
  safety margin applied once at the planner level
- **Structured warnings** — every decision (drop, summarize, low-remaining)
  emits a `PackWarning` you can log, alert on, or surface in a UI
- **Deterministic & framework-agnostic** — zero runtime dependencies beyond
  `js-tiktoken`
- **≥90% test coverage** with property-based tests for strategy correctness

## Installation

```bash
npm install @reaatech/context-window-planner
# or
pnpm add @reaatech/context-window-planner
```

Requires Node.js ≥ 18.

## Quick start

```ts
import {
  ContextPlannerBuilder,
  createTokenizer,
  createPriorityGreedyStrategy,
  createSystemPrompt,
  createConversationTurn,
  createGenerationBuffer,
} from '@reaatech/context-window-planner';

const tokenizer = createTokenizer('gpt-4');

const planner = new ContextPlannerBuilder()
  .withBudget(128000)
  .withReserved(4096)
  .withTokenizer(tokenizer)
  .withStrategy(createPriorityGreedyStrategy())
  .build();

planner.addAll([
  createSystemPrompt({ content: 'You are a helpful assistant.' }, tokenizer),
  createConversationTurn({ role: 'user', content: 'Hello!' }, tokenizer),
  createGenerationBuffer({ reservedTokens: 2048 }),
]);

const result = planner.pack();

console.log(`${result.included.length} items included`);
console.log(`${result.summarize.length} items to summarize`);
console.log(`${result.dropped.length} items dropped`);
console.log(
  `${result.usedTokens} / ${result.remainingTokens + result.usedTokens} tokens used`,
);

for (const warning of result.warnings) {
  console.warn(`[${warning.code}]`, warning.message);
}
```

## Architecture

```
 ┌─────────────────────────────────────────┐
 │            ContextPlanner                │
 │  Manages budget, items, strategy         │
 └──────────────┬──────────────────────────┘
                │
     ┌──────────┼──────────┐
     ▼          ▼          ▼
 ┌────────┐ ┌────────┐ ┌────────┐
 │Budget  │ │Strategy│ │Item    │
 │Manager │ │Engine  │ │Registry│
 └────────┘ └────────┘ └────────┘
      │           │           │
      ▼           ▼           ▼
  TokenBudget  Packing     ContextItem
               Result      implementations
```

| Layer             | Responsibility                                                          |
| ----------------- | ----------------------------------------------------------------------- |
| **Token Budget**  | total → reserved → available; safety margin applied once                |
| **Context Items** | Typed primitives with priority, token count, and optional `summarize()` |
| **Tokenizer**     | Adapter per model family; caches counts by content hash                 |
| **Strategy**      | Algorithm that produces `PackingResult` from budget + items             |
| **Planner**       | Orchestrator; holds budget, items, and strategy; exposes `pack()`       |

## Core concepts

### Token budget

```
total:     total tokens available in the model's window
reserved:  tokens you don't want packed with content
available: total − reserved − (total × safetyMargin)
```

`safetyMargin` defaults to 5% and is applied once inside the planner. Strategies
work against `budget.available` directly.

### Context items

Each item implements `ContextItem`:

```ts
interface ContextItem {
  readonly id: string;
  readonly type: ContextItemType;
  readonly priority: Priority; // Critical | High | Medium | Low | Disposable
  readonly tokenCount: number;
  readonly metadata?: Record<string, unknown>;
  canSummarize(): boolean;
  summarize?(): ContextItem;
}
```

| Type               | Default priority | Can summarize |
| ------------------ | ---------------- | ------------- |
| `SystemPrompt`     | Critical         | No            |
| `ConversationTurn` | High             | Yes           |
| `ToolSchema`       | High             | No            |
| `ToolResult`       | Medium           | Yes           |
| `RAGChunk`         | Medium           | Yes           |
| `GenerationBuffer` | Critical         | No            |

Each type has a `createX(props, tokenizer)` factory that computes `tokenCount`.
Custom items are created by implementing the interface.

### Packing strategies

| Strategy           | Behavior                                                               |
| ------------------ | ---------------------------------------------------------------------- |
| `PriorityGreedy`   | Fill highest-priority items first, then fall through to lower ones     |
| `SlidingWindow`    | Keep N most recent conversation turns; older turns become summarizable |
| `SummarizeReplace` | Actively summarize items that don't fit, up to `maxSummaries`          |
| `RAGSelection`     | Allocate a budget fraction to RAG chunks sorted by relevance score     |

Create via factory functions (`createPriorityGreedyStrategy()`) or implement
`PackingStrategy` directly for custom logic.

### Packing result

```ts
interface PackingResult {
  readonly included: ReadonlyArray<ContextItem>; // items packed as-is
  readonly summarize: ReadonlyArray<ContextItem>; // items to summarize first
  readonly dropped: ReadonlyArray<ContextItem>; // items that didn't fit
  readonly usedTokens: number;
  readonly remainingTokens: number;
  readonly warnings: ReadonlyArray<PackWarning>; // machine-readable alerts
}
```

## Packages

This repository is a pnpm monorepo.

| Package                                             | Description                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| [`@reaatech/context-window-planner`](packages/core) | Core library: planner, strategies, tokenizer adapters, item primitives. |

## API reference

See [`packages/core/README.md`](packages/core/README.md) for the full API,
including:

- Error hierarchy (`ContextPlannerError` with stable error codes)
- Custom strategy and tokenizer examples
- All factory functions and builder options

## Examples

Runnable examples under [`examples/`](examples):

| Example                                                       | Demonstrates                            |
| ------------------------------------------------------------- | --------------------------------------- |
| [`basic-packing`](examples/basic-packing)                     | Minimal end-to-end planner usage        |
| [`conversation-management`](examples/conversation-management) | Sliding-window over chat history        |
| [`custom-strategy`](examples/custom-strategy)                 | Implementing a custom `PackingStrategy` |
| [`with-rag`](examples/with-rag)                               | Relevance-scored RAG chunk selection    |

Each example includes its own README with run instructions.

## Development

```bash
pnpm install      # install dependencies
pnpm build        # build all packages
pnpm test         # run tests (vitest)
pnpm typecheck    # run TypeScript type checking
pnpm lint         # run ESLint
```

Requires Node.js ≥ 18 and pnpm ≥ 8.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full
workflow, and [ARCHITECTURE.md](ARCHITECTURE.md) for design decisions. AI agents
working on this repository should also read [AGENTS.md](AGENTS.md).

## License

MIT © reaatech and contributors. See [LICENSE](LICENSE).
