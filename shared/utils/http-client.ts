import type { HttpClient, RequestOptions } from '../types/index.js';

/**
 * Simple HTTP client implementation using fetch API
 */
export class SimpleHttpClient implements HttpClient {
  private defaultTimeout: number;

  constructor(defaultTimeout: number = 5000) {
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Performs HTTP GET request
   */
  async get<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    const timeout = options?.timeout || this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: options?.headers || {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }

      throw new Error('Unknown error during HTTP request');
    }
  }

  /**
   * Performs HTTP POST request
   */
  async post<T = unknown>(url: string, data: unknown, options?: RequestOptions): Promise<T> {
    const timeout = options?.timeout || this.defaultTimeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
      }

      throw new Error('Unknown error during HTTP request');
    }
  }
}
