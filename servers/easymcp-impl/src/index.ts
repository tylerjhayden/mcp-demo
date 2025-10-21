// ABOUTME: EasyMCP server implementation
// ABOUTME: Demonstrates decorator-based pattern for MCP server creation

import EasyMCP from 'easy-mcp/dist/lib/EasyMCP.js';
import { Tool } from 'easy-mcp/dist/lib/experimental/decorators/Tool.js';
import { Resource } from 'easy-mcp/dist/lib/experimental/decorators/Resource.js';
import { evaluate } from 'mathjs';
import { promises as fs } from 'fs';
import mime from 'mime-types';
import { sanitizeExpression, validateExpression } from './utils/expression.js';
import {
  sanitizeFilePath,
  validateFileAccess,
  parseFileUri,
} from './utils/file-security.js';
import { httpGet } from './utils/http-client.js';

// Configuration from environment variables
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
const WEATHER_API_TIMEOUT = parseInt(process.env.WEATHER_API_TIMEOUT || '5000', 10);
const WEATHER_CACHE_TTL = parseInt(process.env.WEATHER_CACHE_TTL || '600', 10);
const ALLOWED_FILE_PATHS = process.env.ALLOWED_FILE_PATHS?.split(':') || [process.cwd()];

// Weather cache
interface WeatherCacheEntry {
  location: string;
  temperature: number;
  conditions: string;
  timestamp: string;
  cachedAt: number;
}

const weatherCache = new Map<string, WeatherCacheEntry>();

// Weather API response type
interface OpenWeatherMapResponse {
  main: { temp: number };
  weather: Array<{ description: string }>;
  name: string;
  dt: number;
}

/**
 * MCP Server implementation using EasyMCP decorators
 */
class MCPServer extends EasyMCP {
  // ============================================================================
  // TOOL: calculate
  // ============================================================================

  @Tool({
    description: 'Evaluate a mathematical expression',
  })
  async calculate(expression: string): Promise<string> {
    try {
      // Sanitize and validate expression
      const sanitized = sanitizeExpression(expression);
      validateExpression(sanitized);

      // Evaluate using math.js
      const result = evaluate(sanitized);

      // Ensure result is a finite number
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error('Expression did not evaluate to a finite number');
      }

      return JSON.stringify(
        {
          expression,
          result,
        },
        null,
        2
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Calculation failed: ${message}`);
    }
  }

  // ============================================================================
  // TOOL: get_weather
  // ============================================================================

  @Tool({
    description: 'Get current weather for a location',
  })
  async getWeather(location: string): Promise<string> {
    try {
      const cacheKey = location.toLowerCase();

      // Check cache
      const cached = weatherCache.get(cacheKey);
      if (cached) {
        const age = Date.now() - cached.cachedAt;
        if (age < WEATHER_CACHE_TTL * 1000) {
          return JSON.stringify(
            {
              location: cached.location,
              temperature: cached.temperature,
              conditions: cached.conditions,
              timestamp: cached.timestamp,
              cached: true,
            },
            null,
            2
          );
        } else {
          weatherCache.delete(cacheKey);
        }
      }

      // Fetch from API
      if (!WEATHER_API_KEY) {
        throw new Error('Weather API key not configured');
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        location
      )}&appid=${WEATHER_API_KEY}&units=metric`;

      const response = await httpGet<OpenWeatherMapResponse>(url, {
        timeout: WEATHER_API_TIMEOUT,
      });

      const weatherData = {
        location: response.name,
        temperature: Math.round(response.main.temp * 10) / 10,
        conditions: response.weather[0]?.description || 'Unknown',
        timestamp: new Date(response.dt * 1000).toISOString(),
        cachedAt: Date.now(),
      };

      // Store in cache
      weatherCache.set(cacheKey, weatherData);

      return JSON.stringify(
        {
          location: weatherData.location,
          temperature: weatherData.temperature,
          conditions: weatherData.conditions,
          timestamp: weatherData.timestamp,
          cached: false,
        },
        null,
        2
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific error cases
      if (message.includes('404')) {
        throw new Error(`Location not found: ${location}`);
      }
      if (message.includes('401')) {
        throw new Error('Invalid Weather API key');
      }
      if (message.includes('timeout') || message.includes('Request timeout')) {
        throw new Error('Weather API request timed out');
      }

      throw new Error(`Weather fetch failed: ${message}`);
    }
  }

  // ============================================================================
  // RESOURCE: file://
  // ============================================================================

  @Resource('file://{filepath}')
  async fileContent(filepath: string): Promise<string> {
    try {
      const uri = `file://${filepath}`;

      // Parse and sanitize file path
      const filePath = parseFileUri(uri);
      const sanitizedPath = sanitizeFilePath(filePath, ALLOWED_FILE_PATHS);

      // Verify file exists and is readable
      const isAccessible = await validateFileAccess(sanitizedPath);
      if (!isAccessible) {
        throw new Error(`File not found or not readable: ${filePath}`);
      }

      // Read file content
      const content = await fs.readFile(sanitizedPath, 'utf-8');
      const stats = await fs.stat(sanitizedPath);
      const mimeType = mime.lookup(sanitizedPath) || 'application/octet-stream';

      return JSON.stringify(
        {
          uri,
          mimeType,
          size: stats.size,
          content,
        },
        null,
        2
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`File read failed: ${message}`);
    }
  }
}

// ============================================================================
// START SERVER
// ============================================================================

const server = new MCPServer({ version: '0.1.0' });

console.error('Starting EasyMCP server...');
server.serve().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
