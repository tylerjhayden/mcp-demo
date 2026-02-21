/**
 * Tests for RateLimiter
 * Covers token bucket behavior and idle bucket eviction
 */

import { jest } from '@jest/globals';
import { RateLimiter } from '../../servers/bare-metal/middleware/rate-limit.js';

describe('RateLimiter', () => {
  describe('basic rate limiting', () => {
    it('allows requests under the limit', (): void => {
      const limiter = new RateLimiter(10);
      for (let i = 0; i < 10; i++) {
        expect(limiter.checkLimit('client-a')).toBe(true);
      }
    });

    it('blocks requests over the limit', (): void => {
      const limiter = new RateLimiter(2);
      expect(limiter.checkLimit('client-a')).toBe(true);
      expect(limiter.checkLimit('client-a')).toBe(true);
      expect(limiter.checkLimit('client-a')).toBe(false);
    });

    it('tracks clients independently', (): void => {
      const limiter = new RateLimiter(1);
      expect(limiter.checkLimit('client-a')).toBe(true);
      expect(limiter.checkLimit('client-b')).toBe(true); // different bucket
      expect(limiter.checkLimit('client-a')).toBe(false);
    });
  });

  describe('memory cleanup', () => {
    it('removes idle buckets after full refill and eviction sweep', (): void => {
      jest.useFakeTimers();
      const limiter = new RateLimiter(60);

      // Make enough requests to trigger a sweep (CLEANUP_INTERVAL = 100)
      for (let i = 0; i < 99; i++) {
        limiter.checkLimit(`bulk-client-${i}`);
      }
      expect(limiter.getBucketCount()).toBe(99);

      // Advance time past the idle TTL (2 minutes)
      jest.advanceTimersByTime(3 * 60 * 1000);

      // This 100th call triggers the sweep — all 99 previous buckets are idle
      // and fully refilled (60 tokens refilled in 3 minutes), so they get evicted
      limiter.checkLimit('trigger-client');

      // Only the trigger client's fresh bucket should remain
      expect(limiter.getBucketCount()).toBe(1);

      jest.useRealTimers();
    });

    it('does not evict buckets that are still active', (): void => {
      jest.useFakeTimers();
      const limiter = new RateLimiter(60);

      for (let i = 0; i < 99; i++) {
        limiter.checkLimit(`bulk-client-${i}`);
      }

      // Advance time but NOT past idle TTL
      jest.advanceTimersByTime(30 * 1000); // only 30 seconds

      limiter.checkLimit('trigger-client');

      // All 99 + the trigger client should still be present
      expect(limiter.getBucketCount()).toBe(100);

      jest.useRealTimers();
    });
  });
});
