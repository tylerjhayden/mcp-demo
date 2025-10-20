/**
 * Tests for ToolRegistry
 * Covers tool registration, lookup, and metadata management
 */

import { ToolRegistry } from '../../servers/bare-metal/registry/ToolRegistry.js';
import { CalculateTool } from '../../servers/bare-metal/handlers/CalculateTool.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach((): void => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('should register a tool', (): void => {
      const tool = new CalculateTool();
      const metadata = {
        name: 'calculate',
        description: 'Evaluates mathematical expressions',
        inputSchema: {
          type: 'object' as const,
          properties: {
            expression: { type: 'string' as const },
          },
          required: ['expression'],
        },
      };

      registry.register(metadata, tool);
      expect(registry.size()).toBe(1);
    });

    it('should allow re-registration', (): void => {
      const tool1 = new CalculateTool();
      const tool2 = new CalculateTool();
      const metadata = {
        name: 'calculate',
        description: 'Test',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      };

      registry.register(metadata, tool1);
      registry.register(metadata, tool2);
      expect(registry.size()).toBe(1);
    });
  });

  describe('get', () => {
    it('should retrieve registered tool', (): void => {
      const tool = new CalculateTool();
      const metadata = {
        name: 'calculate',
        description: 'Test',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      };

      registry.register(metadata, tool);
      const retrieved = registry.get('calculate');
      expect(retrieved).toBe(tool);
    });

    it('should return undefined for unregistered tool', (): void => {
      const retrieved = registry.get('nonexistent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list all registered tools', (): void => {
      const tool = new CalculateTool();
      const metadata = {
        name: 'calculate',
        description: 'Calc',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      };

      registry.register(metadata, tool);
      const tools = registry.list();

      expect(tools).toHaveLength(1);
      expect(tools[0]?.name).toBe('calculate');
    });

    it('should return empty array when no tools registered', (): void => {
      const tools = registry.list();
      expect(tools).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all registered tools', (): void => {
      const tool = new CalculateTool();
      const metadata = {
        name: 'calculate',
        description: 'Test',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      };

      registry.register(metadata, tool);
      registry.clear();
      expect(registry.size()).toBe(0);
    });
  });
});
