#!/usr/bin/env node

import { loadConfiguration } from '../../shared/config/index.js';
import { createLogger, createRequestLogger, InMemoryMetricsRecorder } from '../../shared/observability/index.js';
import { SimpleHttpClient } from '../../shared/utils/http-client.js';
import type { ExecutionContext } from '../../shared/types/index.js';
import { CalculateTool } from './handlers/CalculateTool.js';
import { WeatherTool } from './handlers/WeatherTool.js';
import { FileResourceHandler } from './handlers/FileResourceHandler.js';
import { ToolRegistry } from './registry/ToolRegistry.js';
import { ResourceRegistry } from './registry/ResourceRegistry.js';
import { MessageRouter } from './core/MessageRouter.js';
import { StdioTransport } from './transport/StdioTransport.js';
import { HttpTransport } from './transport/HttpTransport.js';

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  try {
    // Load configuration
    const config = loadConfiguration();

    // Create logger
    const logger = createLogger({
      level: config.observability.logLevel,
      format: config.observability.logFormat,
      transport: config.transport.mode,
    });

    logger.info({ config }, 'Starting MCP Demo Server');

    // Create shared metrics recorder
    const metrics = new InMemoryMetricsRecorder();

    // Create HTTP client
    const httpClient = new SimpleHttpClient(config.weather.timeout);

    // Create execution context factory
    const createContext = (traceId: string): ExecutionContext => {
      const requestLogger = createRequestLogger(logger, traceId);
      return {
        logger: requestLogger,
        metrics,
        config,
        httpClient,
        traceId,
      };
    };

    // Initialize tool registry
    const toolRegistry = new ToolRegistry();

    toolRegistry.register('calculate', new CalculateTool(), {
      name: 'calculate',
      description: 'Evaluates mathematical expressions safely',
      inputSchema: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")',
          },
        },
        required: ['expression'],
      },
    });

    toolRegistry.register('get_weather', new WeatherTool(), {
      name: 'get_weather',
      description: 'Fetches current weather data for a location',
      inputSchema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name or coordinates',
          },
        },
        required: ['location'],
      },
    });

    logger.info({ toolCount: toolRegistry.size() }, 'Tools registered');

    // Initialize resource registry
    const resourceRegistry = new ResourceRegistry();

    resourceRegistry.register('file', new FileResourceHandler(), {
      uriScheme: 'file',
      description: 'Provides safe read access to files in allowed directories',
      mimeTypes: ['text/plain', 'application/json', 'text/markdown'],
    });

    logger.info({ resourceCount: resourceRegistry.size() }, 'Resources registered');

    // Create message router
    const router = new MessageRouter(toolRegistry, resourceRegistry);

    // Start appropriate transport
    if (config.transport.mode === 'stdio') {
      const transport = new StdioTransport(router, createContext, logger);
      transport.start();
      logger.info('Running in stdio mode');
    } else {
      const transport = new HttpTransport(router, createContext, config, logger, metrics);
      await transport.start();
      logger.info({ port: config.transport.httpPort }, 'Running in HTTP mode');

      // Graceful shutdown for HTTP
      const shutdown = async (): Promise<void> => {
        logger.info('Shutting down gracefully...');
        await transport.stop();
        logger.info('Shutdown complete');
        process.exit(0);
      };

      process.on('SIGTERM', () => void shutdown());
      process.on('SIGINT', () => void shutdown());
    }
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
