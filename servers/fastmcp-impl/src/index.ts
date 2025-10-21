// ABOUTME: FastMCP server implementation
// ABOUTME: Demonstrates builder API pattern for MCP server creation

import { FastMCP } from 'fastmcp';
import { z } from 'zod';
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

// Create FastMCP server
const server = new FastMCP({
  name: 'mcp-demo-fastmcp',
  version: '0.1.0',
});

// ============================================================================
// TOOL: calculate
// ============================================================================

server.addTool({
  name: 'calculate',
  description: 'Evaluate a mathematical expression',
  parameters: z.object({
    expression: z.string().min(1, 'Expression cannot be empty').max(1000, 'Expression too long'),
  }),
  execute: async (args) => {
    try {
      // Sanitize and validate expression
      const sanitized = sanitizeExpression(args.expression);
      validateExpression(sanitized);

      // Evaluate using math.js
      const result = evaluate(sanitized);

      // Ensure result is a finite number
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error('Expression did not evaluate to a finite number');
      }

      return JSON.stringify({
        expression: args.expression,
        result,
      }, null, 2);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Calculation failed: ${message}`);
    }
  },
});

// ============================================================================
// TOOL: get_weather
// ============================================================================

server.addTool({
  name: 'get_weather',
  description: 'Get current weather for a location',
  parameters: z.object({
    location: z.string().min(1, 'Location cannot be empty').max(100, 'Location name too long'),
  }),
  execute: async (args) => {
    try {
      const cacheKey = args.location.toLowerCase();

      // Check cache
      const cached = weatherCache.get(cacheKey);
      if (cached) {
        const age = Date.now() - cached.cachedAt;
        if (age < WEATHER_CACHE_TTL * 1000) {
          return JSON.stringify({
            location: cached.location,
            temperature: cached.temperature,
            conditions: cached.conditions,
            timestamp: cached.timestamp,
            cached: true,
          }, null, 2);
        } else {
          weatherCache.delete(cacheKey);
        }
      }

      // Fetch from API
      if (!WEATHER_API_KEY) {
        throw new Error('Weather API key not configured');
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
        args.location
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

      return JSON.stringify({
        location: weatherData.location,
        temperature: weatherData.temperature,
        conditions: weatherData.conditions,
        timestamp: weatherData.timestamp,
        cached: false,
      }, null, 2);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Handle specific error cases
      if (message.includes('404')) {
        throw new Error(`Location not found: ${args.location}`);
      }
      if (message.includes('401')) {
        throw new Error('Invalid Weather API key');
      }
      if (message.includes('timeout') || message.includes('Request timeout')) {
        throw new Error('Weather API request timed out');
      }

      throw new Error(`Weather fetch failed: ${message}`);
    }
  },
});

// ============================================================================
// RESOURCE: file://
// ============================================================================

server.addResourceTemplate({
  uriTemplate: 'file://{filepath}',
  name: 'File Resource',
  mimeType: 'text/plain',
  arguments: [
    {
      name: 'filepath',
      description: 'Path to the file',
      required: true,
    },
  ],
  async load(args) {
    try {
      const uri = `file://${args.filepath}`;

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

      return {
        text: JSON.stringify({
          uri,
          mimeType,
          size: stats.size,
          content,
        }, null, 2),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`File read failed: ${message}`);
    }
  },
});

// ============================================================================
// START SERVER
// ============================================================================

// Parse transport type from command line
const transportType = process.argv.includes('--http') ? 'httpStream' : 'stdio';

if (transportType === 'httpStream') {
  const port = parseInt(process.env.HTTP_PORT || '3000', 10);
  console.error(`Starting FastMCP server on HTTP port ${port}...`);

  server.start({
    transportType: 'httpStream',
    httpStream: {
      port,
    },
  });

  console.error('FastMCP server running!');
} else {
  console.error('Starting FastMCP server in stdio mode...');

  server.start({
    transportType: 'stdio',
  });
}
