// ABOUTME: Read file tool using mcp-framework MCPTool pattern
// ABOUTME: Auto-discovered from /tools directory

import { MCPTool, defineSchema, type MCPInput } from 'mcp-framework';
import { z } from 'zod';
import { promises as fs } from 'fs';
import mime from 'mime-types';
import {
  sanitizeFilePath,
  validateFileAccess,
  parseFileUri,
} from '../utils/file-security.js';

const ReadFileSchema = defineSchema({
  uri: z.string().startsWith('file://', 'URI must start with file://').describe('File URI to read'),
});

// Configuration from environment variables
const ALLOWED_FILE_PATHS = process.env.ALLOWED_FILE_PATHS?.split(':') || [process.cwd()];

class ReadFileTool extends MCPTool {
  name = 'read_file';
  description = 'Read file content with path traversal protection';
  schema = ReadFileSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Parse and sanitize file path
      const filePath = parseFileUri(input.uri);
      const sanitizedPath = sanitizeFilePath(filePath, ALLOWED_FILE_PATHS);

      // Verify file exists and is readable
      const isAccessible = await validateFileAccess(sanitizedPath);
      if (!isAccessible) {
        throw new Error(`File not found or not readable: ${filePath}`);
      }

      // Read file content
      const content = await fs.readFile(sanitizedPath, 'utf-8');
      const stats = await fs.stat(sanitizedPath);
      const mimeType = mime.lookup(sanitizedPath) || 'application/octet-stream';

      return JSON.stringify(
        {
          uri: input.uri,
          mimeType,
          size: stats.size,
          content,
        },
        null,
        2
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`File read failed: ${message}`);
    }
  }
}

export default ReadFileTool;
