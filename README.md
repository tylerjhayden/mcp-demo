# MCP Demo Server

Enterprise-quality Model Context Protocol (MCP) server implementation demonstrating production-ready patterns in TypeScript.

## Overview

This project showcases a professional MCP server implementation with:

- **Three core patterns**: Computation (calculate), API integration (weather), filesystem access (file resources)
- **Enterprise features**: Security, observability, reliability, rate limiting, authentication
- **Dual transports**: Stdio for desktop apps, HTTP/SSE for remote access
- **DRY architecture**: Extensible design making new capabilities trivial to add
- **Bare-metal approach**: Direct use of official MCP SDK with full control and transparency

Built for developers who want to understand MCP internals and implement production-grade servers.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- OpenWeatherMap API key (free tier: https://openweathermap.org/api)

### Installation

```bash
# Clone and install
git clone <repository-url>
cd mcp-demo
pnpm install

# Configure
cp .env.example .env
# Edit .env and add your WEATHER_API_KEY
```

### Run in stdio mode

```bash
pnpm dev
```

### Run in HTTP mode

```bash
# Development
TRANSPORT_MODE=http pnpm dev

# Production
pnpm build
TRANSPORT_MODE=http pnpm start
```

## Architecture

### High-Level Design

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
┌──────▼───────────────────┐
│  Transport Layer         │
│  • Stdio (stdin/stdout)  │
│  • HTTP/SSE (Express)    │
└──────┬───────────────────┘
       │
┌──────▼───────────────┐
│  Middleware Pipeline │
│  • Auth              │
│  • Rate Limiting     │
│  • Logging/Tracing   │
│  • Metrics           │
└──────┬───────────────┘
       │
┌──────▼────────────┐
│  Message Router   │
│  • tools/list     │
│  • tools/call     │
│  • resources/list │
│  • resources/read │
└──────┬────────────┘
       │
┌──────▼──────────────────┐
│  Handler Registries     │
│  • ToolRegistry         │
│  • ResourceRegistry     │
└──────┬──────────────────┘
       │
┌──────▼────────────────────┐
│  Capability Handlers      │
│  • CalculateTool          │
│  • WeatherTool            │
│  • FileResourceHandler    │
└───────────────────────────┘
```

### DRY Handler Pattern

All capabilities implement a common interface:

```typescript
interface CapabilityHandler<TParams, TResult> {
  validate(input: unknown): ValidationResult<TParams>;
  execute(params: TParams, context: ExecutionContext): Promise<Result<TResult>>;
  handleError(error: Error): MCPError;
}
```

This eliminates repetition and makes adding new capabilities simple:

1. Implement the interface
2. Register with appropriate registry
3. Done - routing and transport work automatically

## Capabilities

### 1. calculate (Computation Pattern)

Evaluates mathematical expressions with security controls.

**Method**: `tools/call`

**Parameters**:
```json
{
  "name": "calculate",
  "arguments": {
    "expression": "2 + 2 * 10"
  }
}
```

**Returns**:
```json
{
  "expression": "2 + 2 * 10",
  "result": 22
}
```

**Security**: Expression sanitization prevents code injection. Only mathematical operators allowed.

### 2. get_weather (API Integration Pattern)

Fetches current weather data from OpenWeatherMap.

**Method**: `tools/call`

**Parameters**:
```json
{
  "name": "get_weather",
  "arguments": {
    "location": "San Francisco"
  }
}
```

**Returns**:
```json
{
  "location": "San Francisco, US",
  "temperature": 18.5,
  "conditions": "partly cloudy",
  "timestamp": "2025-10-20T10:37:00Z"
}
```

**Features**: 10-minute result caching, configurable timeout, error handling for API failures.

### 3. file:// resources (Filesystem Pattern)

Provides safe read access to files in allowed directories.

**List resources**:
```json
{
  "method": "resources/list"
}
```

**Read resource**:
```json
{
  "method": "resources/read",
  "params": {
    "uri": "file:///tmp/example.txt"
  }
}
```

**Security**: Path traversal protection, restricted to `ALLOWED_FILE_PATHS`, MIME type detection.

## Configuration

All configuration via environment variables. See `.env.example` for details.

### Key Variables

```bash
# Transport
TRANSPORT_MODE=stdio        # or "http"
HTTP_PORT=3000              # HTTP mode only

# Weather API
WEATHER_API_KEY=your_key    # Required for weather tool
WEATHER_CACHE_TTL=600       # Seconds (10 min default)

# Security
ALLOWED_FILE_PATHS=/tmp     # Colon-separated paths
API_KEYS=key1,key2          # HTTP mode only
RATE_LIMIT_REQUESTS=60      # Requests/min per client

# Observability
LOG_LEVEL=info              # debug|info|warn|error
LOG_FORMAT=pretty           # json|pretty
```

## Deployment

### Local Development

```bash
# Stdio mode with auto-reload
pnpm dev

# HTTP mode with auto-reload
TRANSPORT_MODE=http pnpm dev
```

### Docker

```bash
# Build image
docker build -t mcp-demo .

# Run container
docker run -p 3000:3000 \
  -e WEATHER_API_KEY=your_key \
  -e API_KEYS=your_api_key \
  mcp-demo
```

### MCP Client Integration

**Claude Desktop** (stdio):
```json
{
  "mcpServers": {
    "demo-server": {
      "command": "node",
      "args": ["/path/to/mcp-demo/dist/servers/bare-metal/index.js"]
    }
  }
}
```

**HTTP Client**:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {"expression": "2 + 2"}
    }
  }'
```

## Implementation Details

### Bare-Metal Approach

This implementation uses the official MCP SDK minimally, implementing core patterns manually:

**Advantages**:
- Full control and transparency
- Clear understanding of MCP mechanics
- Easy to customize for specific needs
- Minimal dependencies

**Components**:
- Manual request routing and handler registration
- Custom middleware pipeline
- Direct transport setup (stdio readline, Express HTTP)
- Explicit error handling patterns

**Lines of Code**: ~2500 (excluding tests)

### Security Considerations

**Production Checklist**:

- [x] Input validation with Zod schemas
- [x] Path traversal protection for file access
- [x] Expression sanitization to prevent code injection
- [x] API key authentication (HTTP mode)
- [x] Rate limiting (token bucket algorithm)
- [x] Request tracing for audit logs
- [x] Secure environment variable handling
- [ ] HTTPS/TLS for HTTP transport (configure reverse proxy)
- [ ] API key rotation mechanism (add to config)

## Extension Guide

Adding a new tool is straightforward:

**1. Create handler** (servers/bare-metal/handlers/MyTool.ts):
```typescript
export class MyTool implements CapabilityHandler<MyParams, MyResult> {
  validate(input: unknown): ValidationResult<MyParams> {
    return validateWithSchema(MyParamsSchema, input);
  }

  async execute(params: MyParams, context: ExecutionContext): Promise<Result<MyResult>> {
    // Your logic here
    return { success: true, data: result };
  }

  handleError(error: Error): MCPError {
    return { code: MCPErrorCode.InternalError, message: error.message };
  }
}
```

**2. Register in index.ts**:
```typescript
toolRegistry.register('my_tool', new MyTool(), {
  name: 'my_tool',
  description: 'Does something useful',
  inputSchema: { /* JSON schema */ }
});
```

**Done!** Transport, routing, logging, and metrics work automatically.

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

Tests cover:
- Unit tests for all handlers
- Security validation (path traversal, injection attempts)
- Middleware functionality (auth, rate limiting)
- Integration tests for both transports

## Project Structure

```
/mcp-demo
  /shared                    # Common utilities
    /types                   # TypeScript interfaces
    /security                # Validation, sanitization
    /observability           # Logging, metrics, tracing
    /config                  # Configuration management
    /utils                   # HTTP client, helpers
  /servers/bare-metal        # Bare-metal implementation
    /handlers                # Tool and resource handlers
    /transport               # Stdio and HTTP transports
    /middleware              # Auth, rate limiting
    /registry                # Capability registration
    /core                    # Message routing
    index.ts                 # Main entry point
  /tests                     # Test suites
  /docs                      # Specifications
```

## License

MIT

## Contributing

Contributions welcome! This project is designed as a learning resource and template for production MCP servers.

Focus areas:
- Additional capability examples (database, caching, etc.)
- Enhanced security patterns
- Performance optimizations
- Framework comparison implementations
