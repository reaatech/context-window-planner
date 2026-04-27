/**
 * Priority levels for context window packing decisions.
 * Higher values indicate higher priority.
 *
 * @module
 */

export enum Priority {
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
