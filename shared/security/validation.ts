import { z } from 'zod';
import type { ValidationResult } from '../types/index.js';

/**
 * Validates input against a Zod schema and returns standardized result
 * @param schema - Zod schema to validate against
 * @param input - Input data to validate
 * @returns Validation result with parsed data or detailed error information
 */
export function validateWithSchema<T>(
  schema: z.ZodType<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: {
      message: 'Validation failed',
      issues: result.error.errors.map((err) => ({
        path: err.path.map(String),
        message: err.message,
      })),
    },
  };
}

/**
 * Creates a validation result for successful validation
 */
export function validationSuccess<T>(data: T): ValidationResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Creates a validation result for failed validation
 */
export function validationError(message: string, issues?: Array<{ path: string[]; message: string }>): ValidationResult {
  return {
    success: false,
    error: {
      message,
      issues: issues || [{ path: [], message }],
    },
  };
}
