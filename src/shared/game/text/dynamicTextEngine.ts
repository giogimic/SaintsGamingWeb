/**
 * Saints Gaming — Dynamic Text & Template Interpolator Engine (Studio Plan Part 8 §8)
 *
 * Provides safe, deterministic variable replacement and formatting for dialogue,
 * quest descriptions, item tooltips, and server notifications without arbitrary code execution.
 */

export interface TextInterpolationContext {
  playerName?: string;
  level?: number;
  gold?: number;
  faction?: string;
  reputation?: number;
  target?: string;
  item?: string;
  amount?: number;
  timeOfDay?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Interpolates variables formatted like `{variableName}` or `{variableName:fallback}`.
 * Escapes raw curly braces when prefixed with backslash `\{`.
 */
export function interpolateText(
  template: string,
  context: TextInterpolationContext = {}
): string {
  if (!template) return '';

  // First replace unescaped variables
  const interpolated = template.replace(/(^|[^\\])\{([a-zA-Z0-9_]+)(?::([^}]*))?\}/g, (match, prefix, key, fallback) => {
    const value = context[key];
    let formatted: string;
    if (value !== undefined && value !== null) {
      formatted = typeof value === 'number' ? value.toLocaleString() : String(value);
    } else {
      formatted = fallback !== undefined ? fallback : `{${key}}`;
    }
    return prefix + formatted;
  });

  // Finally unescape any escaped braces: \{ -> { and \} -> }
  return interpolated.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
}

/**
 * Evaluates a simple conditional text string formatted like:
 * `[if conditionKey]Text when true[else]Text when false[endif]`
 */
export function evaluateConditionalText(
  template: string,
  context: Record<string, any> = {}
): string {
  if (!template) return '';

  return template.replace(/\[if\s+([a-zA-Z0-9_]+)\]([\s\S]*?)(?:\[else\]([\s\S]*?))?\[endif\]/g, (match, key, trueBranch, falseBranch) => {
    const isTrue = Boolean(context[key]);
    return isTrue ? trueBranch : (falseBranch || '');
  });
}

/**
 * Formats full narrative text with both conditionals and variable interpolation.
 */
export function formatNarrativeText(
  template: string,
  context: TextInterpolationContext = {}
): string {
  const conditionalResolved = evaluateConditionalText(template, context);
  return interpolateText(conditionalResolved, context);
}
