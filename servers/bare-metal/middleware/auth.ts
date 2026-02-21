import { timingSafeEqual } from 'crypto';
import type { Configuration } from '../../../shared/types/index.js';
import { Logger } from 'pino';

function isValidApiKey(token: string, validKeys: string[]): boolean {
  const tokenBuf = Buffer.from(token);
  return validKeys.some((key) => {
    const keyBuf = Buffer.from(key);
    return tokenBuf.length === keyBuf.length && timingSafeEqual(tokenBuf, keyBuf);
  });
}

/**
 * Authentication result
 */
export interface AuthResult {
  authenticated: boolean;
  reason?: string;
}

/**
 * Authenticates HTTP requests using Bearer token
 * @param authHeader - Authorization header value
 * @param config - Configuration with API keys
 * @returns Authentication result
 */
export function authenticateHttpRequest(
  authHeader: string | undefined,
  config: Configuration
): AuthResult {
  if (!authHeader) {
    return {
      authenticated: false,
      reason: 'Missing Authorization header',
    };
  }

  // Expected format: "Bearer <api_key>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      authenticated: false,
      reason: 'Invalid Authorization header format (expected: Bearer <token>)',
    };
  }

  const token = parts[1];
  if (!token) {
    return {
      authenticated: false,
      reason: 'Empty API key',
    };
  }

  // Check if token is in allowed API keys (constant-time comparison)
  if (!isValidApiKey(token, config.security.apiKeys)) {
    return {
      authenticated: false,
      reason: 'Invalid API key',
    };
  }

  return {
    authenticated: true,
  };
}

/**
 * Authenticates stdio requests (always passes - relies on OS permissions)
 * @returns Authentication result (always success for stdio)
 */
export function authenticateStdioRequest(): AuthResult {
  return {
    authenticated: true,
  };
}

/**
 * Logs failed authentication attempt
 * @param logger - Logger instance
 * @param reason - Failure reason
 * @param metadata - Additional context
 */
export function logAuthFailure(
  logger: Logger,
  reason: string,
  metadata?: Record<string, unknown>
): void {
  logger.warn(
    {
      authFailure: true,
      reason,
      ...metadata,
    },
    'Authentication failed'
  );
}
