# FastMCP Implementation

MCP server built using the [FastMCP](https://github.com/punkpeye/fastmcp) framework, demonstrating the builder API pattern.

## Features

- **Builder Pattern**: Uses `server.addTool()` and `server.addResourceTemplate()`
- **Schema Validation**: Zod schemas for type-safe parameter validation
- **Multiple Transports**: Supports both stdio and HTTP Stream modes
- **Simple API**: Express-like, familiar developer experience

## Setup

```bash
cd servers/fastmcp-impl
npm install
```

## Running

### Stdio Mode (for MCP clients like Claude Desktop)

```bash
npm run dev
```

### HTTP Mode (for testing)

```bash
npm run dev -- --http
```

## Capabilities

### Tools

- **calculate**: Evaluates mathematical expressions
  - Parameters: `expression` (string)
  - Returns: `{ expression, result }`

- **get_weather**: Fetches weather data for a location
  - Parameters: `location` (string)
  - Returns: `{ location, temperature, conditions, timestamp }`
  - Features: 10-minute caching

### Resources

- **file://{filepath}**: Reads file content
  - URI Template: `file://{filepath}`
  - Returns: `{ uri, mimeType, size, content }`
  - Security: Path traversal protection

## Environment Variables

```bash
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_API_TIMEOUT=5000
WEATHER_CACHE_TTL=600
ALLOWED_FILE_PATHS=/path1:/path2
HTTP_PORT=3000
```

## Code Organization

```
src/
  index.ts              # Main server with all capabilities
  utils/
    expression.ts       # Expression sanitization
    file-security.ts    # Path validation
    http-client.ts      # HTTP utilities
```

## Framework Comparison

**Advantages:**
- Minimal boilerplate
- Familiar builder API (like Express.js)
- Built-in transport management
- Good TypeScript support

**Trade-offs:**
- Less control than bare-metal
- Framework dependency
- All logic in one file (for simple servers)
