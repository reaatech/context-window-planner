/**
 * Result of a packing operation, containing decisions about what to include,
 * summarize, or drop.
 *
 * @module
 */

import type { ContextItem } from './context-item.js';
import type { PackWarning } from './pack-warning.js';

/**
 * Result of a packing operation, containing decisions about what to include,
 * summarize, or drop.
 */
export interface PackingResult {
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
  readonly warnings: ReadonlyArray<PackWarning>;
}
