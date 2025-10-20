// ABOUTME: Utilities for error message extraction
// ABOUTME: Provides consistent error message handling across the codebase

/**
 * Extracts a string message from any error type
 */
export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
