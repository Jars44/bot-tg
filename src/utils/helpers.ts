/**
 * Helper utilities
 */

/**
 * Promisified delay
 */
export const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Format current time as HH:mm
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Check if text looks like random/gibberish text
 */
export function isRandomText(text: string): boolean {
  return (
    text.length >= 4 &&
    !text.includes(" ") &&
    !/^[0-9]+$/.test(text) &&
    (/[a-z]{6,}/i.test(text) || /(.)\\1{3,}/.test(text))
  );
}
