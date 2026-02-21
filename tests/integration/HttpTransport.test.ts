/**
 * Integration tests for HttpTransport
 * Covers authentication on all endpoints and rate limiting
 */

import request from 'supertest';
import { HttpTransport } from '../../servers/bare-metal/transport/HttpTransport.js';
import {
  createMockConfiguration,
  createMockLogger,
  createMockMetricsRecorder,
  createMockExecutionContext,
} from '../helpers/mocks.js';
import type { MCPRequest } from '../../servers/bare-metal/core/MessageRouter.js';

function buildTransport(rateLimitRequestsPerMinute = 60): HttpTransport {
  const config = createMockConfiguration({
    security: {
      apiKeys: ['test-key-1', 'test-key-2'],
      allowedFilePaths: ['/tmp'],
      rateLimitRequestsPerMinute,
    },
  });

  const mockRouter = {
    route: async (_req: MCPRequest) => ({
      jsonrpc: '2.0' as const,
      id: 1,
      result: {},
    }),
  };

  const createContext = (_traceId: string) => createMockExecutionContext();

  return new HttpTransport(
    mockRouter as never,
    createContext,
    config,
    createMockLogger(),
    createMockMetricsRecorder()
  );
}

describe('HttpTransport — observability endpoint protection', () => {
  let transport: HttpTransport;

  beforeEach(() => {
    transport = buildTransport();
  });

  it('returns 401 for GET /health without auth', async () => {
    const res = await request(transport.getApp()).get('/health');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /metrics without auth', async () => {
    const res = await request(transport.getApp()).get('/metrics');
    expect(res.status).toBe(401);
  });

  it('returns 200 for GET /health with valid auth', async () => {
    const res = await request(transport.getApp())
      .get('/health')
      .set('Authorization', 'Bearer test-key-1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  });

  it('returns 200 for GET /metrics with valid auth', async () => {
    const res = await request(transport.getApp())
      .get('/metrics')
      .set('Authorization', 'Bearer test-key-1');
    expect(res.status).toBe(200);
  });
});

describe('HttpTransport — SSE rate limiting', () => {
  it('returns 429 on SSE when rate limit is exceeded', async () => {
    const transport = buildTransport(1); // 1 req/min — exhausted after first request
    const app = transport.getApp();

    // Exhaust the token bucket via /mcp POST (returns immediately, no hanging stream).
    // getClientId() uses the API key as client ID so both endpoints share the same bucket.
    await request(app)
      .post('/mcp')
      .set('Authorization', 'Bearer test-key-1')
      .send({ jsonrpc: '2.0', id: 1, method: 'ping', params: {} });

    // Now /sse should be rate-limited for the same client
    const res = await request(app)
      .get('/sse')
      .set('Authorization', 'Bearer test-key-1');
    expect(res.status).toBe(429);
  });
});

