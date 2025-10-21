// ABOUTME: File path sanitization and validation utilities
// ABOUTME: Prevents path traversal attacks

import path from 'path';
import { promises as fs } from 'fs';

/**
 * Sanitizes and validates a file path to prevent path traversal attacks
 */
export function sanitizeFilePath(filePath: string, allowedPaths: string[]): string {
  const absolutePath = path.resolve(filePath);

  // Check if path is within any allowed directory
  const isAllowed = allowedPaths.some((allowedPath) => {
    const resolvedAllowed = path.resolve(allowedPath);
    return absolutePath.startsWith(resolvedAllowed + path.sep) || absolutePath === resolvedAllowed;
  });

  if (!isAllowed) {
    throw new Error(
      `Access denied: Path "${absolutePath}" is outside allowed directories: ${allowedPaths.join(', ')}`
    );
  }

  // Check for suspicious patterns
  if (filePath.includes('..') || filePath.includes('~')) {
    throw new Error(`Access denied: Path contains suspicious patterns: ${filePath}`);
  }

  return absolutePath;
}

/**
 * Validates that a file exists and is readable
 */
export async function validateFileAccess(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Extracts file path from file:// URI
 */
export function parseFileUri(uri: string): string {
  if (!uri.startsWith('file://')) {
    throw new Error(`Invalid file URI: must start with file:// (got: ${uri})`);
  }

  let filePath = uri.slice(7);
  filePath = decodeURIComponent(filePath);
  return filePath;
}

/**
 * Creates a file:// URI from a file path
 */
export function createFileUri(filePath: string): string {
  const absolutePath = path.resolve(filePath);
  const encodedPath = encodeURI(absolutePath);
  return `file://${encodedPath}`;
}
