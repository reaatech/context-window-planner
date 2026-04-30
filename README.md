# context-window-planner

[![CI](https://github.com/reaatech/context-window-planner/actions/workflows/ci.yml/badge.svg)](https://github.com/reaatech/context-window-planner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)

> Optimize token allocation within LLM context windows. A small, dependency-light
> TypeScript library that decides **what to include, what to summarize, and what to
> drop** when packing prompts for Claude, GPT, and other LLMs.

This monorepo provides a deterministic packing engine, pluggable strategies, tokenizer
adapters for multiple model families, and typed context item primitives — all with
machine-readable warnings and ≥90% test coverage.

## Features

- **Pluggable tokenizer adapters** — OpenAI (tiktoken), Anthropic (approximate), and
  mock for testing; create your own via the `TokenizerAdapter` interface
- **Pluggable packing strategies** — priority-greedy, sliding-window,
  summarize-and-replace, and RAG relevance selection; compose or write custom strategies
- **Typed context item primitives** — `SystemPrompt`, `ConversationTurn`, `RAGChunk`,
  `ToolSchema`, `ToolResult`, `GenerationBuffer` with factory functions
- **Budget enforcement** — total budget, reserved tokens, and configurable safety
  margin applied once at the planner level
- **Structured warnings** — every decision (drop, summarize, low-remaining) emits a
  `PackWarning` you can log, alert on, or surface in a UI
- **Deterministic and framework-agnostic** — zero runtime dependencies beyond
  `js-tiktoken`; ≥90% test coverage with property-based tests

## Installation

### Using the packages

Packages are published under the `@reaatech` scope and can be installed individually:

```bash
# Core library
pnpm add @reaatech/context-window-planner

# CLI tool
pnpm add -g @reaatech/context-window-planner-cli
```

### Contributing

```bash
# Clone the repository
git clone https://github.com/reaatech/context-window-planner.git
cd context-window-planner

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the test suite
pnpm test

# Run linting
pnpm lint
```

## Quick Start

```typescript
import {
  ContextPlannerBuilder,
  createTokenizer,
  createPriorityGreedyStrategy,
  createSystemPrompt,
  createConversationTurn,
  createGenerationBuffer,
} from "@reaatech/context-window-planner";

const tokenizer = createTokenizer("gpt-4");

const planner = new ContextPlannerBuilder()
  .withBudget(128000)
  .withReserved(4096)
  .withTokenizer(tokenizer)
  .withStrategy(createPriorityGreedyStrategy())
  .build();

planner.addAll([
  createSystemPrompt({ content: "You are a helpful assistant." }, tokenizer),
  createConversationTurn({ role: "user", content: "Hello!" }, tokenizer),
  createGenerationBuffer({ reservedTokens: 2048 }),
]);

const result = planner.pack();

console.log(`${result.included.length} items included`);
console.log(`${result.summarize.length} items to summarize`);
console.log(`${result.dropped.length} items dropped`);

for (const warning of result.warnings) {
  console.warn(`[${warning.code}]`, warning.message);
}
```

See the [`examples/`](./examples/) directory for complete working samples, including
sliding-window conversation management, custom strategy implementation, and
relevance-scored RAG chunk selection.

## Packages


| Package                                                  | Description                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| [`@reaatech/context-window-planner`](./packages/core)    | Core library: planner, strategies, tokenizer adapters, item primitives |
| [`@reaatech/context-window-planner-cli`](./packages/cli) | CLI tool: read items from stdin, output a packing plan as JSON         |

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System design, component relationships, and extension points
- [`AGENTS.md`](./AGENTS.md) — Coding conventions and development guidelines for AI agents
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — Contribution workflow and release process
- [`packages/core/README.md`](./packages/core/README.md) — Full API reference with context items, strategies, tokenizers, and errors

## License

[MIT](LICENSE)
