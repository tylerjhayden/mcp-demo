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

    logger.info('='.repeat(60));
    logger.info('MCP Demo Server');
    logger.info('='.repeat(60));
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Log Level: ${config.observability.logLevel}`);
    logger.info(`Transport: ${config.transport.mode}${config.transport.mode === 'http' ? ` (port ${config.transport.httpPort})` : ''}`);
    logger.info('');

    if (!config.weather.apiKey) {
      logger.warn('WEATHER_API_KEY not set — weather tool will not function');
    }

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

    // Log registered tools
    logger.info('Available Tools:');
    const tools = toolRegistry.list();
    tools.forEach(tool => {
      logger.info(`  - ${tool.name}: ${tool.description}`);
    });
    logger.info('');

    // Initialize resource registry
    const resourceRegistry = new ResourceRegistry();

    resourceRegistry.register('file', new FileResourceHandler(), {
      uriScheme: 'file',
      description: 'Provides safe read access to files in allowed directories',
      mimeTypes: ['text/plain', 'application/json', 'text/markdown'],
    });

    // Log registered resources
    logger.info('Available Resources:');
    const resources = resourceRegistry.list();
    resources.forEach(resource => {
      const mimeTypes = resource.mimeTypes ? ` (${resource.mimeTypes.join(', ')})` : '';
      logger.info(`  - ${resource.uriScheme}://: ${resource.description}${mimeTypes}`);
    });
    logger.info('');

    // Create message router
    const router = new MessageRouter(toolRegistry, resourceRegistry);

    // Start appropriate transport
    if (config.transport.mode === 'stdio') {
      logger.info('Security Configuration:');
      logger.info(`  - Allowed file paths: ${config.security.allowedFilePaths.join(', ')}`);
      logger.info('');
      logger.info('Server ready in STDIO mode');
      logger.info('Listening for MCP messages on stdin...');
      logger.info('='.repeat(60));

      const transport = new StdioTransport(router, createContext, logger);
      transport.start();
    } else {
      logger.info('Security Configuration:');
      logger.info(`  - API keys configured: ${config.security.apiKeys.length}`);
      logger.info(`  - Rate limit: ${config.security.rateLimitRequestsPerMinute} requests/min`);
      logger.info(`  - Allowed file paths: ${config.security.allowedFilePaths.join(', ')}`);
      logger.info('');
      logger.info(`Server ready in HTTP mode on port ${config.transport.httpPort}`);
      logger.info(`Health check: http://localhost:${config.transport.httpPort}/health`);
      logger.info(`MCP endpoint: http://localhost:${config.transport.httpPort}/mcp`);
      logger.info('='.repeat(60));

      const transport = new HttpTransport(router, createContext, config, logger, metrics);
      await transport.start();

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
