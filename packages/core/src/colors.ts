/** Category hues light enough that text on a full fill must be ink, not white. */
const lightHues = new Set(['slunecnice', 'limeta', 'uncategorized']);

export function colorVar(key: string | null | undefined): string {
  return `var(--cat-${key ?? 'uncategorized'})`;
}

export function onColorVar(key: string | null | undefined): string {
  return lightHues.has(key ?? 'uncategorized') ? 'var(--on-light)' : 'var(--on-dark)';
}
