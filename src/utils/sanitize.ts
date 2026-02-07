/**
 * Input sanitization utilities
 */

/**
 * Sanitize text for SVG embedding
 * Escapes XML entities to prevent malformed XML
 */
export function sanitizeForSvg(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Basic text sanitization (remove control characters)
 */
export function sanitizeText(input: string): string {
  // Remove control characters except newlines and tabs
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}
