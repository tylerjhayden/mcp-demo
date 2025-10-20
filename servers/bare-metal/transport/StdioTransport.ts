import * as readline from 'readline';
import type { Logger } from 'pino';
import type { MessageRouter, MCPRequest } from '../core/MessageRouter.js';
import type { ExecutionContext } from '../../../shared/types/index.js';
import { generateTraceId } from '../../../shared/observability/index.js';
import { authenticateStdioRequest } from '../middleware/index.js';

/**
 * Stdio transport for MCP
 * Handles JSON-RPC messages over stdin/stdout
 */
export class StdioTransport {
  private rl: readline.Interface;
  private running: boolean = false;

  constructor(
    private router: MessageRouter,
    private createContext: (traceId: string) => ExecutionContext,
    private logger: Logger
  ) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
  }

  /**
   * Starts the stdio transport
   * Begins reading from stdin and processing MCP messages
   */
  start(): void {
    if (this.running) {
      throw new Error('Stdio transport is already running');
    }

    this.running = true;
    this.logger.info('Stdio transport started');

    this.rl.on('line', (line) => {
      void this.handleMessage(line);
    });

    this.rl.on('close', () => {
      this.logger.info('Stdin closed, shutting down');
      this.stop();
    });

    // Handle process signals
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down gracefully');
      this.stop();
    });

    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down gracefully');
      this.stop();
    });
  }

  /**
   * Stops the stdio transport
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.rl.close();
    this.logger.info('Stdio transport stopped');
    process.exit(0);
  }

  /**
   * Handles an incoming message line
   * @param line - JSON-RPC message line from stdin
   */
  private async handleMessage(line: string): Promise<void> {
    const traceId = generateTraceId();
    const context = this.createContext(traceId);

    try {
      // Parse JSON-RPC request
      const request: MCPRequest = JSON.parse(line);

      context.logger.info(
        { method: request.method, id: request.id, traceId },
        'Received MCP request via stdio'
      );

      // Authenticate (stdio always passes - relies on OS permissions)
      const authResult = authenticateStdioRequest();
      if (!authResult.authenticated) {
        // This should never happen for stdio, but handle it anyway
        const errorResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32000,
            message: 'Authentication failed',
          },
        };
        this.sendResponse(errorResponse);
        return;
      }

      // Route request
      const response = await this.router.route(request, context);

      // Send response to stdout
      this.sendResponse(response);
    } catch (error) {
      context.logger.error(
        { error: error instanceof Error ? error.message : String(error), traceId },
        'Failed to process message'
      );

      // Send error response
      const errorResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: {
            error: error instanceof Error ? error.message : String(error),
          },
        },
      };
      this.sendResponse(errorResponse);
    }
  }

  /**
   * Sends a JSON-RPC response to stdout
   * @param response - MCP response object
   */
  private sendResponse(response: unknown): void {
    const json = JSON.stringify(response);
    // Write to stdout (not console.log, which may add extra formatting)
    process.stdout.write(json + '\n');
  }

  /**
   * Checks if transport is running
   */
  isRunning(): boolean {
    return this.running;
  }
}
