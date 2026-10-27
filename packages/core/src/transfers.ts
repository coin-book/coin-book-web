const DAY_MS = 86_400_000;

export type CounterpartCandidate = { id: string; bookedOn: string; numberMatches: boolean };

/** The candidate that clearly beats the others; undefined when two are equally likely or there is no choice. */
export function recommendedCounterpart(
  legBookedOn: string,
  candidates: CounterpartCandidate[],
): string | undefined {
  if (candidates.length < 2) return undefined;
  const byNumber = candidates.filter((c) => c.numberMatches);
  const pool = byNumber.length > 0 ? byNumber : candidates;
  const distance = (c: CounterpartCandidate) =>
    Math.abs(Date.parse(c.bookedOn) - Date.parse(legBookedOn)) / DAY_MS;
  const closest = Math.min(...pool.map(distance));
  const nearest = pool.filter((c) => distance(c) === closest);
  return nearest.length === 1 ? nearest[0].id : undefined;
}
