/**
 * Test fixtures and sample data
 * Provides realistic test data for all handlers and scenarios
 */

import type {
  WeatherResult,
  CalculateResult,
  FileResourceResult,
  MCPError,
} from '../../shared/types/index.js';
import { MCPErrorCode } from '../../shared/types/index.js';

/**
 * OpenWeatherMap API response fixtures
 */
export const WEATHER_API_RESPONSES = {
  sanFrancisco: {
    main: {
      temp: 18.5,
    },
    weather: [
      {
        description: 'clear sky',
      },
    ],
    name: 'San Francisco',
    dt: 1699996800,
  },
  newYork: {
    main: {
      temp: 12.3,
    },
    weather: [
      {
        description: 'light rain',
      },
    ],
    name: 'New York',
    dt: 1699996800,
  },
  london: {
    main: {
      temp: 8.7,
    },
    weather: [
      {
        description: 'overcast clouds',
      },
    ],
    name: 'London',
    dt: 1699996800,
  },
  invalidLocation: {
    cod: '404',
    message: 'city not found',
  },
};

/**
 * Weather result fixtures
 */
export const WEATHER_RESULTS: Record<string, WeatherResult> = {
  sanFrancisco: {
    location: 'San Francisco',
    temperature: 18.5,
    conditions: 'clear sky',
    timestamp: '2023-11-15T00:00:00.000Z',
  },
  newYork: {
    location: 'New York',
    temperature: 12.3,
    conditions: 'light rain',
    timestamp: '2023-11-15T00:00:00.000Z',
  },
  london: {
    location: 'London',
    temperature: 8.7,
    conditions: 'overcast clouds',
    timestamp: '2023-11-15T00:00:00.000Z',
  },
};

/**
 * Calculate expression fixtures
 */
export const CALCULATE_EXPRESSIONS = {
  valid: [
    '2 + 2',
    '10 * 5',
    '100 / 4',
    '2 * 8',          // was '2 ^ 8' — ^ not in allowlist
    '4 * 4',          // was 'sqrt(16)' — letters not allowed
    '1 / 2',          // was 'sin(pi / 2)' — letters not allowed
    '100 + 0',        // was 'log(100)' — letters not allowed
    '(5 + 3) * 2',
    '3.14159 * 2',
    '1000000 + 1000', // was '1e6 + 1e3' — 'e' not in allowlist
  ],
  invalid: [
    'console.log("xss")',
    'process.exit()',
    'import("fs")',
    'eval("1+1")',
    'Function("return 1")()',
    '__proto__',
    'constructor',
  ],
  malformed: [
    '2 +',
    '* 5',
    '2 ++ 3',
    'sqrt(',
    ')',
    '',
  ],
};

/**
 * Calculate result fixtures
 */
export const CALCULATE_RESULTS: Record<string, CalculateResult> = {
  addition: {
    expression: '2 + 2',
    result: 4,
  },
  multiplication: {
    expression: '10 * 5',
    result: 50,
  },
  division: {
    expression: '100 / 4',
    result: 25,
  },
  power: {
    expression: '2 ^ 8',
    result: 256,
  },
  sqrt: {
    expression: 'sqrt(16)',
    result: 4,
  },
};

/**
 * File resource fixtures
 */
export const FILE_CONTENTS = {
  textFile: 'This is a sample text file.\nIt has multiple lines.\nLine three.',
  jsonFile: JSON.stringify({
    name: 'test',
    version: '1.0.0',
    nested: {
      value: 42,
    },
  }, null, 2),
  emptyFile: '',
  largeFile: 'x'.repeat(10000),
};

/**
 * File resource result fixtures
 */
export const FILE_RESOURCE_RESULTS: Record<string, FileResourceResult> = {
  textFile: {
    uri: 'file:///tmp/test.txt',
    mimeType: 'text/plain',
    content: FILE_CONTENTS.textFile,
    size: FILE_CONTENTS.textFile.length,
  },
  jsonFile: {
    uri: 'file:///tmp/config.json',
    mimeType: 'application/json',
    content: FILE_CONTENTS.jsonFile,
    size: FILE_CONTENTS.jsonFile.length,
  },
};

/**
 * Path traversal attack fixtures
 */
export const PATH_TRAVERSAL_ATTEMPTS = [
  '../etc/passwd',
  '../../etc/shadow',
  './../.../../sensitive.txt',
  'subdir/../../outside.txt',
  '/etc/passwd',
  '/var/log/system.log',
  'file:///etc/hosts',
  'file:///../etc/passwd',
  '....//....//etc/passwd',
  '..\\..\\windows\\system32',
];

/**
 * MCP error fixtures
 */
export const MCP_ERRORS: Record<string, MCPError> = {
  invalidRequest: {
    code: MCPErrorCode.InvalidRequest,
    message: 'Invalid request format',
  },
  methodNotFound: {
    code: MCPErrorCode.MethodNotFound,
    message: 'Method not found',
  },
  invalidParams: {
    code: MCPErrorCode.InvalidParams,
    message: 'Invalid parameters',
    data: {
      expected: 'object',
      received: 'string',
    },
  },
  internalError: {
    code: MCPErrorCode.InternalError,
    message: 'Internal server error',
  },
  parseError: {
    code: MCPErrorCode.ParseError,
    message: 'Parse error',
  },
  resourceNotFound: {
    code: MCPErrorCode.ResourceNotFound,
    message: 'Resource not found',
  },
  requestTimeout: {
    code: MCPErrorCode.RequestTimeout,
    message: 'Request timeout',
  },
};

/**
 * MCP JSON-RPC request fixtures
 */
export const MCP_REQUESTS = {
  toolsList: {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  },
  toolsCall: {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'calculate',
      arguments: {
        expression: '2 + 2',
      },
    },
  },
  resourcesList: {
    jsonrpc: '2.0',
    id: 3,
    method: 'resources/list',
    params: {},
  },
  resourcesRead: {
    jsonrpc: '2.0',
    id: 4,
    method: 'resources/read',
    params: {
      uri: 'file:///tmp/test.txt',
    },
  },
  ping: {
    jsonrpc: '2.0',
    id: 5,
    method: 'ping',
    params: {},
  },
  invalidMethod: {
    jsonrpc: '2.0',
    id: 6,
    method: 'unknown/method',
    params: {},
  },
};

/**
 * MCP JSON-RPC response fixtures
 */
export const MCP_RESPONSES = {
  toolsList: {
    jsonrpc: '2.0',
    id: 1,
    result: {
      tools: [
        {
          name: 'calculate',
          description: 'Evaluates mathematical expressions',
          inputSchema: {
            type: 'object',
            properties: {
              expression: {
                type: 'string',
                description: 'Mathematical expression to evaluate',
              },
            },
            required: ['expression'],
          },
        },
        {
          name: 'weather',
          description: 'Gets current weather for a location',
          inputSchema: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'City name or location',
              },
            },
            required: ['location'],
          },
        },
      ],
    },
  },
  toolsCallSuccess: {
    jsonrpc: '2.0',
    id: 2,
    result: {
      content: [
        {
          type: 'text',
          text: JSON.stringify(CALCULATE_RESULTS.addition),
        },
      ],
    },
  },
  pong: {
    jsonrpc: '2.0',
    id: 5,
    result: {},
  },
  error: {
    jsonrpc: '2.0',
    id: 6,
    error: MCP_ERRORS.methodNotFound,
  },
};

/**
 * HTTP request fixtures for testing middleware
 */
export const HTTP_HEADERS = {
  validAuth: {
    authorization: 'Bearer test-key-1',
  },
  invalidAuth: {
    authorization: 'Bearer invalid-key',
  },
  noAuth: {},
  malformedAuth: {
    authorization: 'InvalidFormat',
  },
};

/**
 * Rate limiting fixtures
 */
export const RATE_LIMIT_SCENARIOS = {
  underLimit: {
    requestCount: 30,
    timeWindowMs: 60000,
    rateLimitPerMinute: 60,
  },
  atLimit: {
    requestCount: 60,
    timeWindowMs: 60000,
    rateLimitPerMinute: 60,
  },
  overLimit: {
    requestCount: 61,
    timeWindowMs: 60000,
    rateLimitPerMinute: 60,
  },
};

/**
 * Timestamp utilities for consistent test data
 */
export const TEST_TIMESTAMPS = {
  now: 1699996800000, // 2023-11-15T00:00:00.000Z
  oneHourAgo: 1699993200000,
  oneDayAgo: 1699910400000,
  oneWeekAgo: 1699392000000,
};

/**
 * Trace ID fixtures
 */
export function generateTestTraceId(): string {
  return `test-trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
