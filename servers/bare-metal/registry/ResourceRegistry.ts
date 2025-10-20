import type { FileResourceHandler } from '../handlers/FileResourceHandler.js';

/**
 * Resource metadata for MCP resource listing
 */
export interface ResourceMetadata {
  uriScheme: string;
  description: string;
  mimeTypes?: string[];
}

/**
 * Registry for resource handlers
 * Provides centralized management of all available resource types
 */
export class ResourceRegistry {
  private resources: Map<string, FileResourceHandler> = new Map();
  private metadata: Map<string, ResourceMetadata> = new Map();

  /**
   * Registers a resource handler with metadata
   * @param uriScheme - URI scheme (e.g., "file", "http", "db")
   * @param handler - Resource handler implementation
   * @param metadata - Resource metadata for discovery
   */
  register(uriScheme: string, handler: FileResourceHandler, metadata: ResourceMetadata): void {
    if (this.resources.has(uriScheme)) {
      throw new Error(`Resource scheme "${uriScheme}" is already registered`);
    }

    this.resources.set(uriScheme, handler);
    this.metadata.set(uriScheme, metadata);
  }

  /**
   * Gets a resource handler by URI scheme
   * @param uriScheme - URI scheme
   * @returns Resource handler or undefined if not found
   */
  get(uriScheme: string): FileResourceHandler | undefined {
    return this.resources.get(uriScheme);
  }

  /**
   * Gets a resource handler for a given URI
   * @param uri - Full resource URI (e.g., "file:///path/to/file.txt")
   * @returns Resource handler or undefined if no handler for scheme
   */
  getForUri(uri: string): FileResourceHandler | undefined {
    const colonIndex = uri.indexOf(':');
    if (colonIndex === -1) {
      return undefined;
    }

    const scheme = uri.substring(0, colonIndex).toLowerCase();
    return this.get(scheme);
  }

  /**
   * Checks if a resource scheme is registered
   * @param uriScheme - URI scheme
   * @returns True if resource handler exists
   */
  has(uriScheme: string): boolean {
    return this.resources.has(uriScheme);
  }

  /**
   * Lists all registered resource schemes with metadata
   * @returns Array of resource metadata
   */
  list(): ResourceMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Gets metadata for a specific resource scheme
   * @param uriScheme - URI scheme
   * @returns Resource metadata or undefined if not found
   */
  getMetadata(uriScheme: string): ResourceMetadata | undefined {
    return this.metadata.get(uriScheme);
  }

  /**
   * Gets the number of registered resource handlers
   */
  size(): number {
    return this.resources.size;
  }

  /**
   * Unregisters a resource handler (useful for testing)
   * @param uriScheme - URI scheme to unregister
   */
  unregister(uriScheme: string): boolean {
    const existed = this.resources.has(uriScheme);
    this.resources.delete(uriScheme);
    this.metadata.delete(uriScheme);
    return existed;
  }

  /**
   * Clears all registered resource handlers (useful for testing)
   */
  clear(): void {
    this.resources.clear();
    this.metadata.clear();
  }
}
