/**
 * CLI tool for context-window-planner.
 *
 * Reads context items from JSON on stdin and produces a packing plan.
 *
 * @module
 */

import { ContextPlanner, strategies, tokenizers } from 'context-window-planner';
import type { ContextItemType } from 'context-window-planner';

interface CliInput {
  budget: number;
  reserved?: number;
  model?: string;
  strategy?: string;
  strategyOptions?: Record<string, unknown>;
  items: Array<{
    id: string;
    type: string;
    content: string;
    priority: number;
    tokenCount?: number;
    metadata?: Record<string, unknown>;
  }>;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    process.stdin.on('error', reject);
  });
}

async function main(): Promise<void> {
  try {
    const raw = await readStdin();
    if (!raw.trim()) {
      console.error('Error: No input received on stdin. Pipe JSON to this command.');
      process.exit(1);
    }

    const parsed: CliInput = JSON.parse(raw);

    const t = tokenizers.create(parsed.model ?? 'mock');
    const s = strategies.create(parsed.strategy ?? 'priority-greedy', parsed.strategyOptions ?? {});

    const planner = new ContextPlanner({
      budget: parsed.budget,
      reserved: parsed.reserved ?? 0,
      tokenizer: t,
      strategy: s,
    });

    const contextItems = parsed.items.map((item) => ({
      id: item.id,
      type: item.type as ContextItemType,
      priority: item.priority,
      tokenCount: item.tokenCount ?? t.count(item.content),
      metadata: item.metadata,
      content: item.content,
      canSummarize() {
        return false;
      },
    }));

    planner.addAll(contextItems);

    const result = planner.pack();
    const plan = planner.plan();

    process.stdout.write(
      JSON.stringify(
        {
          packing: {
            included: result.included.length,
            summarize: result.summarize.length,
            dropped: result.dropped.length,
            usedTokens: result.usedTokens,
            remainingTokens: result.remainingTokens,
            warnings: result.warnings.map((w: { code: string; message: string }) => ({
              code: w.code,
              message: w.message,
            })),
          },
          turnPlan: plan,
        },
        null,
        2,
      ) + '\n',
    );
    process.exit(0);
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

void main();
