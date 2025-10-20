/**
 * Token bucket entry for rate limiting
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * Rate limiter using token bucket algorithm
 * Tracks requests per client and enforces limits
 */
export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  /**
   * Creates a rate limiter
   * @param requestsPerMinute - Maximum requests per minute per client
   */
  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute;
    this.refillRate = requestsPerMinute / 60; // Convert to per-second rate
  }

  /**
   * Checks if a request should be allowed
   * @param clientId - Client identifier (IP address or API key)
   * @returns True if request is allowed, false if rate limited
   */
  checkLimit(clientId: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(clientId);

    if (!bucket) {
      // First request from this client
      bucket = {
        tokens: this.maxTokens - 1, // Consume one token for this request
        lastRefill: now,
      };
      this.buckets.set(clientId, bucket);
      return true;
    }

    // Refill tokens based on time elapsed
    const secondsElapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = secondsElapsed * this.refillRate;
    bucket.tokens = Math.min(this.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if we have tokens available
    if (bucket.tokens < 1) {
      return false; // Rate limited
    }

    // Consume a token
    bucket.tokens -= 1;
    return true;
  }

  /**
   * Gets remaining tokens for a client
   * @param clientId - Client identifier
   * @returns Number of available tokens
   */
  getRemainingTokens(clientId: string): number {
    const bucket = this.buckets.get(clientId);
    if (!bucket) {
      return this.maxTokens;
    }

    // Update tokens based on time elapsed
    const now = Date.now();
    const secondsElapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = secondsElapsed * this.refillRate;
    return Math.min(this.maxTokens, Math.floor(bucket.tokens + tokensToAdd));
  }

  /**
   * Gets retry-after time in seconds for a rate-limited client
   * @param clientId - Client identifier
   * @returns Seconds until next token is available
   */
  getRetryAfter(clientId: string): number {
    const remaining = this.getRemainingTokens(clientId);
    if (remaining > 0) {
      return 0;
    }

    // Time until one token is refilled
    return Math.ceil(1 / this.refillRate);
  }

  /**
   * Clears rate limit data for a client
   * @param clientId - Client identifier
   */
  reset(clientId: string): void {
    this.buckets.delete(clientId);
  }

  /**
   * Clears all rate limit data (useful for testing)
   */
  resetAll(): void {
    this.buckets.clear();
  }
}
