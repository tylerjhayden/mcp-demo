/**
 * Tests for MessageRouter
 * Covers MCP method routing and response handling
 */

import { MessageRouter } from '../../servers/bare-metal/core/MessageRouter.js';
import { ToolRegistry } from '../../servers/bare-metal/registry/ToolRegistry.js';
import { ResourceRegistry } from '../../servers/bare-metal/registry/ResourceRegistry.js';
import { CalculateTool } from '../../servers/bare-metal/handlers/CalculateTool.js';
import { FileResourceHandler } from '../../servers/bare-metal/handlers/FileResourceHandler.js';
import { TestFactories } from '../helpers/factories.js';
import { MCP_REQUESTS } from '../helpers/fixtures.js';
import { MCPErrorCode } from '../../shared/types/index.js';

describe('MessageRouter', () => {
  let router: MessageRouter;
  let toolRegistry: ToolRegistry;
  let resourceRegistry: ResourceRegistry;
  let context: ReturnType<typeof TestFactories.standardContext>;

  beforeEach((): void => {
    toolRegistry = new ToolRegistry();
    resourceRegistry = new ResourceRegistry();
    router = new MessageRouter(toolRegistry, resourceRegistry);
    context = TestFactories.standardContext();
  });

  describe('tools/list', () => {
    it('should return list of registered tools', async (): Promise<void> => {
      const tool = new CalculateTool();
      const metadata = {
        name: 'calculate',
        description: 'Calculate expressions',
        inputSchema: { type: 'object', properties: {} },
      };
      toolRegistry.register(metadata.name, tool, metadata);

      const response = await router.route(MCP_REQUESTS.toolsList, context);

      if (response.error) {
        throw new Error('Expected success');
      }
      expect(response.result).toHaveProperty('tools');
      if (typeof response.result === 'object' && response.result !== null && 'tools' in response.result) {
        expect(Array.isArray(response.result.tools)).toBe(true);
      }
    });
  });

  describe('tools/call', () => {
    it('should execute tool and return result', async (): Promise<void> => {
      const tool = new CalculateTool();
      const metadata = {
        name: 'calculate',
        description: 'Calculate',
        inputSchema: { type: 'object', properties: {} },
      };
      toolRegistry.register(metadata.name, tool, metadata);

      const response = await router.route(MCP_REQUESTS.toolsCall, context);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
    });

    it('should return error for non-existent tool', async (): Promise<void> => {
      const request = {
        ...MCP_REQUESTS.toolsCall,
        params: { name: 'nonexistent', arguments: {} },
      };

      const response = await router.route(request, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(MCPErrorCode.MethodNotFound);
    });
  });

  describe('resources/list', () => {
    it('should return list of available resources', async (): Promise<void> => {
      const handler = new FileResourceHandler();
      const metadata = {
        uriScheme: 'file',
        name: 'File',
        description: 'Files',
        mimeTypes: ['text/plain'],
      };
      resourceRegistry.register(metadata.uriScheme, handler, metadata);

      const response = await router.route(MCP_REQUESTS.resourcesList, context);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
    });
  });

  describe('ping', () => {
    it('should respond to ping', async (): Promise<void> => {
      const response = await router.route(MCP_REQUESTS.ping, context);

      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
    });
  });

  describe('unknown methods', () => {
    it('should return method not found error', async (): Promise<void> => {
      const response = await router.route(MCP_REQUESTS.invalidMethod, context);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(MCPErrorCode.MethodNotFound);
    });
  });
});
