import { z } from 'zod';
import { evaluate } from 'mathjs';
import type {
  CapabilityHandler,
  CalculateParams,
  CalculateResult,
  ExecutionContext,
  Result,
  MCPError,
  ValidationResult,
} from '../../../shared/types/index.js';
import { validateWithSchema } from '../../../shared/security/index.js';
import { sanitizeExpression, validateExpression } from '../../../shared/security/index.js';
import { MCPErrorCode } from '../../../shared/types/index.js';

/**
 * Schema for calculate tool parameters
 */
const CalculateParamsSchema = z.object({
  expression: z.string().min(1, 'Expression cannot be empty').max(1000, 'Expression too long'),
});

/**
 * Calculate tool handler
 * Evaluates mathematical expressions with strict security controls
 */
export class CalculateTool implements CapabilityHandler<CalculateParams, CalculateResult> {
  /**
   * Validates input parameters using Zod schema
   */
  validate(input: unknown): ValidationResult<CalculateParams> {
    return validateWithSchema(CalculateParamsSchema, input);
  }

  /**
   * Executes mathematical expression evaluation
   */
  async execute(
    params: CalculateParams,
    context: ExecutionContext
  ): Promise<Result<CalculateResult>> {
    const startTime = Date.now();

    try {
      context.logger.info({ expression: params.expression }, 'Evaluating expression');

      // Sanitize expression to prevent code injection
      const sanitized = sanitizeExpression(params.expression);

      // Additional semantic validation
      validateExpression(sanitized);

      // Evaluate using math.js (safe mathematical expression evaluator)
      const result = evaluate(sanitized);

      // Ensure result is a number
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error('Expression did not evaluate to a finite number');
      }

      const duration = Date.now() - startTime;
      context.metrics.recordDuration('calculate_duration_ms', duration);
      context.metrics.incrementCounter('calculate_success_total');

      context.logger.info(
        { expression: params.expression, result, durationMs: duration },
        'Expression evaluated successfully'
      );

      return {
        success: true,
        data: {
          expression: params.expression,
          result,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      context.metrics.recordDuration('calculate_duration_ms', duration);
      context.metrics.incrementCounter('calculate_error_total', {
        error_type: error instanceof Error ? error.name : 'unknown',
      });

      context.logger.error(
        { expression: params.expression, error: error instanceof Error ? error.message : String(error) },
        'Expression evaluation failed'
      );

      return {
        success: false,
        error: this.handleError(error instanceof Error ? error : new Error(String(error))),
      };
    }
  }

  /**
   * Transforms errors into MCP error format
   */
  handleError(error: Error): MCPError {
    // Validation and security errors are client errors
    if (
      error.message.includes('invalid') ||
      error.message.includes('forbidden') ||
      error.message.includes('unsafe')
    ) {
      return {
        code: MCPErrorCode.InvalidParams,
        message: `Invalid expression: ${error.message}`,
        data: {
          originalError: error.message,
        },
      };
    }

    // Math errors (division by zero, domain errors, etc.)
    if (error.message.includes('division') || error.message.includes('undefined')) {
      return {
        code: MCPErrorCode.InvalidParams,
        message: `Mathematical error: ${error.message}`,
        data: {
          originalError: error.message,
        },
      };
    }

    // Generic internal error for unexpected failures
    return {
      code: MCPErrorCode.InternalError,
      message: 'Failed to evaluate expression',
      data: {
        error: error.message,
      },
    };
  }
}
