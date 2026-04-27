# Architecture: context-window-planner

## System Overview

The `context-window-planner` library is designed as a modular, extensible system
for optimizing token allocation within LLM context windows. The architecture
follows clean code principles with clear separation of concerns, dependency
injection, and strategy patterns.

```
┌─────────────────────────────────────────────────────────────────┐
│                        ContextPlanner                            │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Planning Engine                           │ │
│  │  - Manages token budget                                      │ │
│  │  - Coordinates strategies                                    │ │
│  │  - Orchestrates packing decisions                            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                           │                                        │
│          ┌────────────────┼────────────────┐                      │
│          ▼                ▼                ▼                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │  Strategy    │ │  Tokenizer   │ │ Context Items │              │
│  │  Interface   │ │  Adapter     │ │  Collection   │              │
│  └──────────────┘ └──────────────┘ └──────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Token Budget (`TokenBudget`)

Manages the total token allocation and tracks usage.

```typescript
interface TokenBudget {
  /** Total available tokens */
  readonly total: number;

  /** Reserved tokens (generation buffer, safety margin) */
  readonly reserved: number;

  /** Available tokens for content */
  get available(): number;

  /** Currently used tokens */
  get used(): number;

  /** Remaining allocatable tokens */
  get remaining(): number;
}
```

**Responsibilities:**

- Track total, reserved, and available tokens
- Calculate remaining capacity
- Validate allocation requests
- Provide safety margin enforcement

---

### 2. Context Items (`ContextItem`)

Base interface for all content types that can be included in the context window.

```typescript
interface ContextItem {
  /** Unique identifier */
  readonly id: string;

  /** Item type for discrimination */
  readonly type: ContextItemType;

  /** Priority level for inclusion decisions */
  readonly priority: Priority;

  /** Token count (cached after first calculation) */
  readonly tokenCount: number;

  /** Metadata for debugging and logging */
  readonly metadata?: Record<string, unknown>;

  /** Check if item can be summarized */
  canSummarize(): boolean;

  /** Get summarized version (if supported) */
  summarize?(): ContextItem;
}

/**
 * Extended interface for items that support summarization.
 * Strategies can query the estimated token cost before deciding to summarize.
 */
interface Summarizable {
  /** Estimated token count after summarization */
  readonly estimatedSummarizedTokenCount: number;

  /** Summarize to a target token budget (best-effort) */
  summarize(targetTokens?: number): ContextItem;
}
```

#### Context Item Types

| Type               | Description               | Priority Default        | Summarizable |
| ------------------ | ------------------------- | ----------------------- | ------------ |
| `SystemPrompt`     | Model instructions        | Critical                | No           |
| `ConversationTurn` | Chat message              | High → Low (by recency) | Yes          |
| `RAGChunk`         | Retrieved document chunk  | Based on relevance      | Yes          |
| `ToolSchema`       | Function/tool definitions | High                    | No           |
| `ToolResult`       | Tool execution output     | Medium                  | Yes          |
| `GenerationBuffer` | Reserved output space     | Critical                | No           |

---

### 3. Priority System (`Priority`)

Determines the order and likelihood of inclusion for context items.

```typescript
enum Priority {
  /** Never dropped, always included first */
  Critical = 100,

  /** Dropped only when absolutely necessary */
  High = 75,

  /** Standard priority, balanced inclusion */
  Medium = 50,

  /** Dropped when space is needed */
  Low = 25,

  /** First to be dropped */
  Disposable = 0,
}
```

**Priority Resolution:**

- Static priority from item definition
- Dynamic adjustment based on recency, relevance, or custom rules
- Priority inheritance for grouped items
- Tie-breaking by timestamp or explicit order

---

### 4. Tokenizer Adapters (`TokenizerAdapter`)

Abstract interface for token counting across different LLM providers.

```typescript
interface TokenizerAdapter {
  /** Model identifier for this tokenizer */
  readonly model: string;

  /** Count tokens in a string */
  count(text: string): number;

  /** Count tokens for a message structure */
  countMessage(message: Message): number;

  /** Estimate tokens for known patterns */
  estimate(pattern: TokenPattern): number;
}
```

#### Implementations

| Adapter                     | Provider  | Models                                         |
| --------------------------- | --------- | ---------------------------------------------- |
| `TiktokenAdapter`           | OpenAI    | gpt-4, gpt-3.5-turbo, text-embedding-\*        |
| `AnthropicTokenizerAdapter` | Anthropic | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| `MockTokenizerAdapter`      | Testing   | Character-based estimation                     |

---

### 5. Packing Strategies (`PackingStrategy`)

Algorithms that determine which items to include, summarize, or drop.

```typescript
interface PackingStrategy {
  /** Strategy name for identification */
  readonly name: string;

  /** Execute the packing algorithm */
  execute(context: PackingContext): PackingResult;
}

interface PackingContext {
  budget: TokenBudget;
  items: ContextItem[];
  tokenizer: TokenizerAdapter;
  options: StrategyOptions;
}

interface PackingResult {
  /** Items included as-is */
  readonly included: ReadonlyArray<ContextItem>;

  /** Items to be summarized before inclusion */
  readonly summarize: ReadonlyArray<ContextItem>;

  /** Items dropped due to space constraints */
  readonly dropped: ReadonlyArray<ContextItem>;

  /** Total tokens used by included items */
  readonly usedTokens: number;

  /** Remaining available tokens */
  readonly remainingTokens: number;

  /** Warnings or optimization suggestions */
  readonly warnings: ReadonlyArray<PackingWarning>;
}
```

#### Summarizer Interface

```typescript
interface Summarizer {
  /** Human-readable name of the summarizer */
  readonly name: string;

  /** Estimate token count after summarizing an item */
  estimate(item: ContextItem): number;

  /** Summarize an item to a target token budget (best-effort) */
  summarize(item: ContextItem, targetTokens?: number): ContextItem;
}
```

#### Strategy Implementations

##### PriorityGreedyStrategy

```typescript
/**
 * Fills the context window by priority, highest first.
 * Within same priority, uses first-come-first-served.
 */
class PriorityGreedyStrategy implements PackingStrategy {
  execute(context: PackingContext): PackingResult {
    const sorted = context.items.sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) return b.priority - a.priority;
      // Then by order added (FIFO)
      return 0;
    });

    const result: PackingResult = {
      included: [],
      summarize: [],
      dropped: [],
      usedTokens: 0,
      remainingTokens: context.budget.available,
      warnings: [],
    };

    for (const item of sorted) {
      if (item.tokenCount <= result.remainingTokens) {
        result.included.push(item);
        result.usedTokens += item.tokenCount;
        result.remainingTokens -= item.tokenCount;
      } else if (item.canSummarize()) {
        result.summarize.push(item);
      } else {
        result.dropped.push(item);
      }
    }

    return result;
  }
}
```

##### SlidingWindowStrategy

```typescript
/**
 * Keeps the most recent N conversation turns, then fills
 * remaining space with other items by priority.
 */
class SlidingWindowStrategy implements PackingStrategy {
  constructor(
    private windowSize: number,
    private turnPriority: Priority = Priority.High,
  ) {}

  execute(context: PackingContext): PackingResult {
    const turns = context.items.filter(
      (item): item is ConversationTurn => item.type === 'conversation_turn',
    );
    const others = context.items.filter(
      (item) => item.type !== 'conversation_turn',
    );

    // Sort turns by timestamp, keep most recent
    const recentTurns = turns
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, this.windowSize);

    // Older turns are candidates for summarization or dropping
    const oldTurns = turns.slice(this.windowSize);

    // Process recent turns and others by priority
    // ... (similar to greedy for the rest)
  }
}
```

##### SummarizeAndReplaceStrategy

```typescript
/**
 * Actively summarizes older items to fit more content.
 * Uses a summarizer function to compress items.
 */
class SummarizeAndReplaceStrategy implements PackingStrategy {
  constructor(
    private summarizer: Summarizer,
    private compressionRatio: number = 0.3,
  ) {}

  execute(context: PackingContext): PackingResult {
    // First pass: try to include everything
    // Second pass: if over budget, summarize oldest items
    // Third pass: if still over, drop lowest priority items
  }
}
```

##### RelevanceScoredRAGStrategy

```typescript
/**
 * Selects RAG chunks by relevance score, keeping highest-scoring
 * chunks that fit within the allocated RAG budget.
 */
class RelevanceScoredRAGStrategy implements PackingStrategy {
  constructor(
    private ragBudgetRatio: number = 0.3, // 30% of budget for RAG
  ) {}

  execute(context: PackingContext): PackingResult {
    const ragChunks = context.items.filter(
      (item): item is RAGChunk => item.type === 'rag_chunk',
    );
    const others = context.items.filter((item) => item.type !== 'rag_chunk');

    // Sort RAG chunks by relevance score (descending)
    const sortedRag = ragChunks.sort(
      (a, b) => b.relevanceScore - a.relevanceScore,
    );

    // Allocate RAG budget
    const ragBudget = Math.floor(
      context.budget.available * this.ragBudgetRatio,
    );

    // Select chunks that fit in RAG budget
    // Process others normally
  }
}
```

---

### 6. Main Planning Engine (`ContextPlanner`)

Orchestrates the packing process.

```typescript
class ContextPlanner {
  private readonly budget: TokenBudget;
  private readonly tokenizer: TokenizerAdapter;
  private readonly strategy: PackingStrategy;
  private items: ContextItem[] = [];

  constructor(options: PlannerOptions) {
    this.budget = {
      total: options.budget,
      reserved: options.reserved ?? 0,
    };
    this.tokenizer = options.tokenizer;
    this.strategy = options.strategy ?? defaultStrategy();
  }

  /** Add a context item */
  add(item: ContextItem): this {
    this.items = [...this.items, item];
    return this;
  }

  /** Add multiple items */
  addAll(items: ContextItem[]): this {
    this.items = [...this.items, ...items];
    return this;
  }

  /** Remove an item by ID */
  remove(id: string): this {
    this.items = this.items.filter((item) => item.id !== id);
    return this;
  }

  /** Execute packing and return results */
  pack(): PackingResult {
    const context: PackingContext = {
      budget: this.budget,
      items: this.items,
      tokenizer: this.tokenizer,
      options: {},
    };

    return this.strategy.execute(context);
  }

  /** Get current token usage summary */
  getSummary(): PackingSummary {
    return {
      totalItems: this.items.length,
      totalTokens: this.items.reduce((sum, item) => sum + item.tokenCount, 0),
      byType: this.groupByType(),
      byPriority: this.groupByPriority(),
    };
  }

  /** Clear all items */
  clear(): this {
    this.items = [];
    return this;
  }
}
```

---

### 7. Builder Pattern (`ContextPlannerBuilder`)

Fluent API for constructing planners.

```typescript
class ContextPlannerBuilder {
  private budget!: number;
  private tokenizer!: TokenizerAdapter;
  private strategy: PackingStrategy = new PriorityGreedyStrategy();
  private items: ContextItem[] = [];
  private reserved: number = 0;

  withBudget(tokens: number): this {
    this.budget = tokens;
    return this;
  }

  withTokenizer(adapter: TokenizerAdapter): this {
    this.tokenizer = adapter;
    return this;
  }

  withStrategy(strategy: PackingStrategy): this {
    this.strategy = strategy;
    return this;
  }

  withReserved(tokens: number): this {
    this.reserved = tokens;
    return this;
  }

  addItem(item: ContextItem): this {
    this.items.push(item);
    return this;
  }

  addItems(items: ContextItem[]): this {
    this.items.push(...items);
    return this;
  }

  build(): ContextPlanner {
    if (!this.budget) {
      throw new Error('Budget is required');
    }
    if (!this.tokenizer) {
      throw new Error('Tokenizer is required');
    }

    const planner = new ContextPlanner({
      budget: this.budget,
      tokenizer: this.tokenizer,
      strategy: this.strategy,
      reserved: this.reserved,
    });

    planner.addAll(this.items);
    return planner;
  }
}

// Usage example:
const planner = new ContextPlannerBuilder()
  .withBudget(128000)
  .withTokenizer(tokenizers.create('gpt-4'))
  .withStrategy(strategies.slidingWindow(10))
  .withReserved(4096)
  .addItems(conversationHistory)
  .addItem(systemPrompt)
  .build();
```

---

## Data Flow

### Packing Workflow

```
1. Item Collection
   ┌─────────────────┐
   │  Context Items  │ ──► Assign IDs, priorities, token counts
   └────────┬────────┘
            │
2. Budget Setup
   ┌─────────────────┐
   │  Token Budget   │ ──► Set total, reserve generation buffer
   └────────┬────────┘
            │
3. Strategy Selection
   ┌─────────────────┐
   │   Strategy      │ ──► Choose algorithm based on use case
   └────────┬────────┘
            │
4. Execution
   ┌─────────────────┐
   │  Pack() Call    │ ──► Sort, allocate, decide
   └────────┬────────┘
            │
5. Result
   ┌─────────────────┐
   │  PackingResult  │ ──► included[], summarize[], dropped[]
   └─────────────────┘
```

### Token Counting Flow

```
ContextItem.content
        │
        ▼
┌──────────────────┐
│ TokenizerAdapter │
│   .count(text)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   TokenCache     │ ──► Store result by content hash
└────────┬─────────┘
         │
         ▼
   tokenCount (cached)
```

---

## Extension Points

### Custom Context Items

```typescript
class CustomContextItem implements ContextItem {
  readonly id: string;
  readonly type: ContextItemType = 'custom';
  priority: Priority = Priority.Medium;
  readonly tokenCount: number;

  constructor(
    public content: string,
    tokenizer: TokenizerAdapter,
  ) {
    this.id = generateId();
    this.tokenCount = tokenizer.count(content);
  }

  canSummarize(): boolean {
    return true;
  }

  summarize(): ContextItem {
    // Custom summarization logic
    return new CustomContextItem(
      summarizeText(this.content),
      // tokenizer reference
    );
  }
}
```

### Custom Strategies

```typescript
class CustomStrategy implements PackingStrategy {
  readonly name = 'custom';

  execute(context: PackingContext): PackingResult {
    // Custom packing logic
    return {
      included: [],
      summarize: [],
      dropped: [],
      usedTokens: 0,
      remainingTokens: context.budget.available,
      warnings: [],
    };
  }
}
```

### Custom Tokenizers

```typescript
class CustomTokenizerAdapter implements TokenizerAdapter {
  readonly model = 'custom-model';

  count(text: string): number {
    // Custom tokenization logic
    return text.split(/\s+/).length; // Word-based estimation
  }

  countMessage(message: Message): number {
    return this.count(message.role) + this.count(message.content);
  }

  estimate(pattern: TokenPattern): number {
    // Pattern-based estimation
    return pattern.estimatedLength * 0.75;
  }
}
```

---

## Error Handling

### Error Types

```typescript
class ContextPlannerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ContextPlannerError';
  }
}

// Specific error types
class BudgetExceededError extends ContextPlannerError {
  code = 'BUDGET_EXCEEDED';
}

class TokenCountError extends ContextPlannerError {
  code = 'TOKEN_COUNT_ERROR';
}

class InvalidItemError extends ContextPlannerError {
  code = 'INVALID_ITEM';
}

class TokenizerError extends ContextPlannerError {
  code = 'TOKENIZER_ERROR';
}
```

### Validation

```typescript
function validateContextItem(item: ContextItem): void {
  if (!item.id) {
    throw new InvalidItemError('Item must have an ID');
  }
  if (item.tokenCount < 0) {
    throw new InvalidItemError('Token count cannot be negative');
  }
  if (!isValidPriority(item.priority)) {
    throw new InvalidItemError('Invalid priority value');
  }
}

function validateBudget(budget: TokenBudget): void {
  if (budget.total <= 0) {
    throw new BudgetExceededError('Budget must be positive');
  }
  if (budget.reserved >= budget.total) {
    throw new BudgetExceededError('Reserved exceeds total budget');
  }
}
```

---

## Performance Considerations

### Token Count Caching

```typescript
class TokenCache {
  private cache = new Map<string, number>();

  get(key: string): number | undefined {
    return this.cache.get(key);
  }

  set(key: string, count: number): void {
    this.cache.set(key, count);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

> **Note:** Token caching is implemented at the `TokenizerAdapter` level, not in the planner. Each adapter maintains its own cache keyed by content hash. This keeps item creation decoupled from planner state.
```

### Lazy Token Counting

Token counts are calculated lazily on first access and cached for subsequent
uses. This reduces overhead when items are added but packing is deferred.

### Efficient Sorting

Strategies use efficient sorting algorithms (V8's Timsort via `Array.sort()`)
with O(n log n) complexity. For large item sets, consider pre-filtering or
bucketing by priority.

---

## Testing Strategy

### Unit Tests

- Each context item type
- Each strategy implementation
- Tokenizer adapters
- Budget calculations
- Priority resolution

### Integration Tests

- End-to-end packing workflows
- Multi-strategy scenarios
- Real tokenizer integration

### Property-Based Tests

- Random item sets with known constraints
- Boundary conditions (empty, full, over-full budgets)
- Priority edge cases

### Performance Benchmarks

```typescript
describe('Performance', () => {
  it('should pack 100 items in under 10ms', () => {
    const items = generateRandomItems(100);
    const planner = createPlanner();
    planner.addAll(items);

    const start = performance.now();
    planner.pack();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(10);
  });
});
```

---

## Security Considerations

1. **Input Sanitization**: Validate all input strings for injection attacks
2. **Memory Limits**: Prevent DoS via extremely large item sets
3. **Token Count Bounds**: Validate token counts are reasonable
4. **No External Code Execution**: Summarization is opt-in and user-controlled

---

## Versioning & Compatibility

### Semantic Versioning

- **Major**: Breaking API changes, strategy behavior changes
- **Minor**: New strategies, new tokenizers, new item types
- **Patch**: Bug fixes, performance improvements

### Breaking Changes to Avoid

- Changing `ContextItem` interface without migration
- Modifying strategy output format
- Removing tokenizer adapters
- Changing priority enum values

---

## Migration Guide (Future)

### From Inline Implementations

```typescript
// Before: Inline packing logic
function packContext(items, budget) {
  // Custom, inconsistent logic
}

// After: Using context-window-planner
import { ContextPlanner, strategies, tokenizers } from 'context-window-planner';

const planner = new ContextPlanner({
  budget: 128000,
  tokenizer: tokenizers.create('gpt-4'),
  strategy: strategies.priorityGreedy(),
});

planner.addAll(items);
const result = planner.pack();
```

---

## Conclusion

The `context-window-planner` architecture provides:

1. **Modularity**: Each component has a single responsibility
2. **Extensibility**: Easy to add new item types, strategies, and tokenizers
3. **Type Safety**: Full TypeScript support with strict types
4. **Performance**: Caching and efficient algorithms
5. **Testability**: Clear interfaces enable comprehensive testing

This architecture ensures the library can evolve to support new LLM providers,
packing strategies, and context item types without breaking existing
functionality.
