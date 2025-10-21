// ABOUTME: Expression sanitization and validation utilities
// ABOUTME: Prevents code injection in mathematical expressions

/**
 * Sanitizes mathematical expressions to prevent code injection
 */
export function sanitizeExpression(expression: string): string {
  const trimmed = expression.trim();

  if (!trimmed) {
    throw new Error('Expression cannot be empty');
  }

  if (trimmed.length > 1000) {
    throw new Error('Expression too long (max 1000 characters)');
  }

  // Only allow safe mathematical characters
  const allowedPattern = /^[0-9+\-*/().\s]+$/;
  if (!allowedPattern.test(trimmed)) {
    throw new Error(
      'Expression contains invalid characters. Only numbers, +, -, *, /, (, ), and . are allowed'
    );
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /__/, /\$/, /eval/i, /function/i, /import/i,
    /require/i, /process/i, /global/i, /this/i, /constructor/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`Expression contains forbidden pattern: ${pattern.source}`);
    }
  }

  // Check for balanced parentheses
  let parenDepth = 0;
  for (const char of trimmed) {
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (parenDepth < 0) {
      throw new Error('Unbalanced parentheses in expression');
    }
  }

  if (parenDepth !== 0) {
    throw new Error('Unbalanced parentheses in expression');
  }

  return trimmed;
}

/**
 * Validates that an expression is safe to evaluate
 */
export function validateExpression(expression: string): void {
  // Check for division by literal zero
  if (/\/\s*0(?!\d)/.test(expression)) {
    throw new Error('Expression contains division by zero');
  }

  // Check for repeated operators
  if (/[+*/]{2,}/.test(expression)) {
    throw new Error('Expression contains repeated operators');
  }

  // Check for leading/trailing operators
  if (/^[+*/]/.test(expression) || /[+\-*/]$/.test(expression)) {
    throw new Error('Expression has invalid leading or trailing operator');
  }
}
