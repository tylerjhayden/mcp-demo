/**
 * Tests for authentication functions
 * Covers API key validation
 */

import { authenticateHttpRequest, authenticateStdioRequest } from '../../servers/bare-metal/middleware/auth.js';
import { createMockConfiguration } from '../helpers/mocks.js';

describe('Authentication', () => {
  describe('authenticateHttpRequest', () => {
    it('should accept valid API key', (): void => {
      const config = createMockConfiguration({
        security: { apiKeys: ['test-key-1'], allowedFilePaths: [], rateLimitRequestsPerMinute: 60 },
      });

      const result = authenticateHttpRequest('Bearer test-key-1', config);

      expect(result.authenticated).toBe(true);
    });

    it('should reject invalid API key', (): void => {
      const config = createMockConfiguration({
        security: { apiKeys: ['test-key-1'], allowedFilePaths: [], rateLimitRequestsPerMinute: 60 },
      });

      const result = authenticateHttpRequest('Bearer invalid-key', config);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('Invalid API key');
    });

    it('should reject missing authorization header', (): void => {
      const config = createMockConfiguration({
        security: { apiKeys: ['test-key-1'], allowedFilePaths: [], rateLimitRequestsPerMinute: 60 },
      });

      const result = authenticateHttpRequest(undefined, config);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('Missing Authorization header');
    });

    it('should reject malformed authorization header', (): void => {
      const config = createMockConfiguration({
        security: { apiKeys: ['test-key-1'], allowedFilePaths: [], rateLimitRequestsPerMinute: 60 },
      });

      const result = authenticateHttpRequest('InvalidFormat', config);

      expect(result.authenticated).toBe(false);
      expect(result.reason).toContain('Invalid Authorization header format');
    });
  });

  describe('authenticateStdioRequest', () => {
    it('should always return authenticated', (): void => {
      const result = authenticateStdioRequest();

      expect(result.authenticated).toBe(true);
    });
  });
});
