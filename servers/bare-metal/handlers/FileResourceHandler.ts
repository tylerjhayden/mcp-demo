import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import mime from 'mime-types';
import type {
  CapabilityHandler,
  FileResourceParams,
  FileResourceResult,
  FileResourceListItem,
  ExecutionContext,
  Result,
  MCPError,
  ValidationResult,
} from '../../../shared/types/index.js';
import { validateWithSchema } from '../../../shared/security/index.js';
import {
  sanitizeFilePath,
  validateFileAccess,
  parseFileUri,
  createFileUri,
} from '../../../shared/security/index.js';
import { MCPErrorCode } from '../../../shared/types/index.js';
import { extractErrorMessage } from '../../../shared/utils/error-handling.js';

/**
 * Schema for file resource parameters
 */
const FileResourceParamsSchema = z.object({
  uri: z.string().startsWith('file://', 'URI must start with file://'),
});

/**
 * File resource handler
 * Provides safe file system access with path traversal protection
 */
export class FileResourceHandler implements CapabilityHandler<FileResourceParams, FileResourceResult> {
  /**
   * Validates input parameters using Zod schema
   */
  validate(input: unknown): ValidationResult<FileResourceParams> {
    return validateWithSchema(FileResourceParamsSchema, input);
  }

  /**
   * Executes file read operation
   */
  async execute(
    params: FileResourceParams,
    context: ExecutionContext
  ): Promise<Result<FileResourceResult>> {
    const startTime = Date.now();

    try {
      context.logger.info({ uri: params.uri }, 'Reading file resource');

      // Parse file URI
      const filePath = parseFileUri(params.uri);

      // Sanitize and validate path
      const sanitizedPath = sanitizeFilePath(filePath, context.config.security.allowedFilePaths);

      // Verify file exists and is readable
      const isAccessible = await validateFileAccess(sanitizedPath);
      if (!isAccessible) {
        throw new Error('File not found or not readable');
      }

      // Read file content
      const content = await fs.readFile(sanitizedPath, 'utf-8');
      const stats = await fs.stat(sanitizedPath);

      // Detect MIME type
      const mimeType = mime.lookup(sanitizedPath) || 'application/octet-stream';

      const duration = Date.now() - startTime;
      context.metrics.recordDuration('file_read_duration_ms', duration);
      context.metrics.incrementCounter('file_read_success_total');

      context.logger.info(
        { uri: params.uri, size: stats.size, mimeType, durationMs: duration },
        'File read successfully'
      );

      return {
        success: true,
        data: {
          uri: params.uri,
          mimeType,
          content,
          size: stats.size,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      context.metrics.recordDuration('file_read_duration_ms', duration);
      context.metrics.incrementCounter('file_read_error_total', {
        error_type: error instanceof Error ? error.name : 'unknown',
      });

      context.logger.error(
        { uri: params.uri, error: extractErrorMessage(error) },
        'File read failed'
      );

      return {
        success: false,
        error: this.handleError(error instanceof Error ? error : new Error(String(error))),
      };
    }
  }

  /**
   * Lists available files in allowed directories
   */
  async listResources(context: ExecutionContext): Promise<FileResourceListItem[]> {
    const files: FileResourceListItem[] = [];

    for (const allowedPath of context.config.security.allowedFilePaths) {
      try {
        const entries = await fs.readdir(allowedPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile()) {
            const filePath = path.join(allowedPath, entry.name);
            const stats = await fs.stat(filePath);
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';

            files.push({
              uri: createFileUri(filePath),
              name: entry.name,
              mimeType,
              size: stats.size,
            });
          }
        }
      } catch (error) {
        context.logger.warn(
          { path: allowedPath, error: extractErrorMessage(error) },
          'Failed to list directory'
        );
        // Continue with other directories even if one fails
      }
    }

    context.logger.info({ fileCount: files.length }, 'Listed file resources');
    return files;
  }

  /**
   * Transforms errors into MCP error format
   */
  handleError(error: Error): MCPError {
    // Path traversal or access denied
    if (error.message.includes('Access denied') || error.message.includes('outside allowed')) {
      return {
        code: MCPErrorCode.InvalidParams,
        message: 'Access denied: path is outside allowed directories',
      };
    }

    // File not found
    if (error.message.includes('not found') || error.message.includes('ENOENT')) {
      return {
        code: MCPErrorCode.ResourceNotFound,
        message: 'Resource not found',
      };
    }

    // Permission errors
    if (error.message.includes('EACCES') || error.message.includes('permission')) {
      return {
        code: MCPErrorCode.InternalError,
        message: 'Access denied: insufficient permissions',
      };
    }

    // Invalid URI
    if (error.message.includes('Invalid file URI')) {
      return {
        code: MCPErrorCode.InvalidParams,
        message: 'Invalid file URI',
      };
    }

    // Generic file system error
    return {
      code: MCPErrorCode.InternalError,
      message: 'Request failed',
    };
  }
}
