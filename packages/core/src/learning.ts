/** Below this the classifier is only guessing: not offered as a suggestion nor as Enter. */
export const MIN_SUGGESTION_CONFIDENCE = 0.2;

export function usable<T extends { confidence: number }>(suggestions: T[] | undefined | null): T[] {
  return (suggestions ?? []).filter((s) => s.confidence >= MIN_SUGGESTION_CONFIDENCE);
}
