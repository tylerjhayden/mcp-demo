// ABOUTME: Weather tool using mcp-framework MCPTool pattern
// ABOUTME: Auto-discovered from /tools directory

import { MCPTool, defineSchema, type MCPInput } from 'mcp-framework';
import { z } from 'zod';
import { httpGet } from '../utils/http-client.js';

const WeatherSchema = defineSchema({
  location: z
    .string()
    .min(1, 'Location cannot be empty')
    .max(100, 'Location name too long')
    .describe('City name or location to get weather for'),
});

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

// Configuration from environment variables
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '';
const WEATHER_API_TIMEOUT = parseInt(process.env.WEATHER_API_TIMEOUT || '5000', 10);
const WEATHER_CACHE_TTL = parseInt(process.env.WEATHER_CACHE_TTL || '600', 10);

class GetWeatherTool extends MCPTool {
  name = 'get_weather';
  description = 'Get current weather for a location';
  schema = WeatherSchema;

  async execute(input: MCPInput<this>) {
    try {
      const cacheKey = input.location.toLowerCase();

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
        input.location
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
        throw new Error(`Location not found: ${input.location}`);
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
}

export default GetWeatherTool;
