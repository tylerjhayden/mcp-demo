// ABOUTME: Tests for custom error types
// ABOUTME: Validates error type classification and MCP error code mapping

import { describe, it, expect } from '@jest/globals';
import {
  ValidationError,
  SecurityError,
  TimeoutError,
  NotFoundError,
  classifyError,
} from '../../shared/utils/custom-errors.js';
import { MCPErrorCode } from '../../shared/types/index.js';

describe('Custom Error Types', () => {
  describe('ValidationError', () => {
    it('should create validation error with message', () => {
      const error = new ValidationError('Invalid input');
      expect(error.message).toBe('Invalid input');
      expect(error.name).toBe('ValidationError');
      expect(error instanceof Error).toBe(true);
    });

    it('should classify as InvalidParams', () => {
      const error = new ValidationError('Test');
      const result = classifyError(error);
      expect(result.code).toBe(MCPErrorCode.InvalidParams);
      expect(result.category).toBe('VALIDATION');
    });
  });

  describe('SecurityError', () => {
    it('should create security error with message', () => {
      const error = new SecurityError('Access denied');
      expect(error.message).toBe('Access denied');
      expect(error.name).toBe('SecurityError');
    });

    it('should classify as InvalidParams', () => {
      const error = new SecurityError('Test');
      const result = classifyError(error);
      expect(result.code).toBe(MCPErrorCode.InvalidParams);
      expect(result.category).toBe('SECURITY');
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with message', () => {
      const error = new TimeoutError('Request timed out');
      expect(error.message).toBe('Request timed out');
      expect(error.name).toBe('TimeoutError');
    });

    it('should classify as RequestTimeout', () => {
      const error = new TimeoutError('Test');
      const result = classifyError(error);
      expect(result.code).toBe(MCPErrorCode.RequestTimeout);
      expect(result.category).toBe('TIMEOUT');
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with message', () => {
      const error = new NotFoundError('Resource not found');
      expect(error.message).toBe('Resource not found');
      expect(error.name).toBe('NotFoundError');
    });

    it('should classify as ResourceNotFound', () => {
      const error = new NotFoundError('Test');
      const result = classifyError(error);
      expect(result.code).toBe(MCPErrorCode.ResourceNotFound);
      expect(result.category).toBe('NOT_FOUND');
    });
  });

  describe('classifyError', () => {
    it('should classify custom errors by type', () => {
      expect(classifyError(new ValidationError('Test')).category).toBe('VALIDATION');
      expect(classifyError(new SecurityError('Test')).category).toBe('SECURITY');
      expect(classifyError(new TimeoutError('Test')).category).toBe('TIMEOUT');
      expect(classifyError(new NotFoundError('Test')).category).toBe('NOT_FOUND');
    });

    it('should classify generic errors as InternalError', () => {
      const error = new Error('Generic error');
      const result = classifyError(error);
      expect(result.code).toBe(MCPErrorCode.InternalError);
      expect(result.category).toBe('INTERNAL');
    });

    it('should preserve error messages', () => {
      const error = new ValidationError('Custom message');
      const result = classifyError(error);
      expect(result.message).toBe('Custom message');
    });
  });
});
