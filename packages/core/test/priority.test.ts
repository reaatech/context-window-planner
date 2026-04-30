/**
 * Tests for Priority enum
 *
 * @vitest
 */

import { describe, expect, it } from 'vitest';

import { Priority } from '../src/types/priority.js';

describe('Priority', () => {
  describe('values', () => {
    it('should have Critical as highest priority', () => {
      expect(Priority.Critical).toBe(100);
    });

    it('should have High priority', () => {
      expect(Priority.High).toBe(75);
    });

    it('should have Medium priority', () => {
      expect(Priority.Medium).toBe(50);
    });

    it('should have Low priority', () => {
      expect(Priority.Low).toBe(25);
    });

    it('should have Disposable as lowest priority', () => {
      expect(Priority.Disposable).toBe(0);
    });
  });

  describe('ordering', () => {
    it('should have correct priority ordering', () => {
      expect(Priority.Critical).toBeGreaterThan(Priority.High);
      expect(Priority.High).toBeGreaterThan(Priority.Medium);
      expect(Priority.Medium).toBeGreaterThan(Priority.Low);
      expect(Priority.Low).toBeGreaterThan(Priority.Disposable);
    });

    it('should sort items by priority correctly', () => {
      const items = [
        { priority: Priority.Low },
        { priority: Priority.Critical },
        { priority: Priority.Medium },
        { priority: Priority.High },
      ];

      const sorted = items.sort((a, b) => b.priority - a.priority);

      expect(sorted[0].priority).toBe(Priority.Critical);
      expect(sorted[1].priority).toBe(Priority.High);
      expect(sorted[2].priority).toBe(Priority.Medium);
      expect(sorted[3].priority).toBe(Priority.Low);
    });
  });
});
