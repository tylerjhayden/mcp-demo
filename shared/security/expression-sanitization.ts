/**
 * Sanitizes mathematical expressions to prevent code injection
 * Validates that expression only contains safe mathematical operations
 * @param expression - Mathematical expression to sanitize
 * @returns Sanitized expression
 * @throws Error if expression contains unsafe characters or patterns
 */
export function sanitizeExpression(expression: string): string {
  // Trim whitespace
  const trimmed = expression.trim();

  if (!trimmed) {
    throw new Error('Expression cannot be empty');
  }

  // Maximum reasonable expression length
  if (trimmed.length > 1000) {
    throw new Error('Expression too long (max 1000 characters)');
  }

  // Allowed characters: digits, operators, parentheses, decimal points, spaces
  // This prevents function calls, property access, and other code execution
  const allowedPattern = /^[0-9+\-*/().\s]+$/;

  if (!allowedPattern.test(trimmed)) {
    throw new Error(
      'Expression contains invalid characters. Only numbers, +, -, *, /, (, ), and . are allowed'
    );
  }

  // Check for suspicious patterns that might indicate code injection attempts
  const dangerousPatterns = [
    /__/,           // Dunder methods
    /\$/,           // Template literals or jQuery
    /eval/i,        // Eval calls
    /function/i,    // Function definitions
    /import/i,      // Import statements
    /require/i,     // Require statements
    /process/i,     // Process access
    /global/i,      // Global access
    /this/i,        // This reference
    /constructor/i, // Constructor access
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
 * Additional semantic checks beyond character filtering
 * @param expression - Expression to validate
 * @throws Error if expression has semantic issues
 */
export function validateExpression(expression: string): void {
  // Check for division by literal zero
  if (/\/\s*0(?!\d)/.test(expression)) {
    throw new Error('Expression contains division by zero');
  }

  // Check for repeated operators (e.g., "++", "**" if not intended)
  // Allow "--" for subtraction and negative numbers
  if (/[+*/]{2,}/.test(expression)) {
    throw new Error('Expression contains repeated operators');
  }

  // Check for leading/trailing operators (except minus for negative numbers)
  if (/^[+*/]/.test(expression) || /[+\-*/]$/.test(expression)) {
    throw new Error('Expression has invalid leading or trailing operator');
  }
}
