// ABOUTME: Simple HTTP client for external API calls
// ABOUTME: Handles timeout and basic error handling

import fetch from 'node-fetch';

export interface HttpClientOptions {
  timeout?: number;
}

/**
 * Simple HTTP client with timeout support
 */
export async function httpGet<T>(url: string, options: HttpClientOptions = {}): Promise<T> {
  const timeout = options.timeout || 5000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MCP-Demo-FastMCP/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as T;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}
