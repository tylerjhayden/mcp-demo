// ABOUTME: Custom error types for type-safe error handling
// ABOUTME: Eliminates fragile string-based error classification

import { MCPErrorCode } from '../types/index.js';

/**
 * Validation error for invalid parameters or inputs
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Security error for forbidden operations or unauthorized access
 */
export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Timeout error for operations that exceed time limits
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Not found error for missing resources or data
 */
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  code: MCPErrorCode;
  category: string;
  message: string;
}

/**
 * Classifies an error and maps it to the appropriate MCP error code
 */
export function classifyError(error: Error): ErrorClassification {
  if (error instanceof ValidationError) {
    return {
      code: MCPErrorCode.InvalidParams,
      category: 'VALIDATION',
      message: error.message,
    };
  }

  if (error instanceof SecurityError) {
    return {
      code: MCPErrorCode.InvalidParams,
      category: 'SECURITY',
      message: error.message,
    };
  }

  if (error instanceof TimeoutError) {
    return {
      code: MCPErrorCode.RequestTimeout,
      category: 'TIMEOUT',
      message: error.message,
    };
  }

  if (error instanceof NotFoundError) {
    return {
      code: MCPErrorCode.ResourceNotFound,
      category: 'NOT_FOUND',
      message: error.message,
    };
  }

  // Generic errors are internal errors
  return {
    code: MCPErrorCode.InternalError,
    category: 'INTERNAL',
    message: error.message,
  };
}
