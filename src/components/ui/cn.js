/**
 * Minimal className composer (no external dependency).
 * Accepts strings, arrays and falsy values.
 */
export function cn(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ');
}
