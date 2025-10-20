import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique trace ID for request tracking
 * Uses UUID v4 for globally unique identifiers
 * @returns Trace ID string
 */
export function generateTraceId(): string {
  return uuidv4();
}

/**
 * Extracts trace ID from HTTP headers
 * Looks for X-Trace-Id or X-Request-Id headers
 * @param headers - HTTP request headers
 * @returns Trace ID from headers or newly generated ID
 */
export function extractTraceId(headers: Record<string, string | string[] | undefined>): string {
  const traceId = headers['x-trace-id'] || headers['x-request-id'];

  if (typeof traceId === 'string' && traceId.length > 0) {
    return traceId;
  }

  return generateTraceId();
}

/**
 * Formats trace ID for HTTP response headers
 * @param traceId - Trace ID to format
 * @returns Headers object with trace ID
 */
export function createTraceHeaders(traceId: string): Record<string, string> {
  return {
    'X-Trace-Id': traceId,
  };
}
