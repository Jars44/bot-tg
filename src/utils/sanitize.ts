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

/**
 * Escape Telegram Markdown special characters
 * Prevents malformed Markdown entities in messages sent with parse_mode: "Markdown"
 */
export function escapeMarkdown(input: string): string {
  return input
    .replace(/\\/g, "\\\\")  // Backslash first (escape itself)
    .replace(/\*/g, "\\*")   // Asterisk (bold)
    .replace(/_/g, "\\_")    // Underscore (italic)
    .replace(/\[/g, "\\[")   // Opening bracket (link)
    .replace(/\]/g, "\\]")   // Closing bracket (link)
    .replace(/`/g, "\\`")    // Backtick (inline code)
    .replace(/~/g, "\\~")    // Tilde (strikethrough)
    .replace(/\|/g, "\\|")   // Pipe (table)
    .replace(/\{/g, "\\{")   // Opening brace
    .replace(/\}/g, "\\}");  // Closing brace
}

