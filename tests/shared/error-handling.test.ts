// ABOUTME: Tests for error message extraction utility
// ABOUTME: Validates handling of Error objects, strings, and other types

import { describe, it, expect } from '@jest/globals';
import { extractErrorMessage } from '../../shared/utils/error-handling.js';

describe('extractErrorMessage', () => {
  it('should extract message from Error object', () => {
    const error = new Error('Something went wrong');
    expect(extractErrorMessage(error)).toBe('Something went wrong');
  });

  it('should convert string to string', () => {
    expect(extractErrorMessage('Plain string error')).toBe('Plain string error');
  });

  it('should convert number to string', () => {
    expect(extractErrorMessage(42)).toBe('42');
  });

  it('should convert null to string', () => {
    expect(extractErrorMessage(null)).toBe('null');
  });

  it('should convert undefined to string', () => {
    expect(extractErrorMessage(undefined)).toBe('undefined');
  });

  it('should convert object to string', () => {
    const obj = { code: 'ERR_001', details: 'Failed' };
    expect(extractErrorMessage(obj)).toBe('[object Object]');
  });

  it('should handle custom Error subclasses', () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }
    const error = new CustomError('Custom error message');
    expect(extractErrorMessage(error)).toBe('Custom error message');
  });
});
