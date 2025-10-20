import { z } from 'zod';
import type {
  CapabilityHandler,
  WeatherParams,
  WeatherResult,
  ExecutionContext,
  Result,
  MCPError,
  ValidationResult,
} from '../../../shared/types/index.js';
import { validateWithSchema } from '../../../shared/security/index.js';
import { MCPErrorCode } from '../../../shared/types/index.js';

/**
 * Schema for weather tool parameters
 */
const WeatherParamsSchema = z.object({
  location: z.string().min(1, 'Location cannot be empty').max(100, 'Location name too long'),
});

/**
 * OpenWeatherMap API response type
 */
interface OpenWeatherMapResponse {
  main: {
    temp: number;
  };
  weather: Array<{
    description: string;
  }>;
  name: string;
  dt: number;
}

/**
 * Cache entry for weather data
 */
interface CacheEntry {
  data: WeatherResult;
  timestamp: number;
}

/**
 * Weather tool handler
 * Fetches weather data from OpenWeatherMap API with caching
 */
export class WeatherTool implements CapabilityHandler<WeatherParams, WeatherResult> {
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Validates input parameters using Zod schema
   */
  validate(input: unknown): ValidationResult<WeatherParams> {
    return validateWithSchema(WeatherParamsSchema, input);
  }

  /**
   * Executes weather data fetching
   */
  async execute(
    params: WeatherParams,
    context: ExecutionContext
  ): Promise<Result<WeatherResult>> {
    const startTime = Date.now();

    try {
      context.logger.info({ location: params.location }, 'Fetching weather data');

      // Check cache first
      const cached = this.getFromCache(params.location, context.config.weather.cacheTtl);
      if (cached) {
        context.metrics.incrementCounter('weather_cache_hit_total');
        context.logger.info({ location: params.location }, 'Weather data served from cache');

        return {
          success: true,
          data: cached,
        };
      }

      context.metrics.incrementCounter('weather_cache_miss_total');

      // Fetch from API
      const weatherData = await this.fetchWeatherData(params.location, context);

      // Store in cache
      this.cache.set(params.location.toLowerCase(), {
        data: weatherData,
        timestamp: Date.now(),
      });

      const duration = Date.now() - startTime;
      context.metrics.recordDuration('weather_request_duration_ms', duration);
      context.metrics.incrementCounter('weather_success_total');

      context.logger.info(
        { location: params.location, durationMs: duration },
        'Weather data fetched successfully'
      );

      return {
        success: true,
        data: weatherData,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      context.metrics.recordDuration('weather_request_duration_ms', duration);
      context.metrics.incrementCounter('weather_error_total', {
        error_type: error instanceof Error ? error.name : 'unknown',
      });

      context.logger.error(
        { location: params.location, error: error instanceof Error ? error.message : String(error) },
        'Weather data fetch failed'
      );

      return {
        success: false,
        error: this.handleError(error instanceof Error ? error : new Error(String(error))),
      };
    }
  }

  /**
   * Fetches weather data from OpenWeatherMap API
   */
  private async fetchWeatherData(
    location: string,
    context: ExecutionContext
  ): Promise<WeatherResult> {
    if (!context.config.weather.apiKey) {
      throw new Error('Weather API key not configured');
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      location
    )}&appid=${context.config.weather.apiKey}&units=metric`;

    try {
      const response = await context.httpClient.get<OpenWeatherMapResponse>(url, {
        timeout: context.config.weather.timeout,
      });

      return {
        location: response.name,
        temperature: Math.round(response.main.temp * 10) / 10, // Round to 1 decimal
        conditions: response.weather[0]?.description || 'Unknown',
        timestamp: new Date(response.dt * 1000).toISOString(),
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('404')) {
          throw new Error(`Location not found: ${location}`);
        }
        if (error.message.includes('401')) {
          throw new Error('Invalid API key');
        }
        if (error.message.includes('timeout')) {
          throw new Error('Weather API request timed out');
        }
      }
      throw error;
    }
  }

  /**
   * Retrieves weather data from cache if not expired
   */
  private getFromCache(location: string, cacheTtl: number): WeatherResult | null {
    const cacheKey = location.toLowerCase();
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > cacheTtl * 1000) {
      // Cache expired
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Transforms errors into MCP error format
   */
  handleError(error: Error): MCPError {
    // Location not found
    if (error.message.includes('not found')) {
      return {
        code: MCPErrorCode.InvalidParams,
        message: error.message,
        data: {
          originalError: error.message,
        },
      };
    }

    // API timeout
    if (error.message.includes('timeout')) {
      return {
        code: MCPErrorCode.RequestTimeout,
        message: 'Weather API request timed out',
        data: {
          originalError: error.message,
        },
      };
    }

    // API key issues
    if (error.message.includes('API key')) {
      return {
        code: MCPErrorCode.InternalError,
        message: 'Weather service configuration error',
        data: {
          error: 'API key not configured',
        },
      };
    }

    // Generic external API failure
    return {
      code: MCPErrorCode.InternalError,
      message: 'Failed to fetch weather data',
      data: {
        error: error.message,
      },
    };
  }

  /**
   * Clears the cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
