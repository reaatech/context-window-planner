/**
 * A warning generated during the packing process.
 *
 * @module
 */

import type { ContextItem } from './context-item.js';

/**
 * A warning generated during the packing process.
 */
export interface PackWarning {
  /** Warning code */
  readonly code: string;

  /** Human-readable warning message */
  readonly message: string;

  /** Related context item */
  readonly item?: ContextItem;

  /** Suggested resolution */
  readonly suggestion?: string;
}
