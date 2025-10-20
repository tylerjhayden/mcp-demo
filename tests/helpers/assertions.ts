/**
 * Custom Jest matchers for testing Result types and MCP responses
 * Provides type-safe assertions with clear error messages
 */

import { expect } from '@jest/globals';
import type {
  Result,
  SuccessResult,
  ErrorResult,
  MCPError,
  ValidationResult,
} from '../../shared/types/index.js';
import { MCPErrorCode } from '../../shared/types/index.js';

/**
 * Asserts that a Result is a success
 */
export function expectSuccess<T>(result: Result<T>): asserts result is SuccessResult<T> {
  if (!result.success) {
    throw new Error(
      `Expected success result but got error: ${JSON.stringify(result.error, null, 2)}`
    );
  }
}

/**
 * Asserts that a Result is an error
 */
export function expectError(result: Result<unknown>): asserts result is ErrorResult {
  if (result.success) {
    throw new Error(
      `Expected error result but got success: ${JSON.stringify(result.data, null, 2)}`
    );
  }
}

/**
 * Asserts that a Result is an error with a specific code
 */
export function expectErrorCode(result: Result<unknown>, expectedCode: MCPErrorCode): asserts result is ErrorResult {
  expectError(result);
  if (result.error.code !== expectedCode) {
    throw new Error(
      `Expected error code ${expectedCode} but got ${result.error.code}: ${result.error.message}`
    );
  }
}

/**
 * Asserts that a Result is an error with a message containing text
 */
export function expectErrorMessage(result: Result<unknown>, messageContains: string): asserts result is ErrorResult {
  expectError(result);
  if (!result.error.message.includes(messageContains)) {
    throw new Error(
      `Expected error message to contain "${messageContains}" but got: "${result.error.message}"`
    );
  }
}

/**
 * Asserts that a ValidationResult is a success
 */
export function expectValidationSuccess<T>(
  result: ValidationResult<T>
): asserts result is { success: true; data: T } {
  if (!result.success) {
    const issues = result.error?.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(
      `Expected validation success but got error:\n${result.error?.message}\n${issues}`
    );
  }
}

/**
 * Asserts that a ValidationResult is an error
 */
export function expectValidationError<T>(
  result: ValidationResult<T>
): asserts result is { success: false; error: { message: string; issues: Array<{ path: string[]; message: string }> } } {
  if (result.success) {
    throw new Error(
      `Expected validation error but got success: ${JSON.stringify(result.data, null, 2)}`
    );
  }
}

/**
 * Asserts that an MCPError has specific properties
 */
export function expectMCPError(
  error: MCPError,
  expectedCode: MCPErrorCode,
  messageContains?: string
): void {
  expect(error.code).toBe(expectedCode);
  if (messageContains) {
    expect(error.message).toContain(messageContains);
  }
}

/**
 * Asserts that a JSON-RPC response is successful
 */
export function expectJsonRpcSuccess<T>(
  response: unknown
): asserts response is { jsonrpc: string; result: T; id: number | string } {
  if (
    typeof response !== 'object' ||
    response === null ||
    !('result' in response) ||
    !('jsonrpc' in response)
  ) {
    throw new Error(
      `Expected JSON-RPC success response but got: ${JSON.stringify(response, null, 2)}`
    );
  }
}

/**
 * Asserts that a JSON-RPC response is an error
 */
export function expectJsonRpcError(
  response: unknown
): asserts response is { jsonrpc: string; error: MCPError; id: number | string } {
  if (
    typeof response !== 'object' ||
    response === null ||
    !('error' in response) ||
    !('jsonrpc' in response)
  ) {
    throw new Error(
      `Expected JSON-RPC error response but got: ${JSON.stringify(response, null, 2)}`
    );
  }
}

/**
 * Custom Jest matchers
 */
export const customMatchers = {
  /**
   * Matcher for success results
   */
  toBeSuccessResult(received: unknown): jest.CustomMatcherResult {
    const pass = typeof received === 'object' &&
      received !== null &&
      'success' in received &&
      received.success === true;

    return {
      pass,
      message: (): string =>
        pass
          ? `Expected result not to be a success`
          : `Expected result to be a success but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  /**
   * Matcher for error results
   */
  toBeErrorResult(received: unknown): jest.CustomMatcherResult {
    const pass = typeof received === 'object' &&
      received !== null &&
      'success' in received &&
      received.success === false;

    return {
      pass,
      message: (): string =>
        pass
          ? `Expected result not to be an error`
          : `Expected result to be an error but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  /**
   * Matcher for specific error codes
   */
  toHaveErrorCode(received: unknown, expectedCode: MCPErrorCode): jest.CustomMatcherResult {
    if (
      typeof received !== 'object' ||
      received === null ||
      !('success' in received) ||
      received.success !== false
    ) {
      return {
        pass: false,
        message: (): string => `Expected an error result but got: ${JSON.stringify(received)}`,
      };
    }

    const errorResult = received as ErrorResult;
    const pass = errorResult.error.code === expectedCode;

    return {
      pass,
      message: (): string =>
        pass
          ? `Expected error code not to be ${expectedCode}`
          : `Expected error code ${expectedCode} but got ${errorResult.error.code}`,
    };
  },

  /**
   * Matcher for validation success
   */
  toBeValidationSuccess(received: unknown): jest.CustomMatcherResult {
    const pass = typeof received === 'object' &&
      received !== null &&
      'success' in received &&
      received.success === true &&
      'data' in received;

    return {
      pass,
      message: (): string =>
        pass
          ? `Expected validation not to be successful`
          : `Expected validation to be successful but got: ${JSON.stringify(received, null, 2)}`,
    };
  },

  /**
   * Matcher for validation errors
   */
  toBeValidationError(received: unknown): jest.CustomMatcherResult {
    const pass = typeof received === 'object' &&
      received !== null &&
      'success' in received &&
      received.success === false &&
      'error' in received;

    return {
      pass,
      message: (): string =>
        pass
          ? `Expected validation not to fail`
          : `Expected validation to fail but got: ${JSON.stringify(received, null, 2)}`,
    };
  },
};

/**
 * Extends Jest matchers
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeSuccessResult(): R;
      toBeErrorResult(): R;
      toHaveErrorCode(expectedCode: MCPErrorCode): R;
      toBeValidationSuccess(): R;
      toBeValidationError(): R;
    }
  }
}

/**
 * Register custom matchers with Jest
 */
export function setupCustomMatchers(): void {
  expect.extend(customMatchers);
}
