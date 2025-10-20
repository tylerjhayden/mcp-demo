/**
 * Tests for WeatherTool handler
 * Covers API integration, caching, validation, and error handling
 */

import { WeatherTool } from '../../servers/bare-metal/handlers/WeatherTool.js';
import { MCPErrorCode } from '../../shared/types/index.js';
import { WEATHER_API_RESPONSES } from '../helpers/fixtures.js';
import { MockHttpClientBuilder, TestFactories } from '../helpers/factories.js';
import { expectSuccess, expectError } from '../helpers/assertions.js';

describe('WeatherTool', () => {
  describe('validate', () => {
    let tool: WeatherTool;

    beforeEach((): void => {
      tool = new WeatherTool();
    });

    it('should validate valid location', (): void => {
      const result = tool.validate({ location: 'San Francisco' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.location).toBe('San Francisco');
      }
    });

    it('should reject empty location', (): void => {
      const result = tool.validate({ location: '' });
      expect(result.success).toBe(false);
    });

    it('should reject location exceeding max length', (): void => {
      const result = tool.validate({ location: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject missing location', (): void => {
      const result = tool.validate({});
      expect(result.success).toBe(false);
    });
  });

  describe('execute', () => {
    it('should fetch weather data successfully', async (): Promise<void> => {
      const tool = new WeatherTool();
      const url = 'https://api.openweathermap.org/data/2.5/weather?q=San%20Francisco&appid=test-key&units=metric';
      const httpClient = new MockHttpClientBuilder()
        .addGetResponse(url, WEATHER_API_RESPONSES.sanFrancisco)
        .build();

      const context = TestFactories.standardContext();
      context.httpClient = httpClient;
      context.config.weather.apiKey = 'test-key';

      const result = await tool.execute({ location: 'San Francisco' }, context);

      expectSuccess(result);
      expect(result.data.location).toBe('San Francisco');
      expect(result.data.temperature).toBe(18.5);
      expect(result.data.conditions).toBe('clear sky');
    });

    it('should use cached data when available', async (): Promise<void> => {
      const tool = new WeatherTool();
      const url = 'https://api.openweathermap.org/data/2.5/weather?q=San%20Francisco&appid=test-key&units=metric';
      const httpClient = new MockHttpClientBuilder()
        .addGetResponse(url, WEATHER_API_RESPONSES.sanFrancisco)
        .build();

      const context = TestFactories.standardContext();
      context.httpClient = httpClient;
      context.config.weather.apiKey = 'test-key';
      context.config.weather.cacheTtl = 600;

      // First call - should hit API
      await tool.execute({ location: 'San Francisco' }, context);

      // Second call - should use cache
      const result = await tool.execute({ location: 'San Francisco' }, context);

      expectSuccess(result);
      expect(result.data.location).toBe('San Francisco');
    });

    it('should handle API errors', async (): Promise<void> => {
      const tool = new WeatherTool();
      const url = 'https://api.openweathermap.org/data/2.5/weather?q=InvalidCity&appid=test-key&units=metric';
      const httpClient = new MockHttpClientBuilder()
        .addGetError(url, new Error('HTTP 404: Not Found'))
        .build();

      const context = TestFactories.standardContext();
      context.httpClient = httpClient;
      context.config.weather.apiKey = 'test-key';

      const result = await tool.execute({ location: 'InvalidCity' }, context);

      expectError(result);
    });
  });
});
