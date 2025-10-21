# EasyMCP Implementation

> **⚠️ WARNING: This implementation may not run due to package stability issues.**
>
> The `easy-mcp` npm package (v0.0.0-development) has broken module exports. The published version bundles all code but doesn't properly export the `EasyMCP` class or decorator functions, causing import failures.
>
> **Alternatives:** The other three implementations (bare-metal, FastMCP, mcp-framework) are fully functional. Use those for working examples.

MCP server built using the [EasyMCP](https://github.com/zcaceres/easy-mcp) framework, demonstrating the decorator-based pattern.

## Features

- **Decorator Pattern**: Uses `@Tool()` and `@Resource()` decorators
- **Type Inference**: Auto-infers types from TypeScript method signatures
- **Minimal Boilerplate**: "Absurdly easy" setup with class-based approach
- **Clean Syntax**: Methods become tools/resources automatically

## Setup

```bash
cd servers/easymcp-impl
npm install
```

## Running

### Stdio Mode (default for MCP clients)

```bash
npm run dev
```

## Capabilities

### Tools

- **calculate**: Evaluates mathematical expressions
  - Method: `calculate(expression: string)`
  - Returns: `{ expression, result }`
  - Decorator infers parameter schema from TypeScript signature

- **getWeather**: Fetches weather data for a location
  - Method: `getWeather(location: string)`
  - Returns: `{ location, temperature, conditions, timestamp }`
  - Features: 10-minute caching

### Resources

- **file://{filepath}**: Reads file content
  - Method: `fileContent(filepath: string)`
  - Decorator: `@Resource('file://{filepath}')`
  - Returns: `{ uri, mimeType, size, content }`
  - Security: Path traversal protection

## Environment Variables

```bash
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_API_TIMEOUT=5000
WEATHER_CACHE_TTL=600
ALLOWED_FILE_PATHS=/path1:/path2
```

## Code Organization

```
src/
  index.ts              # Main server class with decorators
  utils/
    expression.ts       # Expression sanitization
    file-security.ts    # Path validation
    http-client.ts      # HTTP utilities
```

## Decorator Pattern Benefits

**Key Advantages:**
- Extremely concise code
- No explicit schema definition needed
- Natural TypeScript class structure
- Method signatures define tool inputs

**Example:**
```typescript
@Tool({ description: 'Add two numbers' })
async add(a: number, b: number): Promise<number> {
  return a + b;
}
```

The decorator automatically:
- Registers the tool as "add"
- Infers parameters `a` and `b` as numbers
- Handles MCP protocol wrapping

## Framework Comparison

**Advantages:**
- Least boilerplate code
- TypeScript-first approach
- Intuitive for OOP developers
- Fast development iteration

**Trade-offs:**
- Experimental decorator API
- Less explicit than builder pattern
- TypeScript decorators may change
- All logic in one class (for simple servers)
