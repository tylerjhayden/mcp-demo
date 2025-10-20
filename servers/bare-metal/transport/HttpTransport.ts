import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import compression from 'compression';
import type { Server } from 'http';
import type { Logger } from 'pino';
import type { MessageRouter, MCPRequest } from '../core/MessageRouter.js';
import type { Configuration, ExecutionContext, MetricsRecorder } from '../../../shared/types/index.js';
import { extractTraceId, createTraceHeaders } from '../../../shared/observability/index.js';
import { authenticateHttpRequest, logAuthFailure, RateLimiter } from '../middleware/index.js';
import { InMemoryMetricsRecorder } from '../../../shared/observability/index.js';

/**
 * HTTP transport for MCP
 * Provides HTTP/SSE endpoints for remote access
 */
export class HttpTransport {
  private app: Express;
  private server: Server | null = null;
  private rateLimiter: RateLimiter;
  private startTime: number = Date.now();

  constructor(
    private router: MessageRouter,
    private createContext: (traceId: string) => ExecutionContext,
    private config: Configuration,
    private logger: Logger,
    private metrics: MetricsRecorder
  ) {
    this.app = express();
    this.rateLimiter = new RateLimiter(config.security.rateLimitRequestsPerMinute);
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Sets up Express middleware
   */
  private setupMiddleware(): void {
    // CORS for browser clients
    this.app.use(cors({
      origin: '*', // In production, configure specific origins
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-Id'],
      exposedHeaders: ['X-Trace-Id'],
    }));

    // Compression
    this.app.use(compression());

    // JSON body parsing
    this.app.use(express.json({ limit: '10mb' }));

    // Request logging
    this.app.use((req, _res, next) => {
      const traceId = extractTraceId(req.headers as Record<string, string | string[] | undefined>);
      req.headers['x-trace-id'] = traceId;

      this.logger.info(
        {
          method: req.method,
          path: req.path,
          traceId,
          ip: req.ip,
        },
        'Incoming HTTP request'
      );

      next();
    });
  }

  /**
   * Sets up HTTP routes
   */
  private setupRoutes(): void {
    // Main MCP endpoint
    this.app.post('/mcp', async (req: Request, res: Response) => {
      await this.handleMcpRequest(req, res);
    });

    // Server-Sent Events endpoint
    this.app.get('/sse', (req: Request, res: Response) => {
      this.handleSseConnection(req, res);
    });

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      this.handleHealthCheck(req, res);
    });

    // Metrics endpoint
    this.app.get('/metrics', (req: Request, res: Response) => {
      this.handleMetrics(req, res);
    });

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        path: req.path,
      });
    });

    // Error handler
    this.app.use((err: Error, req: Request, res: Response, _next: unknown) => {
      this.logger.error({ error: err.message, path: req.path }, 'Unhandled error');
      res.status(500).json({
        error: 'Internal Server Error',
        message: this.config.nodeEnv === 'development' ? err.message : undefined,
      });
    });
  }

  /**
   * Handles MCP JSON-RPC requests
   */
  private async handleMcpRequest(req: Request, res: Response): Promise<void> {
    const traceId = req.headers['x-trace-id'] as string;
    const context = this.createContext(traceId);

    try {
      // Authentication
      const authResult = authenticateHttpRequest(
        req.headers.authorization,
        this.config
      );

      if (!authResult.authenticated) {
        logAuthFailure(context.logger, authResult.reason || 'Unknown', {
          ip: req.ip,
          path: req.path,
        });

        res.status(401).json({
          error: 'Unauthorized',
          message: authResult.reason,
        });
        return;
      }

      // Rate limiting
      const clientId = this.getClientId(req);
      if (!this.rateLimiter.checkLimit(clientId)) {
        const retryAfter = this.rateLimiter.getRetryAfter(clientId);

        context.logger.warn({ clientId, retryAfter }, 'Rate limit exceeded');
        context.metrics.incrementCounter('rate_limit_exceeded_total');

        res.status(429)
          .header('Retry-After', retryAfter.toString())
          .json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded',
            retryAfter,
          });
        return;
      }

      // Validate request body
      const request = req.body as MCPRequest;
      if (!request || !request.method) {
        res.status(400).json({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: 'Invalid Request',
          },
        });
        return;
      }

      // Route request
      const response = await this.router.route(request, context);

      // Add trace headers
      const traceHeaders = createTraceHeaders(traceId);
      res.set(traceHeaders);

      res.json(response);
    } catch (error) {
      context.logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'MCP request handling failed'
      );

      res.status(500).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
        },
      });
    }
  }

  /**
   * Handles Server-Sent Events connection
   */
  private handleSseConnection(req: Request, res: Response): void {
    const traceId = req.headers['x-trace-id'] as string;

    // Authenticate SSE connection
    const authResult = authenticateHttpRequest(
      req.headers.authorization,
      this.config
    );

    if (!authResult.authenticated) {
      res.status(401).json({
        error: 'Unauthorized',
        message: authResult.reason,
      });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Trace-Id', traceId);

    this.logger.info({ traceId, ip: req.ip }, 'SSE connection established');
    this.metrics.recordGauge('active_sse_connections', 1);

    // Send initial connection message
    res.write('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n');

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      res.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      clearInterval(heartbeatInterval);
      this.logger.info({ traceId }, 'SSE connection closed');
      this.metrics.recordGauge('active_sse_connections', 0);
    });
  }

  /**
   * Handles health check requests
   */
  private handleHealthCheck(_req: Request, res: Response): void {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);

    res.json({
      status: 'healthy',
      uptime: uptimeSeconds,
      version: '1.0.0',
      transport: 'http',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handles metrics requests
   */
  private handleMetrics(_req: Request, res: Response): void {
    const snapshot = this.metrics.getMetrics();

    // Format as Prometheus-style text
    const prometheusText = InMemoryMetricsRecorder.formatPrometheus(snapshot);

    res.setHeader('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusText);
  }

  /**
   * Gets client identifier for rate limiting
   */
  private getClientId(req: Request): string {
    // Use API key if available, otherwise IP address
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7); // Return API key
    }
    return req.ip || 'unknown';
  }

  /**
   * Starts the HTTP server
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.transport.httpPort, () => {
          this.logger.info(
            { port: this.config.transport.httpPort },
            'HTTP transport started'
          );
          resolve();
        });

        this.server.on('error', (error) => {
          this.logger.error({ error: error.message }, 'HTTP server error');
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stops the HTTP server gracefully
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.logger.info('Stopping HTTP transport');

      this.server.close(() => {
        this.logger.info('HTTP transport stopped');
        resolve();
      });

      // Force close after 10 seconds
      setTimeout(() => {
        this.logger.warn('Forcing HTTP server shutdown');
        resolve();
      }, 10000);
    });
  }
}
