# MCP Server Demo - Technical Specification

## Overview

This project demonstrates enterprise-quality Model Context Protocol (MCP) server implementation in TypeScript through two parallel implementations:

1. **Bare-metal** - Direct use of the official MCP SDK
2. **Framework-assisted** - Emerging MCP ecosystem frameworks

The demo shows production-ready security, observability, and reliability in a DRY architecture designed for easy extension.

## Goals

- Show core MCP patterns: computation tools, API integration, filesystem resources
- Demonstrate enterprise concerns: security, observability, reliability
- Compare bare-metal and framework approaches
- Enable trivial capability addition through extensible architecture
- Teach MCP server implementation trade-offs

## Project Structure

```
/mcp-demo
  /docs
    SPEC.md              # This document
  /shared                # Common utilities, types, interfaces
    /types               # Shared TypeScript interfaces
    /security            # Validation, sanitization utilities
    /observability       # Logging, metrics, tracing
    /config              # Configuration management
  /servers
    /bare-metal          # Direct MCP SDK implementation
      /handlers          # Tool and resource handlers
      /transport         # Stdio and HTTP transport implementations
      /middleware        # Auth, rate limiting, logging pipeline
      /registry          # Capability registration system
    /framework           # Framework-assisted implementation
      /handlers          # Same handlers, different wiring
      /transport         # Framework-managed transports
  package.json           # Workspace root
  tsconfig.json          # Shared TypeScript configuration
  .env.example           # Example environment variables
  Dockerfile             # Container deployment
  README.md              # User-facing documentation
```

## Capabilities

### Minimal Set (Phase 1)

Three capabilities demonstrating the three core patterns:

#### 1. Tool: `calculate` (Computation Pattern)

**Purpose**: Shows stateless, synchronous computation.

**Parameters**:
- `expression` (string, required): Mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")

**Returns**:
```json
{
  "expression": "2 + 2",
  "result": 4
}
```

**Shows**:
- Input validation and sanitization (prevents code injection)
- Synchronous operation handling
- Error handling for invalid expressions
- Stateless design

**Extends to**: Text processing, encoding/decoding, data transformation, formatting

#### 2. Tool: `get_weather` (API Integration Pattern)

**Purpose**: Shows async operations and external API integration.

**Parameters**:
- `location` (string, required): City name or coordinates

**Returns**:
```json
{
  "location": "San Francisco, CA",
  "temperature": 18.5,
  "conditions": "Partly cloudy",
  "timestamp": "2025-10-20T10:37:00Z"
}
```

**Shows**:
- Async/await patterns
- External HTTP calls with timeouts
- Error handling for network failures, API errors, invalid locations
- Optional 10-minute result caching
- Environment variable configuration (API key)

**API**: OpenWeatherMap or similar free-tier service

**Extends to**: Database queries, third-party integrations, data aggregation

#### 3. Resource: `file://` URI Scheme (Filesystem Pattern)

**Purpose**: Shows resource-based access and content streaming.

**URI Format**: `file:///path/to/file.txt`

**MCP Operations**:
- `resources/list`: Enumerates files in allowed directories
- `resources/read`: Reads file content with MIME type detection

**Shows**:
- Resource enumeration
- Content streaming
- Path traversal protection (restricts to safe directories)
- MIME type detection by file extension
- Permission and access control

**Extends to**: Database records, API endpoints, dynamic content

## Architecture

### DRY Handler Pattern

All capabilities share a common handler interface to eliminate repetition:

```typescript
interface CapabilityHandler {
  // Schema-based input validation
  validate(input: unknown): ValidationResult;

  // Core execution logic
  execute(params: ValidatedParams, context: ExecutionContext): Promise<Result>;

  // Transform errors to MCP error format
  handleError(error: Error): MCPError;
}
```

**ExecutionContext** provides shared services:
```typescript
interface ExecutionContext {
  logger: Logger;           // Structured logger with trace ID
  metrics: MetricsRecorder; // Usage metrics recording
  config: Configuration;    // Runtime configuration
  httpClient: HttpClient;   // Configured HTTP client with timeout/retry
  traceId: string;         // Request trace identifier
}
```

### Registry System

Both implementations use a registry pattern for capability management:

```typescript
const toolRegistry = new ToolRegistry();
toolRegistry.register('calculate', new CalculateTool());
toolRegistry.register('get_weather', new WeatherTool());

const resourceRegistry = new ResourceRegistry();
resourceRegistry.register('file', new FileResourceHandler());
```

To add capabilities:
1. Implement the handler interface
2. Register the handler
3. Done - transport and routing unchanged

### Middleware Pipeline

All requests flow through a common pipeline:

1. **Authentication** - Verify API keys (HTTP) or process identity (stdio)
2. **Rate Limiting** - Enforce request throttling (HTTP only)
3. **Logging/Tracing** - Assign trace ID, log request start
4. **Validation** - Delegate to handler's validate method
5. **Execution** - Delegate to handler's execute method
6. **Metrics Recording** - Track response time, success/error counts
7. **Error Handling** - Catch exceptions, transform to MCP errors, log

**Bare-metal**: Manual implementation with explicit middleware functions

**Framework**: Uses framework middleware/plugin system (depends on chosen framework)

## Transport Layer

### Stdio Transport

**Protocol**: Standard MCP stdio - JSON-RPC messages over stdin/stdout

**Implementation**:
- Node.js `readline` interface for line-by-line parsing
- Stdin for receiving MCP messages
- Stdout exclusively for protocol responses
- Stderr exclusively for logging (never mixed with protocol)
- Process lifecycle: runs until stdin closes or SIGTERM/SIGINT

**Use Cases**: Desktop apps, CLI tools, editor integrations (VS Code, etc.)

**Libraries**: Node.js built-ins + MCP SDK stdio utilities

### HTTP/SSE Transport

**Protocol**: HTTP endpoints with Server-Sent Events for streaming

**Implementation**: Express.js (industry-standard, well-trusted)

**Endpoints**:
- `POST /mcp` - Main MCP JSON-RPC message endpoint
- `GET /sse` - Server-Sent Events connection for notifications/streaming
- `GET /health` - Health check (returns server status, uptime)
- `GET /metrics` - Usage metrics (request counts, error rates, response times)

**Features**:
- CORS configuration for browser clients
- Request body parsing (JSON)
- Response compression
- Error handling middleware

**Use Cases**: Remote access, containerized deployment, load-balanced environments, web integrations

### Transport Abstraction

Both transports feed into the same core MCP message router. Handlers remain transport-agnostic.

**Configuration**: Select transport via command-line flag or environment variable:
```bash
# Stdio mode
npm start -- --transport=stdio

# HTTP mode
npm start -- --transport=http --port=3000
```

## Enterprise-Quality Features

### Security

#### Input Validation
- Schema-based validation with Zod or similar
- Validates all tool parameters against defined schemas
- Validates and sanitizes resource URIs
- Enforces type safety at runtime
- Returns detailed validation errors

#### Path Traversal Protection
- Restricts file handler to configured safe directories
- Normalizes and canonicalizes paths
- Rejects `..` and absolute paths outside allowed directories
- Defines symlink handling policy

#### Rate Limiting (HTTP Transport)
- Token bucket or sliding window algorithm
- Configurable requests per minute per client
- Uses `express-rate-limit` or similar trusted library
- Returns 429 Too Many Requests with Retry-After header

#### Authentication
- **HTTP**: Bearer token or API key authentication
  - Validates tokens against environment values
  - Supports multiple API keys (future: key rotation)
- **Stdio**: Relies on OS user permissions
- Logs failed auth attempts with source IP/process info

### Observability

#### Structured Logging
- **Library**: Pino or Winston
- **Log Levels**: debug, info, warn, error
- **Format**: JSON for machine parsing
- **Content**:
  - Request trace ID
  - Timestamp (ISO 8601)
  - Log level
  - Message
  - Contextual metadata (tool name, parameters, user ID, etc.)
- **Stdio**: Logs to stderr only
- **HTTP**: Logs to stdout/file

#### Request Tracing
- Assigns each MCP request a unique trace ID (UUID v4)
- Flows trace ID through entire request lifecycle
- Includes trace ID in all log entries for correlation
- Returns trace ID in response headers (HTTP) for client-side correlation

#### Usage Metrics
**Tracked Metrics**:
- Request count per tool/resource
- Response time (p50, p95, p99)
- Error rate by type
- Active connections (HTTP/SSE)
- Cache hit rate (weather tool)

**Storage**: In-memory for demo (Map-based counters)

**Export**: `/metrics` endpoint returns Prometheus-style or JSON format

**Design Note**: Architecture allows easy integration with external monitoring (Prometheus, DataDog, CloudWatch)

#### Health Checks
- `/health` endpoint returns:
  - Status: "healthy" | "degraded" | "unhealthy"
  - Uptime
  - Version
  - Transport mode
  - Optional: Dependency health (weather API reachable)

### Reliability

#### Error Handling
- Catches all errors at handler and transport levels
- Transforms errors to proper MCP error responses:
  - Error codes (InvalidRequest, InternalError, etc.)
  - Human-readable messages
  - Error details (dev mode only)
- Logs stack traces but never exposes them to clients (production)
- Maps specific error types:
  - Validation errors → InvalidRequest
  - Not found → ResourceNotFound
  - External API failures → InternalError with details
  - Timeouts → RequestTimeout

#### Timeouts
- External API calls (weather) use configurable timeout (default: 5s)
- HTTP requests timeout at Express level (default: 30s)
- Handles timeouts gracefully with proper error responses

#### Graceful Shutdown
- Handles SIGTERM and SIGINT signals
- Stops accepting new requests
- Allows in-flight requests to complete (with timeout)
- Closes connections cleanly
- Flushes logs and metrics
- Exits with appropriate code

#### Testing
- **Unit Tests**: Tests each handler in isolation
- **Integration Tests**: Tests full MCP request/response cycles
- **Transport Tests**: Validates both stdio and HTTP
- **Security Tests**:
  - Path traversal attempts
  - Invalid/malicious inputs
  - Rate limiting enforcement
  - Auth bypass attempts
- **Mock Dependencies**: Mocks weather API for reliable, fast tests
- **Coverage Target**: 80%+ for critical paths

## Implementation Comparison

### Bare-Metal Implementation

**Uses Only**:
- `@modelcontextprotocol/sdk` - Official MCP SDK from Anthropic
- Standard transport libraries (Express for HTTP)
- Standard utilities (Zod, Pino, etc.)

**Implements Manually**:
- Tool/resource registration system
- Request routing logic
- Middleware pipeline
- HTTP/SSE transport setup
- Error handling patterns
- Capability discovery and execution

**Advantages**:
- Full control and transparency
- Minimal dependencies
- Clear understanding of MCP mechanics
- Easy to customize for specific needs

**Disadvantages**:
- More boilerplate code
- More setup and configuration
- Must implement common patterns from scratch

### Framework-Assisted Implementation

**Research Phase**: Investigate emerging MCP frameworks:
- Search npm for "mcp-server", "mcp-framework" packages
- GitHub search for MCP server builders
- Evaluate decorator-based or fluent API approaches
- Survey community tools and libraries

**Evaluation Criteria**:
- Boilerplate reduction
- Abstraction quality (routing, validation, transport)
- Documentation and community support
- Flexibility vs. convenience trade-offs
- Production readiness

**Implementation Approach**:
- Follow framework's recommended patterns
- Reuse handler implementations from bare-metal
- Highlight framework's unique features
- Document setup differences

**Deliverable**: Framework comparison in README:
- Lines of code comparison
- Setup complexity differences
- When to choose each approach
- Migration path

## Configuration

Environment variables control all runtime behavior:

```bash
# Transport Configuration
TRANSPORT_MODE=http              # "stdio" or "http"
HTTP_PORT=3000                   # Port for HTTP mode

# API Integration
WEATHER_API_KEY=your_key_here    # Weather API authentication
WEATHER_API_TIMEOUT=5000         # Timeout in milliseconds

# Security
ALLOWED_FILE_PATHS=/tmp:/home/user/safe  # Colon-separated safe directories
API_KEYS=key1,key2,key3          # Valid API keys for HTTP auth
RATE_LIMIT_REQUESTS=60           # Requests per minute per client

# Observability
LOG_LEVEL=info                   # "debug", "info", "warn", "error"
LOG_FORMAT=json                  # "json" or "pretty"

# Caching
WEATHER_CACHE_TTL=600            # Cache TTL in seconds (10 minutes)
```

**File**: `.env.example` with sensible defaults and documentation

## Development Tooling

### Build System
- **TypeScript**: Strict mode enabled
- **Target**: ES2022
- **Module**: ESNext with Node16 resolution
- **Source maps**: Enabled for debugging

### Package Manager
- npm or pnpm (choose based on preference)
- Workspace configuration for monorepo structure

### Code Quality
- **ESLint**: TypeScript rules, recommended configs
- **Prettier**: Consistent formatting, integrated with ESLint
- **Pre-commit hooks**: Format and lint on commit (Husky + lint-staged)

### Scripts
```json
{
  "scripts": {
    "build": "tsc --build",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "clean": "rm -rf dist/"
  }
}
```

### Testing Framework
- **Vitest** or **Jest** - Fast, TypeScript-native
- **Supertest** - HTTP endpoint testing
- **Mock Service Worker** - Mock external APIs
- **Coverage**: Istanbul/c8 integration

## Deployment

### Local Development
```bash
# Install dependencies
npm install

# Run in development mode (auto-reload)
npm run dev -- --transport=stdio

# Or HTTP mode
npm run dev -- --transport=http --port=3000
```

### Production Build
```bash
# Build TypeScript
npm run build

# Run built version
npm start -- --transport=http --port=3000
```

### Docker Deployment
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
EXPOSE 3000
CMD ["node", "dist/index.js", "--transport=http", "--port=3000"]
```

```bash
# Build image
docker build -t mcp-demo-server .

# Run container
docker run -p 3000:3000 \
  -e WEATHER_API_KEY=your_key \
  -e LOG_LEVEL=info \
  mcp-demo-server
```

### MCP Client Integration

**Claude Desktop Integration** (stdio mode):
```json
{
  "mcpServers": {
    "demo-server": {
      "command": "node",
      "args": ["/path/to/mcp-demo/dist/index.js", "--transport=stdio"]
    }
  }
}
```

**HTTP Client Example**:
```bash
# Call calculate tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {
        "expression": "2 + 2"
      }
    }
  }'
```

## Documentation Structure (README.md)

The README contains all user-facing documentation in these sections:

1. **Overview** - What this demo does and why
2. **Quick Start** - 5-minute setup
3. **Architecture** - High-level design and DRY patterns
4. **Capabilities** - Complete API reference
5. **Configuration** - Environment variables
6. **Deployment** - Local, Docker, MCP client integration
7. **Implementation Comparison** - Bare-metal vs framework
8. **Extension Guide** - Adding new capabilities
9. **Security Considerations** - Production checklist
10. **Testing** - Running tests

Brevity and clarity. Code examples where helpful. No fluff.

## Success Criteria

This demo is successful if it:

1. ✅ Clearly demonstrates the three core MCP patterns (computation, API integration, filesystem)
2. ✅ Shows production-ready security, observability, and reliability patterns
3. ✅ Uses a DRY architecture that makes extension trivial
4. ✅ Provides meaningful comparison between bare-metal and framework approaches
5. ✅ Supports both stdio and HTTP/SSE transports
6. ✅ Includes comprehensive tests
7. ✅ Contains clear, concise documentation in a single README
8. ✅ Can be deployed locally, in Docker, or integrated with MCP clients
9. ✅ Educates developers on MCP server implementation trade-offs
10. ✅ Serves as a template for building real-world MCP servers

## Next Steps

1. **Setup**: Initialize TypeScript project, configure tooling
2. **Shared Foundation**: Build common interfaces, utilities, context
3. **Bare-Metal Implementation**: Core handlers, registry, transports, middleware
4. **Framework Research**: Investigate and select MCP frameworks
5. **Framework Implementation**: Parallel implementation using selected framework
6. **Testing**: Comprehensive test suite for both implementations
7. **Documentation**: Single comprehensive README with all sections
8. **Polish**: Docker setup, examples, demo materials
