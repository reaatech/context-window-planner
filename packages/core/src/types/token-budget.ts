/**
 * Manages the total token allocation and tracks usage.
 *
 * @module
 */

/**
 * Manages the total token allocation and tracks usage.
 */
export class TokenBudget {
  /** Total available tokens */
  readonly total: number;

  /** Reserved tokens for generation buffer */
  readonly reserved: number;

  constructor(total: number, reserved: number) {
    this.total = total;
    this.reserved = reserved;
  }

  /** Available tokens for content (total - reserved) */
  get available(): number {
    return this.total - this.reserved;
  }
}
