/**
 * Tests for CalculateTool handler
 * Covers validation, execution, security, and error handling
 */

import { CalculateTool } from '../../servers/bare-metal/handlers/CalculateTool.js';
import { MCPErrorCode } from '../../shared/types/index.js';
import {
  createMockExecutionContext,
  getMetricsCalls,
} from '../helpers/mocks.js';
import {
  CALCULATE_EXPRESSIONS,
  CALCULATE_RESULTS,
} from '../helpers/fixtures.js';
import { TestFactories } from '../helpers/factories.js';
import {
  expectSuccess,
  expectError,
  expectErrorCode,
  expectValidationSuccess,
  expectValidationError,
} from '../helpers/assertions.js';

describe('CalculateTool', () => {
  let tool: CalculateTool;
  let context: ReturnType<typeof createMockExecutionContext>;

  beforeEach((): void => {
    tool = new CalculateTool();
    context = TestFactories.standardContext();
  });

  describe('validate', () => {
    it('should validate valid expression', (): void => {
      const result = tool.validate({ expression: '2 + 2' });
      expectValidationSuccess(result);
      expect(result.data.expression).toBe('2 + 2');
    });

    it('should reject empty expression', (): void => {
      const result = tool.validate({ expression: '' });
      expectValidationError(result);
    });

    it('should reject expression exceeding max length', (): void => {
      const result = tool.validate({ expression: 'a'.repeat(1001) });
      expectValidationError(result);
    });

    it('should reject non-string expression', (): void => {
      const result = tool.validate({ expression: 123 });
      expectValidationError(result);
    });

    it('should reject missing expression field', (): void => {
      const result = tool.validate({});
      expectValidationError(result);
    });
  });

  describe('execute', () => {
    describe('valid expressions', () => {
      it('should evaluate simple addition', async (): Promise<void> => {
        const result = await tool.execute({ expression: '2 + 2' }, context);
        expectSuccess(result);
        expect(result.data.expression).toBe('2 + 2');
        expect(result.data.result).toBe(4);
      });

      it('should evaluate multiplication', async (): Promise<void> => {
        const result = await tool.execute({ expression: '10 * 5' }, context);
        expectSuccess(result);
        expect(result.data.result).toBe(50);
      });

      it('should evaluate division', async (): Promise<void> => {
        const result = await tool.execute({ expression: '100 / 4' }, context);
        expectSuccess(result);
        expect(result.data.result).toBe(25);
      });

      it('should evaluate power operations', async (): Promise<void> => {
        const result = await tool.execute({ expression: '2 ^ 8' }, context);
        expectSuccess(result);
        expect(result.data.result).toBe(256);
      });

      it('should evaluate sqrt function', async (): Promise<void> => {
        const result = await tool.execute({ expression: 'sqrt(16)' }, context);
        expectSuccess(result);
        expect(result.data.result).toBe(4);
      });

      it('should evaluate complex expressions', async (): Promise<void> => {
        const result = await tool.execute({ expression: '(5 + 3) * 2' }, context);
        expectSuccess(result);
        expect(result.data.result).toBe(16);
      });

      it('should handle floating point numbers', async (): Promise<void> => {
        const result = await tool.execute({ expression: '3.14159 * 2' }, context);
        expectSuccess(result);
        expect(result.data.result).toBeCloseTo(6.28318, 4);
      });

      it('should handle scientific notation', async (): Promise<void> => {
        const result = await tool.execute({ expression: '1e6 + 1e3' }, context);
        expectSuccess(result);
        expect(result.data.result).toBe(1001000);
      });
    });

    describe('invalid expressions', () => {
      it('should reject code injection attempts', async (): Promise<void> => {
        for (const expr of CALCULATE_EXPRESSIONS.invalid) {
          const result = await tool.execute({ expression: expr }, context);
          expectError(result);
        }
      });

      it('should reject malformed expressions', async (): Promise<void> => {
        const result = await tool.execute({ expression: '2 +' }, context);
        expectError(result);
      });

      it('should handle division by zero', async (): Promise<void> => {
        const result = await tool.execute({ expression: '1 / 0' }, context);
        expectError(result);
        expectErrorCode(result, MCPErrorCode.InvalidParams);
      });
    });

    describe('metrics recording', () => {
      it('should record success metrics', async (): Promise<void> => {
        await tool.execute({ expression: '2 + 2' }, context);

        const metrics = getMetricsCalls(context.metrics);
        expect(metrics.counters).toContainEqual(['calculate_success_total', undefined]);
        expect(metrics.durations).toEqual(
          expect.arrayContaining([
            expect.arrayContaining(['calculate_duration_ms', expect.any(Number), undefined])
          ])
        );
      });

      it('should record error metrics', async (): Promise<void> => {
        await tool.execute({ expression: 'invalid' }, context);

        const metrics = getMetricsCalls(context.metrics);
        expect(metrics.counters).toEqual(
          expect.arrayContaining([
            expect.arrayContaining([
              'calculate_error_total',
              expect.objectContaining({ error_type: expect.any(String) })
            ])
          ])
        );
      });
    });
  });

  describe('handleError', () => {
    it('should map validation errors to InvalidParams', (): void => {
      const error = new Error('invalid expression detected');
      const mcpError = tool.handleError(error);
      expect(mcpError.code).toBe(MCPErrorCode.InvalidParams);
      expect(mcpError.message).toContain('Invalid expression');
    });

    it('should map math errors to InvalidParams', (): void => {
      const error = new Error('division by zero');
      const mcpError = tool.handleError(error);
      expect(mcpError.code).toBe(MCPErrorCode.InvalidParams);
      expect(mcpError.message).toContain('Mathematical error');
    });

    it('should map unknown errors to InternalError', (): void => {
      const error = new Error('unexpected failure');
      const mcpError = tool.handleError(error);
      expect(mcpError.code).toBe(MCPErrorCode.InternalError);
    });
  });
});
