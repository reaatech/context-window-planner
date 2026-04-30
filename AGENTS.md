# AI Agent Guidelines for @reaatech/context-window-planner

This document provides guidelines and instructions for AI agents (such as Cline,
Cursor, GitHub Copilot, etc.) working on the `@reaatech/context-window-planner` project.

## Project Information

- **Repository**: `reaatech/context-window-planner`
- **License**: MIT
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Runtime**: Node.js (latest LTS)

## Agent Skills

This project includes a `skills/` directory with predefined agent skills that
define common development tasks. Each skill file contains instructions and
patterns for specific operations.

### Available Skills

| Skill              | Description                                  |
| ------------------ | -------------------------------------------- |
| `setup.mjs`        | Project initialization and environment setup |
| `types.mjs`        | Creating and modifying type definitions      |
| `tokenizer.mjs`    | Implementing tokenizer adapters              |
| `strategy.mjs`     | Creating packing strategies                  |
| `context-item.mjs` | Implementing context item types              |
| `planner.mjs`      | Modifying the main planning engine           |
| `test.mjs`         | Writing tests with Vitest                    |
| `build.mjs`        | Building and packaging the library           |
| `docs.mjs`         | Documentation generation and updates         |
| `release.mjs`      | Release and publishing workflows             |

## Working with Skills

The `skills/` directory contains project-level conventions and code-generation
templates. They define how this project is built and may be updated when:

- New patterns emerge that should be reused across modules
- Tooling or dependencies change (e.g., ESLint config migration)
- A new category of work is identified that deserves its own skill

When modifying skills, update this section of `AGENTS.md` to reflect the change.

## Development Principles

### 1. Type Safety First

Always use strict TypeScript. Never use `any` unless absolutely necessary.
Prefer interfaces over type aliases for public APIs.

```typescript
// ✅ Good
interface ContextItem {
  readonly id: string;
  readonly type: ContextItemType;
  readonly priority: Priority;
}

// ❌ Avoid
type ContextItem = any;
```

### 2. Immutable by Default

Use `readonly` properties and avoid mutations. Return new objects instead of
modifying existing ones. This applies to **all public API types**, including
`ContextItem`, `PackingResult`, and strategy outputs.

```typescript
// ✅ Good
const newItem = { ...item, priority: Priority.High };

// ❌ Avoid
item.priority = Priority.High;
```

**Result objects** (like `PackingResult`) must use `ReadonlyArray<T>` and
`readonly` fields so consumers cannot accidentally mutate strategy outputs.

### 3. Comprehensive Testing

- Unit test coverage must be ≥90%
- Test edge cases: empty inputs, boundary conditions, overflow
- Use property-based testing for strategy algorithms
- Mock external dependencies (tokenizers, summarizers)

### 4. Documentation

- All public APIs must have JSDoc comments
- Include usage examples in comments
- Update ARCHITECTURE.md when making structural changes
- Add new examples to the `examples/` directory

### 5. Performance

- Cache token counts at the **TokenizerAdapter** level, not in the planner
- Use efficient sorting (O(n log n) or better)
- Avoid unnecessary object allocations in hot paths
- Target <10ms for packing 100 items

**Token Counting Pattern:** Items should be created with their `tokenCount`
already computed (via a factory or builder). The `ContextPlanner` does not
manage token caching — adapters do.

## Code Style

### Import Organization

```typescript
// 1. Standard library imports
import { EventEmitter } from 'events';

// 2. Third-party imports
import { encodingForModel } from 'js-tiktoken';

// 3. Internal imports (relative paths)
import { Priority } from './types/priority.js';
import { TokenCache } from './utils/token-cache.js';

// 4. Type imports
import type { ContextItem } from './types/context-item.js';
```

### Naming Conventions

| Type           | Convention          | Example            |
| -------------- | ------------------- | ------------------ |
| Classes        | PascalCase          | `ContextPlanner`   |
| Interfaces     | PascalCase          | `PackingStrategy`  |
| Enums          | PascalCase          | `Priority`         |
| Variables      | camelCase           | `tokenCount`       |
| Constants      | UPPER_SNAKE_CASE    | `DEFAULT_BUDGET`   |
| Private fields | #prefix or \_prefix | `#cache`, `_items` |
| Files          | kebab-case          | `context-item.ts`  |

### File Structure

```typescript
/**
 * Module documentation - brief description of what this file exports.
 * @module
 */

// Type imports first
import type { ContextItem } from './types/context-item.js';

// Regular imports
import { Priority } from './types/priority.js';

// Implementation
export class MyModule {
  // ...
}
```

## Common Patterns

### Factory Pattern for Tokenizers

```typescript
export const tokenizers = {
  create(model: string): TokenizerAdapter {
    if (model.startsWith('gpt')) {
      return new TiktokenAdapter(model);
    }
    if (model.startsWith('claude')) {
      return new AnthropicTokenizerAdapter(model);
    }
    throw new Error(`Unknown model: ${model}`);
  },
};
```

### Item Creation Pattern (Decoupled from Tokenizer)

Items should accept `tokenCount` as data rather than requiring a tokenizer in
the constructor:

```typescript
// ✅ Good — data + token count
const item = new SystemPrompt({ content: '...', tokenCount: 42 });

// ✅ Good — factory computes token count
const item = createSystemPrompt({ content: '...' }, tokenizer);

// ❌ Avoid — constructor requires tokenizer for every item
const item = new SystemPrompt({ content: '...' }, tokenizer);
```

### Strategy Pattern

```typescript
export interface PackingStrategy {
  readonly name: string;
  execute(context: PackingContext): PackingResult;
}
```

### Builder Pattern

```typescript
export class ContextPlannerBuilder {
  withBudget(tokens: number): this {
    /* ... */ return this;
  }
  withTokenizer(adapter: TokenizerAdapter): this {
    /* ... */ return this;
  }
  build(): ContextPlanner {
    /* ... */
  }
}
```

## Git Workflow

### Commit Messages (Conventional Commits)

```
feat: add sliding window strategy for conversation history
fix: correct token count calculation for multi-byte characters
docs: update API documentation for ContextPlanner
test: add property-based tests for priority sorting
perf: improve packing performance with better sorting
refactor: extract tokenizer validation into separate module
chore: update dependencies to latest versions
```

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test additions or modifications

### Pull Request Guidelines

1. One logical change per PR
2. Include tests for new functionality
3. Update documentation as needed
4. Ensure all CI checks pass
5. Request review from maintainers

## Error Handling

### Custom Error Classes

```typescript
export class ContextPlannerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ContextPlannerError';
  }
}

export class BudgetExceededError extends ContextPlannerError {
  code = 'BUDGET_EXCEEDED';
}
```

### Validation Pattern

```typescript
function validate(input: unknown): asserts input is ValidType {
  if (!isValid(input)) {
    throw new InvalidItemError('Invalid input', { input });
  }
}
```

## Testing Guidelines

### Unit Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ContextPlanner } from '../planner.js';

describe('ContextPlanner', () => {
  let planner: ContextPlanner;

  beforeEach(() => {
    planner = new ContextPlanner({
      budget: 128000,
      tokenizer: createMockTokenizer(),
    });
  });

  it('should include critical priority items first', () => {
    // Test implementation
  });
});
```

### Property-Based Testing

```typescript
import { fc } from '@fast-check/vitest';

it('should always respect budget constraints', () =>
  fc.assert(
    fc.property(fc.integer({ min: 1000, max: 1000000 }), (budget) => {
      const result = packWithBudget(budget);
      expect(result.usedTokens).toBeLessThanOrEqual(budget);
    }),
  ));
```

## CI/CD

### GitHub Actions Workflow

The project uses GitHub Actions for:

- Running tests on every push/PR
- Linting and type checking
- Building and publishing to npm
- Generating and deploying documentation

### Required Checks Before Merge

- [ ] All tests passing
- [ ] ESLint: no errors or warnings
- [ ] TypeScript: no type errors
- [ ] Test coverage: ≥90%
- [ ] Documentation: updated as needed

## Security Considerations

1. **Never log sensitive data** (API keys, tokens, user content)
2. **Validate all inputs** before processing
3. **Use secure random ID generation** (crypto.randomUUID)
4. **Avoid ReDoS** in regex patterns
5. **Keep dependencies updated** (run `pnpm audit` regularly)

## Resources

- [DEV_PLAN.md](./DEV_PLAN.md) - Development roadmap
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [skills/](./skills/) - Agent skill definitions
- [examples/](./examples/) - Usage examples

## Getting Help

If you encounter issues while working on this project:

1. Check the existing documentation
2. Review similar implementations in the codebase
3. Search for related issues in the repository
4. Ask in the project discussions (for human collaborators)
