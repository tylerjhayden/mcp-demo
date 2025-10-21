# mcp-framework Implementation

MCP server built using the [mcp-framework](https://github.com/QuantGeekDev/mcp-framework), demonstrating convention-over-configuration with auto-discovery.

## Features

- **Auto-Discovery**: Tools and resources are automatically discovered from `/tools` and `/resources` directories
- **Convention Over Configuration**: Minimal setup, maximum productivity
- **CLI Tooling**: Built-in `mcp validate` command for schema validation
- **Type Safety**: `McpInput<this>` for automatic type inference
- **Scalable**: Designed for projects with many capabilities

## Setup

```bash
cd servers/mcp-framework-impl
npm install
```

## Running

### Stdio Mode (default)

```bash
npm run dev
```

### Validate Schemas

```bash
npm run validate
```

## Capabilities

### Tools (Auto-Discovered from `/tools`)

- **calculate** (`tools/calculate.ts`): Evaluates mathematical expressions
  - Schema: `{ expression: string }`
  - Returns: `{ expression, result }`
  - Uses: `defineSchema()` for compile-time validation

- **get_weather** (`tools/get_weather.ts`): Fetches weather data
  - Schema: `{ location: string }`
  - Returns: `{ location, temperature, conditions, timestamp }`
  - Features: 10-minute caching

### Resources (Auto-Discovered from `/resources`)

- **file** (`resources/file.ts`): Reads file content
  - Schema: `{ uri: string }`
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
  index.ts              # Main server (minimal!)
  tools/                # Auto-discovered tools
    calculate.ts
    get_weather.ts
  resources/            # Auto-discovered resources
    file.ts
  utils/                # Shared utilities
    expression.ts
    file-security.ts
    http-client.ts
```

## Auto-Discovery Pattern

**Key Concept**: Place files in conventional locations, framework finds them automatically.

**Adding a New Tool:**
1. Create `src/tools/my_tool.ts`
2. Extend `MCPTool` class
3. Done - no registration needed!

**Example:**
```typescript
import { MCPTool, defineSchema, type McpInput } from 'mcp-framework';
import { z } from 'zod';

const MySchema = defineSchema({
  input: z.string().describe('Input description'),
});

class MyTool extends MCPTool {
  name = 'my_tool';
  description = 'What this tool does';
  schema = MySchema;

  async execute(input: McpInput<this>) {
    // TypeScript knows input.input is a string!
    return `Processed: ${input.input}`;
  }
}

export default MyTool;
```

## Framework Comparison

**Advantages:**
- Zero-config setup for new capabilities
- Best for large codebases with many tools
- Built-in validation tooling
- Clear file organization
- Scales well as project grows

**Trade-offs:**
- Must follow directory conventions
- More structure than needed for small servers
- Framework dependency
- Slightly more boilerplate per tool (separate files)
