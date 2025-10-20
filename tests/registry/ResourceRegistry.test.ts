/**
 * Tests for ResourceRegistry
 * Covers resource handler registration and URI matching
 */

import { ResourceRegistry } from '../../servers/bare-metal/registry/ResourceRegistry.js';
import { FileResourceHandler } from '../../servers/bare-metal/handlers/FileResourceHandler.js';

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

      registry.register(metadata, handler);
      expect(registry.size()).toBe(1);
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

      registry.register(metadata, handler);
      const matched = registry.getHandlerForUri('file:///tmp/test.txt');
      expect(matched).toBe(handler);
    });

    it('should return undefined for unknown scheme', (): void => {
      const matched = registry.getHandlerForUri('http://example.com');
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

      registry.register(metadata, handler);
      const matched = registry.getHandlerForUri('FILE:///test.txt');
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

      registry.register(metadata, handler);
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

      registry.register(metadata, handler);
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });
});
