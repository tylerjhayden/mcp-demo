import type { CapabilityHandler } from '../../../shared/types/index.js';

/**
 * Tool metadata for MCP tool listing
 */
export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Registry for tool handlers
 * Provides centralized management of all available tools
 */
export class ToolRegistry {
  private tools: Map<string, CapabilityHandler> = new Map();
  private metadata: Map<string, ToolMetadata> = new Map();

  /**
   * Registers a tool handler with metadata
   * @param name - Tool name (used in MCP tool calls)
   * @param handler - Tool handler implementation
   * @param metadata - Tool metadata for discovery
   */
  register(name: string, handler: CapabilityHandler, metadata: ToolMetadata): void {
    if (this.tools.has(name)) {
      throw new Error(`Tool "${name}" is already registered`);
    }

    this.tools.set(name, handler);
    this.metadata.set(name, metadata);
  }

  /**
   * Gets a tool handler by name
   * @param name - Tool name
   * @returns Tool handler or undefined if not found
   */
  get(name: string): CapabilityHandler | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks if a tool is registered
   * @param name - Tool name
   * @returns True if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Lists all registered tools with their metadata
   * @returns Array of tool metadata
   */
  list(): ToolMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Gets metadata for a specific tool
   * @param name - Tool name
   * @returns Tool metadata or undefined if not found
   */
  getMetadata(name: string): ToolMetadata | undefined {
    return this.metadata.get(name);
  }

  /**
   * Gets the number of registered tools
   */
  size(): number {
    return this.tools.size;
  }

  /**
   * Unregisters a tool (useful for testing)
   * @param name - Tool name to unregister
   */
  unregister(name: string): boolean {
    const existed = this.tools.has(name);
    this.tools.delete(name);
    this.metadata.delete(name);
    return existed;
  }

  /**
   * Clears all registered tools (useful for testing)
   */
  clear(): void {
    this.tools.clear();
    this.metadata.clear();
  }
}
