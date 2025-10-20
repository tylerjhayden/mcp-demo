import type { ExecutionContext, MCPError } from '../../../shared/types/index.js';
import { MCPErrorCode } from '../../../shared/types/index.js';
import type { ToolRegistry } from '../registry/ToolRegistry.js';
import type { ResourceRegistry } from '../registry/ResourceRegistry.js';
import { extractErrorMessage } from '../../../shared/utils/error-handling.js';

/**
 * MCP JSON-RPC request
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC response (success)
 */
export interface MCPSuccessResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: unknown;
}

/**
 * MCP JSON-RPC response (error)
 */
export interface MCPErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: Record<string, unknown>;
  };
}

/**
 * MCP response type
 */
export type MCPResponse = MCPSuccessResponse | MCPErrorResponse;

/**
 * Message router for MCP requests
 * Routes incoming MCP method calls to appropriate handlers
 */
export class MessageRouter {
  constructor(
    private toolRegistry: ToolRegistry,
    private resourceRegistry: ResourceRegistry
  ) {}

  /**
   * Routes an MCP request to the appropriate handler
   * @param request - MCP JSON-RPC request
   * @param context - Execution context
   * @returns MCP JSON-RPC response
   */
  async route(request: MCPRequest, context: ExecutionContext): Promise<MCPResponse> {
    const startTime = Date.now();

    try {
      context.logger.info({ method: request.method, id: request.id }, 'Routing MCP request');

      // Validate request format
      if (request.jsonrpc !== '2.0') {
        return this.errorResponse(request.id, {
          code: MCPErrorCode.InvalidRequest,
          message: 'Invalid JSON-RPC version (must be 2.0)',
        });
      }

      // Route to appropriate handler based on method
      let result: unknown;

      switch (request.method) {
        case 'tools/list':
          result = this.handleToolsList();
          break;

        case 'tools/call':
          // Check if tool exists first to return proper error code
          if (!request.params || typeof request.params.name !== 'string') {
            return this.errorResponse(request.id, {
              code: MCPErrorCode.InvalidRequest,
              message: 'Missing or invalid tool name',
            });
          }
          if (!this.toolRegistry.has(request.params.name)) {
            return this.errorResponse(request.id, {
              code: MCPErrorCode.MethodNotFound,
              message: `Tool not found: ${request.params.name}`,
            });
          }
          result = await this.handleToolsCall(request.params, context);
          break;

        case 'resources/list':
          result = await this.handleResourcesList(context);
          break;

        case 'resources/read':
          result = await this.handleResourcesRead(request.params, context);
          break;

        case 'ping':
          result = { status: 'ok' };
          break;

        default:
          return this.errorResponse(request.id, {
            code: MCPErrorCode.MethodNotFound,
            message: `Method not found: ${request.method}`,
          });
      }

      // Check if result is already an error response
      if (this.isErrorResult(result)) {
        const duration = Date.now() - startTime;
        context.metrics.recordDuration('request_duration_ms', duration, {
          method: request.method,
        });
        context.metrics.incrementCounter('request_error_total', {
          method: request.method,
          error_type: result.code.toString(),
        });

        return this.errorResponse(request.id, result);
      }

      const duration = Date.now() - startTime;
      context.metrics.recordDuration('request_duration_ms', duration, {
        method: request.method,
      });
      context.metrics.incrementCounter('request_success_total', {
        method: request.method,
      });

      context.logger.info(
        { method: request.method, id: request.id, durationMs: duration },
        'MCP request completed successfully'
      );

      return this.successResponse(request.id, result);
    } catch (error) {
      const duration = Date.now() - startTime;
      context.metrics.recordDuration('request_duration_ms', duration, {
        method: request.method,
      });
      context.metrics.incrementCounter('request_error_total', {
        method: request.method,
        error_type: error instanceof Error ? error.name : 'unknown',
      });

      context.logger.error(
        {
          method: request.method,
          id: request.id,
          error: extractErrorMessage(error),
        },
        'MCP request failed'
      );

      return this.errorResponse(request.id, {
        code: MCPErrorCode.InternalError,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handles tools/list method
   */
  private handleToolsList(): unknown {
    const tools = this.toolRegistry.list();
    return { tools };
  }

  /**
   * Checks if a result is an MCP error
   */
  private isErrorResult(result: unknown): result is MCPError {
    return (
      typeof result === 'object' &&
      result !== null &&
      'code' in result &&
      'message' in result
    );
  }

  /**
   * Handles tools/call method
   */
  private async handleToolsCall(
    params: Record<string, unknown> | undefined,
    context: ExecutionContext
  ): Promise<unknown> {
    // Tool name validation and existence check now done in route() method
    const toolName = params!.name as string;
    const handler = this.toolRegistry.get(toolName)!;

    // Validate parameters
    const validationResult = handler.validate(params.arguments || {});
    if (!validationResult.success) {
      const error = new Error(validationResult.error?.message || 'Validation failed');
      return handler.handleError(error);
    }

    // Execute handler
    const result = await handler.execute(validationResult.data!, context);

    if (!result.success) {
      return result.error;
    }

    return result.data;
  }

  /**
   * Handles resources/list method
   */
  private async handleResourcesList(context: ExecutionContext): Promise<unknown> {
    const fileHandler = this.resourceRegistry.get('file');

    if (!fileHandler) {
      return { resources: [] };
    }

    const files = await fileHandler.listResources(context);

    return {
      resources: files.map((file) => ({
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType,
      })),
    };
  }

  /**
   * Handles resources/read method
   */
  private async handleResourcesRead(
    params: Record<string, unknown> | undefined,
    context: ExecutionContext
  ): Promise<unknown> {
    if (!params || typeof params.uri !== 'string') {
      throw new Error('Missing or invalid resource URI');
    }

    const uri = params.uri;
    const handler = this.resourceRegistry.getForUri(uri);

    if (!handler) {
      throw new Error(`No handler for URI: ${uri}`);
    }

    // Validate parameters
    const validationResult = handler.validate({ uri });
    if (!validationResult.success) {
      throw new Error(
        `Invalid URI: ${validationResult.error?.message || 'Validation failed'}`
      );
    }

    // Execute handler
    const result = await handler.execute(validationResult.data!, context);

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return {
      contents: [
        {
          uri: result.data.uri,
          mimeType: result.data.mimeType,
          text: result.data.content,
        },
      ],
    };
  }

  /**
   * Creates a success response
   */
  private successResponse(id: string | number, result: unknown): MCPSuccessResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }

  /**
   * Creates an error response
   */
  private errorResponse(
    id: string | number | null,
    error: MCPError
  ): MCPErrorResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: error.code,
        message: error.message,
        data: error.data,
      },
    };
  }
}
