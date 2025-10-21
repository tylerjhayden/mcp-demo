# MCP Demo Server

Model Context Protocol (MCP) server implementation demonstrating production-ready patterns in TypeScript.
**Four parallel implementations** comparing bare-metal and framework approaches.

## Overview

This project showcases MCP server implementations with:

- **Three core patterns**: Computation (calculate), API integration (weather), filesystem access
- **Four implementations**: Bare-metal, FastMCP, EasyMCP*, mcp-framework
- **Framework comparison**: Real-world evaluation of MCP development approaches

*Note: The EasyMCP implementation may not run due to unstable npm package (v0.0.0-development).
- **Enterprise patterns**: Security, observability, reliability demonstrated across all implementations
- **Dual transports**: Stdio for desktop apps, HTTP/SSE for remote access


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

### Use with Claude Code

```bash
# Build the server
pnpm build

# Add to Claude Code
claude mcp add demo-server node -- $(pwd)/dist/servers/bare-metal/index.js

# Verify connection
claude mcp list
```

### Manual Testing (HTTP mode)

```bash
# Development
TRANSPORT_MODE=http pnpm dev

# Production
pnpm build
TRANSPORT_MODE=http pnpm start
```

**Note**: For Claude Code (stdio mode), you don't need to manually run the server - it auto-starts!

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

### Handler Pattern

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

## Framework Comparison

This project includes **four parallel implementations** of the same MCP server capabilities, allowing you to compare approaches:

| Implementation | Lines of Code | Pattern | Best For |
|---------------|---------------|---------|----------|
| **Bare-metal** (`/servers/bare-metal`) | ~2,000 | Direct MCP SDK | Learning MCP internals, full control, custom needs |
| **FastMCP** (`/servers/fastmcp-impl`) | ~420 | Builder API | Production apps, Express-like familiarity |
| **EasyMCP** (`/servers/easymcp-impl`) ⚠️ | ~400 | Decorators | Rapid prototyping, minimal boilerplate (package unstable) |
| **mcp-framework** (`/servers/mcp-framework-impl`) | ~455 | Auto-discovery | Large projects with many capabilities |

⚠️ *EasyMCP implementation may not run - the `easy-mcp` npm package has broken exports in v0.0.0-development*

### Feature Matrix

| Feature | Bare-metal | FastMCP | EasyMCP | mcp-framework |
|---------|------------|---------|---------|---------------|
| **Transport: stdio** | ✓ | ✓ | ✓ | ✓ |
| **Transport: HTTP/SSE** | ✓ | ✓ | ✗ | ✓ |
| **Input validation** | Manual Zod | Zod schemas | Type inference | Zod + helpers |
| **Auto-discovery** | ✗ | ✗ | ✗ | ✓ (from `/tools`) |
| **Type safety** | Manual | Schema-based | Decorator inference | `MCPInput<this>` |
| **Setup complexity** | High | Medium | Low | Medium |
| **Boilerplate** | High | Low | Minimal | Low-Medium |
| **Framework dependency** | None | FastMCP | EasyMCP | mcp-framework |
| **Learning curve** | Steep | Gentle | Gentle | Medium |

### Code Comparison: Adding a Tool

**Bare-metal** (must implement full interface):
```typescript
class MyTool implements CapabilityHandler {
  validate(input: unknown): ValidationResult { /* ... */ }
  execute(params: MyParams, ctx: ExecutionContext): Promise<Result> { /* ... */ }
  handleError(error: Error): MCPError { /* ... */ }
}
// Register manually
toolRegistry.register('my_tool', new MyTool());
```

**FastMCP** (builder pattern):
```typescript
server.addTool({
  name: 'my_tool',
  parameters: z.object({ input: z.string() }),
  execute: async (args) => processInput(args.input),
});
```

**EasyMCP** (decorators):
```typescript
class MyMCP extends EasyMCP {
  @Tool({ description: 'Process input' })
  async myTool(input: string) {
    return processInput(input);
  }
}
```

**mcp-framework** (auto-discovery):
```typescript
// In /tools/my_tool.ts
class MyTool extends MCPTool {
  name = 'my_tool';
  schema = defineSchema({ input: z.string().describe('Input') });
  async execute(input: MCPInput<this>) {
    return processInput(input.input);
  }
}
export default MyTool;
// Automatically discovered - no registration needed
```

### When to Choose Each Approach

**Choose Bare-metal when:**
- Learning MCP protocol internals
- Need maximum control and customization
- Building something unusual or experimental
- Want minimal dependencies
- Performance optimization is critical

**Choose FastMCP when:**
- Building production applications quickly
- Team is familiar with Express.js patterns
- Need session management and authentication
- Want a proven, battle-tested framework

**Choose EasyMCP when:**
- ⚠️ **Note:** Currently not recommended - package has stability issues
- Rapid prototyping or MVPs
- Building simple, small servers
- Team prefers TypeScript decorators
- Want absolute minimum boilerplate
- Developer experience is top priority

**Choose mcp-framework when:**
- Building large projects with many capabilities
- Want CLI tooling (`mcp validate`, `mcp add`)
- Team prefers convention over configuration
- Scalability and organization are important
- Need structured file organization

### Running the Implementations

Each implementation is in its own directory under `/servers`:

```bash
# Bare-metal
cd servers/bare-metal
pnpm build
node dist/index.js

# FastMCP
cd servers/fastmcp-impl
npm install
npm run dev

# EasyMCP (⚠️ may not work - package unstable)
cd servers/easymcp-impl
npm install
npm run dev

# mcp-framework
cd servers/mcp-framework-impl
npm install
npm run dev
```

All implementations support the same three capabilities (calculate, get_weather, file access) with identical APIs.

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

**Claude Code CLI** (recommended):
```bash
# Build the server first
pnpm build

# Add to Claude Code (stdio mode)
claude mcp add demo-server node -- /path/to/mcp-demo/dist/servers/bare-metal/index.js

# Verify it's connected
claude mcp list

# The server will auto-start when Claude Code needs it
# No need to manually run pnpm start!
```

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

## Sharing Your Server

### Stdio vs HTTP: When to Use Each

**Stdio Mode** (Local, Single User):
- ✅ Personal use with Claude Code/Desktop
- ✅ Secure (OS-level permissions only)
- ✅ No network exposure
- ✅ Auto-starts/stops with client

**HTTP Mode** (Shared, Multi-User):
- ✅ Share with other Claude Code users
- ✅ Remote access (deploy to cloud)
- ✅ Multiple simultaneous clients
- ✅ Testing with curl/Postman
- ✅ Browser-based integrations

### Deployment for Sharing

**Quick Test (ngrok)**:
```bash
# Terminal 1: Start server
TRANSPORT_MODE=http pnpm start

# Terminal 2: Create tunnel
ngrok http 3000

# Share URL: Others add with
# claude mcp add --transport http your-server https://abc123.ngrok.io/mcp
```

**Production (Cloud)**:
```bash
# Deploy to Railway, Render, Fly.io, AWS, etc.
# Set environment:
#   TRANSPORT_MODE=http
#   API_KEYS=key1,key2,key3

# Users connect:
claude mcp add --transport http your-server \
  https://your-domain.com/mcp \
  --header "Authorization: Bearer user_api_key"
```

**Self-Host (GitHub)**:
```bash
# Share repo - users run their own instance
git clone your-repo
pnpm install && pnpm build
claude mcp add demo-server node -- $(pwd)/dist/servers/bare-metal/index.js
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
