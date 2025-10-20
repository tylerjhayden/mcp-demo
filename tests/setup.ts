/**
 * Jest setup file for strict test environment
 * - Fails tests on console.warn/console.error
 * - Catches unhandled promise rejections
 * - Ensures clean test isolation
 * - Registers custom matchers
 */

import { jest, beforeEach, afterEach } from '@jest/globals';
import { setupCustomMatchers } from './helpers/assertions.js';

// Store original console methods
const originalWarn = console.warn;
const originalError = console.error;

// Override console.warn to fail tests
console.warn = (...args: unknown[]): void => {
  originalWarn(...args);
  throw new Error(
    `Test failed: console.warn was called with: ${JSON.stringify(args)}`
  );
};

// Override console.error to fail tests
console.error = (...args: unknown[]): void => {
  originalError(...args);
  throw new Error(
    `Test failed: console.error was called with: ${JSON.stringify(args)}`
  );
};

// Ensure unhandled promise rejections fail tests
process.on('unhandledRejection', (reason: unknown) => {
  throw new Error(
    `Unhandled promise rejection: ${reason instanceof Error ? reason.message : JSON.stringify(reason)}`
  );
});

// Register custom Jest matchers
setupCustomMatchers();

// Reset modules between tests to ensure clean state
beforeEach((): void => {
  jest.clearAllMocks();
});

afterEach((): void => {
  jest.restoreAllMocks();
});
