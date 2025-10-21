// ABOUTME: mcp-framework server implementation
// ABOUTME: Demonstrates auto-discovery pattern with convention over configuration

import { MCPServer } from 'mcp-framework';

// Create server instance
const server = new MCPServer();

// Auto-discovery will find all tools in /tools and resources in /resources
console.error('Starting mcp-framework server with auto-discovery...');

// Start the server
await server.start();

console.error('mcp-framework server running!');
