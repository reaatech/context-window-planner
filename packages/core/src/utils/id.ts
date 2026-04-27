/**
 * ID generation utility.
 *
 * @module
 */

/**
 * Generate a unique identifier.
 *
 * Uses `crypto.randomUUID` when available, falling back to a
 * time + random string.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
