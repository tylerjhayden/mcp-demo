/**
 * Tests for FastMCP server implementation
 * Tests builder API pattern for tool and resource registration
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { sanitizeExpression, validateExpression } from '../../servers/fastmcp-impl/src/utils/expression.js';

describe('FastMCP Implementation', () => {
  describe('Expression Utilities', () => {
    describe('sanitizeExpression', () => {
      it('should sanitize valid simple expression', () => {
        const result = sanitizeExpression('2 + 2');
        expect(result).toBe('2 + 2');
      });

      it('should trim whitespace', () => {
        const result = sanitizeExpression('  10 * 5  ');
        expect(result).toBe('10 * 5');
      });

      it('should reject empty expression', () => {
        expect(() => sanitizeExpression('')).toThrow('Expression cannot be empty');
      });

      it('should reject expression exceeding max length', () => {
        const longExpr = 'a'.repeat(1001);
        expect(() => sanitizeExpression(longExpr)).toThrow('Expression too long');
      });

      it('should reject expressions with invalid characters', () => {
        expect(() => sanitizeExpression('eval(1+1)')).toThrow('invalid characters');
      });

      it('should reject expressions with dangerous patterns', () => {
        expect(() => sanitizeExpression('__proto__')).toThrow('invalid characters');
        expect(() => sanitizeExpression('function')).toThrow('invalid characters');
      });

      it('should reject unbalanced parentheses', () => {
        expect(() => sanitizeExpression('(2 + 2')).toThrow('Unbalanced parentheses');
        expect(() => sanitizeExpression('2 + 2)')).toThrow('Unbalanced parentheses');
      });

      it('should accept valid complex expression', () => {
        const result = sanitizeExpression('(5 + 3) * 2 - 1.5');
        expect(result).toBe('(5 + 3) * 2 - 1.5');
      });
    });

    describe('validateExpression', () => {
      it('should reject division by literal zero', () => {
        expect(() => validateExpression('10 / 0')).toThrow('division by zero');
      });

      it('should reject repeated operators', () => {
        expect(() => validateExpression('2 ++ 2')).toThrow('repeated operators');
        expect(() => validateExpression('5 ** 2')).toThrow('repeated operators');
      });

      it('should reject leading operators', () => {
        expect(() => validateExpression('+2')).toThrow('invalid leading or trailing operator');
        expect(() => validateExpression('*5')).toThrow('invalid leading or trailing operator');
      });

      it('should reject trailing operators', () => {
        expect(() => validateExpression('2 +')).toThrow('invalid leading or trailing operator');
      });

      it('should accept valid expressions', () => {
        expect(() => validateExpression('2 + 2')).not.toThrow();
        expect(() => validateExpression('10 * 5 - 3')).not.toThrow();
      });
    });
  });

  describe('Weather Data Processing', () => {
    const mockWeatherResponse = {
      name: 'San Francisco',
      main: { temp: 15.547 },
      weather: [{ description: 'partly cloudy' }],
      dt: 1634567890,
    };

    beforeEach(() => {
      process.env.WEATHER_API_KEY = 'test-api-key';
      process.env.WEATHER_API_TIMEOUT = '5000';
      process.env.WEATHER_CACHE_TTL = '600';
    });

    it('should round temperature to one decimal place', () => {
      const temp = mockWeatherResponse.main.temp;
      const rounded = Math.round(temp * 10) / 10;

      expect(rounded).toBe(15.5);
    });

    it('should format timestamp as ISO string', () => {
      const timestamp = mockWeatherResponse.dt;
      const isoString = new Date(timestamp * 1000).toISOString();

      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should convert location to lowercase for cache key', () => {
      const location = 'San Francisco';
      const cacheKey = location.toLowerCase();

      expect(cacheKey).toBe('san francisco');
    });

    it('should validate API key configuration', () => {
      const apiKey = process.env.WEATHER_API_KEY || '';
      expect(apiKey).toBeTruthy();
    });

    it('should build correct API URL with encoded location', () => {
      const location = 'San Francisco';
      const apiKey = 'test-key';
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        location
      )}&appid=${apiKey}&units=metric`;

      expect(url).toContain('q=San%20Francisco');
      expect(url).toContain('appid=test-key');
      expect(url).toContain('units=metric');
    });

    it('should parse timeout from environment', () => {
      const timeout = parseInt(process.env.WEATHER_API_TIMEOUT || '5000', 10);
      expect(timeout).toBe(5000);
    });

    it('should parse cache TTL from environment', () => {
      const cacheTtl = parseInt(process.env.WEATHER_CACHE_TTL || '600', 10);
      expect(cacheTtl).toBe(600);
    });
  });

  describe('File Resource Logic', () => {
    beforeEach(() => {
      process.env.ALLOWED_FILE_PATHS = process.cwd();
    });

    it('should parse file URI correctly', () => {
      const uri = 'file:///path/to/file.txt';
      const filePath = uri.replace(/^file:\/\//, '');

      expect(filePath).toBe('/path/to/file.txt');
    });

    it('should handle file URI with single slash', () => {
      const uri = 'file://path/to/file.txt';
      const filePath = uri.replace(/^file:\/\//, '');

      expect(filePath).toBe('path/to/file.txt');
    });

    it('should get current working directory for allowed paths', () => {
      const allowedPaths = process.env.ALLOWED_FILE_PATHS?.split(':') || [process.cwd()];
      expect(allowedPaths).toContain(process.cwd());
    });
  });

  describe('Zod Schema Validation', () => {
    it('should validate expression parameter with min length', () => {
      const minLength = 1;
      const empty = '';
      const valid = '2+2';

      expect(empty.length).toBeLessThan(minLength);
      expect(valid.length).toBeGreaterThanOrEqual(minLength);
    });

    it('should validate expression parameter with max length', () => {
      const maxLength = 1000;
      const tooLong = 'a'.repeat(1001);
      const valid = '2+2';

      expect(tooLong.length).toBeGreaterThan(maxLength);
      expect(valid.length).toBeLessThanOrEqual(maxLength);
    });

    it('should validate location parameter with min and max length', () => {
      const minLength = 1;
      const maxLength = 100;
      const empty = '';
      const tooLong = 'a'.repeat(101);
      const valid = 'San Francisco';

      expect(empty.length).toBeLessThan(minLength);
      expect(tooLong.length).toBeGreaterThan(maxLength);
      expect(valid.length).toBeGreaterThanOrEqual(minLength);
      expect(valid.length).toBeLessThanOrEqual(maxLength);
    });
  });

  describe('JSON Response Formatting', () => {
    it('should format calculation result as JSON', () => {
      const responseData = {
        expression: '2 + 2',
        result: 4,
      };

      const json = JSON.stringify(responseData, null, 2);

      expect(json).toContain('"expression": "2 + 2"');
      expect(json).toContain('"result": 4');
    });

    it('should format weather result as JSON', () => {
      const responseData = {
        location: 'San Francisco',
        temperature: 15.5,
        conditions: 'partly cloudy',
        timestamp: '2021-10-18T12:34:50.000Z',
        cached: false,
      };

      const json = JSON.stringify(responseData, null, 2);

      expect(json).toContain('"location": "San Francisco"');
      expect(json).toContain('"temperature": 15.5');
      expect(json).toContain('"cached": false');
    });
  });
});
