/**
 * Tests for security utilities
 * Covers path sanitization and expression validation
 */

import { describe, it, expect } from '@jest/globals';
import {
  sanitizeFilePath,
  sanitizeExpression,
  validateExpression,
} from '../../shared/security/index.js';
import { PATH_TRAVERSAL_ATTEMPTS } from '../helpers/fixtures.js';

describe('Security Utilities', () => {
  describe('sanitizeFilePath', () => {
    it('should normalize valid paths', (): void => {
      const result = sanitizeFilePath('/tmp/test.txt', ['/tmp']);
      expect(result).toBeTruthy();
    });

    it('should reject path traversal attempts', (): void => {
      for (const maliciousPath of PATH_TRAVERSAL_ATTEMPTS) {
        expect((): string => sanitizeFilePath(maliciousPath, ['/tmp'])).toThrow();
      }
    });

    it('should reject paths outside allowed directories', (): void => {
      expect((): string => sanitizeFilePath('/etc/passwd', ['/tmp'])).toThrow();
    });

    it('should allow paths within allowed directories', (): void => {
      const result = sanitizeFilePath('/tmp/subdir/file.txt', ['/tmp']);
      expect(result).toContain('/tmp');
    });
  });

  describe('sanitizeExpression', () => {
    it('should allow safe mathematical expressions', (): void => {
      const result = sanitizeExpression('2 + 2');
      expect(result).toBe('2 + 2');
    });

    it('should remove dangerous patterns', (): void => {
      expect((): string => sanitizeExpression('eval("1")')).toThrow();
      expect((): string => sanitizeExpression('import("fs")')).toThrow();
      expect((): string => sanitizeExpression('__proto__')).toThrow();
    });
  });

  describe('validateExpression', () => {
    it('should accept valid expressions', (): void => {
      expect((): void => validateExpression('2 + 2')).not.toThrow();
      expect((): void => validateExpression('(5 + 3) * 2')).not.toThrow();
    });

    it('should reject dangerous expressions', (): void => {
      expect((): void => validateExpression('2 ** 3')).toThrow();
      expect((): void => validateExpression('1 / 0')).toThrow();
      expect((): void => validateExpression('+ 5')).toThrow();
    });
  });
});
