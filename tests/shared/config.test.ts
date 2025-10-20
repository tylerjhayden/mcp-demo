/**
 * Tests for configuration loading and validation
 */

import { jest, beforeEach, afterEach, describe, it, expect } from '@jest/globals';
import { loadConfiguration } from '../../shared/config/index.js';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach((): void => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach((): void => {
    process.env = originalEnv;
  });

  it('should load configuration with defaults', (): void => {
    process.env.NODE_ENV = 'test';
    process.env.API_KEYS = 'test-key';
    process.env.ALLOWED_FILE_PATHS = '/tmp';

    const config = loadConfiguration();

    expect(config.transport.mode).toBe('stdio');
    expect(config.nodeEnv).toBe('test');
  });

  it('should parse transport mode', (): void => {
    process.env.TRANSPORT_MODE = 'http';
    process.env.API_KEYS = 'key1';
    process.env.ALLOWED_FILE_PATHS = '/tmp';
    process.env.NODE_ENV = 'test';

    const config = loadConfiguration();

    expect(config.transport.mode).toBe('http');
  });

  it('should parse HTTP port', (): void => {
    process.env.HTTP_PORT = '4000';
    process.env.API_KEYS = 'key1';
    process.env.ALLOWED_FILE_PATHS = '/tmp';
    process.env.NODE_ENV = 'test';

    const config = loadConfiguration();

    expect(config.transport.httpPort).toBe(4000);
  });

  it('should require API keys for HTTP mode', (): void => {
    process.env.TRANSPORT_MODE = 'http';
    process.env.API_KEYS = '';
    process.env.ALLOWED_FILE_PATHS = '/tmp';

    expect((): void => {
      loadConfiguration();
    }).toThrow('HTTP transport requires at least one API key');
  });

  it('should validate HTTP port range', (): void => {
    process.env.TRANSPORT_MODE = 'http';
    process.env.HTTP_PORT = '99999';
    process.env.API_KEYS = 'key1';
    process.env.ALLOWED_FILE_PATHS = '/tmp';

    expect((): void => {
      loadConfiguration();
    }).toThrow('Invalid HTTP port');
  });
});
