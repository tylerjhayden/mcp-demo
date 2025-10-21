// ABOUTME: Calculate tool using mcp-framework MCPTool pattern
// ABOUTME: Auto-discovered from /tools directory

import { MCPTool, defineSchema, type MCPInput } from 'mcp-framework';
import { z } from 'zod';
import { evaluate } from 'mathjs';
import { sanitizeExpression, validateExpression } from '../utils/expression.js';

const CalculateSchema = defineSchema({
  expression: z
    .string()
    .min(1, 'Expression cannot be empty')
    .max(1000, 'Expression too long')
    .describe('Mathematical expression to evaluate'),
});

class CalculateTool extends MCPTool {
  name = 'calculate';
  description = 'Evaluate a mathematical expression';
  schema = CalculateSchema;

  async execute(input: MCPInput<this>) {
    try {
      // Sanitize and validate expression
      const sanitized = sanitizeExpression(input.expression);
      validateExpression(sanitized);

      // Evaluate using math.js
      const result = evaluate(sanitized);

      // Ensure result is a finite number
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        throw new Error('Expression did not evaluate to a finite number');
      }

      return JSON.stringify(
        {
          expression: input.expression,
          result,
        },
        null,
        2
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Calculation failed: ${message}`);
    }
  }
}

export default CalculateTool;
