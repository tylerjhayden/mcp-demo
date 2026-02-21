/**
 * Tests for FileResourceHandler
 * Covers file reading, path security, and validation
 */

import { FileResourceHandler } from '../../servers/bare-metal/handlers/FileResourceHandler.js';
import { MCPErrorCode } from '../../shared/types/index.js';
import { PATH_TRAVERSAL_ATTEMPTS } from '../helpers/fixtures.js';
import { TestFactories } from '../helpers/factories.js';
import { expectError } from '../helpers/assertions.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('FileResourceHandler', () => {
  let handler: FileResourceHandler;
  let testDir: string;

  beforeEach(async (): Promise<void> => {
    handler = new FileResourceHandler();
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'mcp-test-'));
  });

  afterEach(async (): Promise<void> => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('validate', () => {
    it('should validate valid file URI', (): void => {
      const result = handler.validate({ uri: 'file:///tmp/test.txt' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid URIs', (): void => {
      const result = handler.validate({ uri: 'not-a-uri' });
      expect(result.success).toBe(false);
    });

    it('should reject empty URI', (): void => {
      const result = handler.validate({ uri: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('execute', () => {
    it('should read text file', async (): Promise<void> => {
      const testFile = path.join(testDir, 'test.txt');
      await fs.writeFile(testFile, 'Hello, World!');

      const context = TestFactories.fileContext([testDir]);
      const result = await handler.execute(
        { uri: `file://${testFile}` },
        context
      );

      if (result.success) {
        expect(result.data.content).toBe('Hello, World!');
        expect(result.data.mimeType).toBe('text/plain');
      } else {
        throw new Error('Expected success');
      }
    });

    it('should reject path traversal attempts', async (): Promise<void> => {
      const context = TestFactories.fileContext([testDir]);

      for (const maliciousPath of PATH_TRAVERSAL_ATTEMPTS) {
        const result = await handler.execute(
          { uri: `file://${maliciousPath}` },
          context
        );
        expectError(result);
      }
    });

    it('should reject files outside allowed paths', async (): Promise<void> => {
      const testFile = path.join(tmpdir(), 'outside.txt');
      await fs.writeFile(testFile, 'data');

      const context = TestFactories.fileContext([testDir]);
      const result = await handler.execute(
        { uri: `file://${testFile}` },
        context
      );

      expectError(result);
      await fs.unlink(testFile);
    });

    it('should handle non-existent files', async (): Promise<void> => {
      const context = TestFactories.fileContext([testDir]);
      const result = await handler.execute(
        { uri: `file://${testDir}/nonexistent.txt` },
        context
      );

      expectError(result);
    });
  });

  describe('error response sanitization', () => {
    it('does not include internal path in access-denied error', async (): Promise<void> => {
      const context = TestFactories.fileContext([testDir]);
      const result = await handler.execute(
        { uri: 'file:///etc/passwd' },
        context
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.data).toBeUndefined();
        expect(result.error.message).not.toContain('/etc/passwd');
        expect(result.error.message).not.toContain(testDir);
      }
    });

    it('does not include originalError in file-not-found response', async (): Promise<void> => {
      const context = TestFactories.fileContext([testDir]);
      const result = await handler.execute(
        { uri: `file://${testDir}/nonexistent-file.txt` },
        context
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.data).toBeUndefined();
        expect(result.error.message).toBe('Resource not found');
      }
    });
  });

  describe('list', () => {
    it('should list files in allowed directory', async (): Promise<void> => {
      await fs.writeFile(path.join(testDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(testDir, 'file2.json'), 'content2');

      const context = TestFactories.fileContext([testDir]);
      const resources = await handler.listResources(context);

      expect(resources.length).toBeGreaterThanOrEqual(2);
      expect(resources[0]).toHaveProperty('uri');
      expect(resources[0]).toHaveProperty('name');
    });
  });
});
