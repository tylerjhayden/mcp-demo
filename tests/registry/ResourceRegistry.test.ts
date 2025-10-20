/**
 * Tests for ResourceRegistry
 * Covers resource handler registration and URI matching
 */

import { ResourceRegistry } from '../../servers/bare-metal/registry/ResourceRegistry.js';
import { FileResourceHandler } from '../../servers/bare-metal/handlers/FileResourceHandler.js';
import type { CapabilityHandler, ExecutionContext, Result, ValidationResult } from '../../shared/types/index.js';

describe('ResourceRegistry', () => {
  let registry: ResourceRegistry;

  beforeEach((): void => {
    registry = new ResourceRegistry();
  });

  describe('register', () => {
    it('should register a resource handler', (): void => {
      const handler = new FileResourceHandler();
      const metadata = {
        uriScheme: 'file',
        name: 'File Resource',
        description: 'File system access',
        mimeTypes: ['text/plain', 'application/json'],
      };

      registry.register(metadata.uriScheme, handler, metadata);
      expect(registry.size()).toBe(1);
    });

    it('should accept any CapabilityHandler implementation', (): void => {
      // Create a custom handler that implements CapabilityHandler
      class CustomResourceHandler implements CapabilityHandler<{ uri: string }, { data: string }> {
        validate(_input: unknown): ValidationResult<{ uri: string }> {
          return { success: true, data: { uri: 'custom://test' } };
        }
        async execute(_params: { uri: string }, _context: ExecutionContext): Promise<Result<{ data: string }>> {
          return { success: true, data: { data: 'custom data' } };
        }
        handleError(_error: Error) {
          return { code: -32603, message: 'Error' };
        }
      }

      const customHandler = new CustomResourceHandler();
      const metadata = {
        uriScheme: 'custom',
        name: 'Custom Resource',
        description: 'Custom resource handler',
        mimeTypes: ['application/custom'],
      };

      registry.register(metadata.uriScheme, customHandler, metadata);
      expect(registry.size()).toBe(1);
      expect(registry.getForUri('custom://test')).toBe(customHandler);
    });
  });

  describe('getHandlerForUri', () => {
    it('should match file:// URIs to file handler', (): void => {
      const handler = new FileResourceHandler();
      const metadata = {
        uriScheme: 'file',
        name: 'File',
        description: 'Files',
        mimeTypes: ['text/plain'],
      };

      registry.register(metadata.uriScheme, handler, metadata);
      const matched = registry.getForUri('file:///tmp/test.txt');
      expect(matched).toBe(handler);
    });

    it('should return undefined for unknown scheme', (): void => {
      const matched = registry.getForUri('http://example.com');
      expect(matched).toBeUndefined();
    });

    it('should handle case-insensitive scheme matching', (): void => {
      const handler = new FileResourceHandler();
      const metadata = {
        uriScheme: 'file',
        name: 'File',
        description: 'Files',
        mimeTypes: ['text/plain'],
      };

      registry.register(metadata.uriScheme, handler, metadata);
      const matched = registry.getForUri('FILE:///test.txt');
      expect(matched).toBe(handler);
    });
  });

  describe('list', () => {
    it('should list all registered resource handlers', (): void => {
      const handler = new FileResourceHandler();
      const metadata = {
        uriScheme: 'file',
        name: 'File',
        description: 'Files',
        mimeTypes: ['text/plain'],
      };

      registry.register(metadata.uriScheme, handler, metadata);
      const resources = registry.list();

      expect(resources).toHaveLength(1);
      expect(resources[0]?.uriScheme).toBe('file');
    });
  });

  describe('clear', () => {
    it('should remove all registered handlers', (): void => {
      const handler = new FileResourceHandler();
      const metadata = {
        uriScheme: 'file',
        name: 'File',
        description: 'Files',
        mimeTypes: ['text/plain'],
      };

      registry.register(metadata.uriScheme, handler, metadata);
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });
});
