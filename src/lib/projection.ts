// Weekday multipliers for accurate weekly projections
// Based on historical data patterns showing different activity levels per day
export const WEEKDAY_MULTIPLIER: Record<string, number> = {
  Monday: 5.90,
  Tuesday: 2.92,
  Wednesday: 2.05,
  Thursday: 1.89,
  Friday: 1.38,
  Saturday: 1.15,
  Sunday: 1.00,
};

/**
 * Predicts the total for the entire week based on cumulative progress so far
 * @param cumulativeSoFar - The cumulative value up to the current day
 * @param day - The current day of the week (defaults to today)
 * @returns Projected total for the entire week
 */
export function predictWeeklyTotal(
  cumulativeSoFar: number,
  day: string = new Date().toLocaleDateString('en-US', { weekday: 'long' }),
): number {
  return Math.round(cumulativeSoFar * (WEEKDAY_MULTIPLIER[day] ?? 1));
}

/**
 * Calculates pacing percentage vs a reference total (e.g., previous week)
 * @param cumulativeSoFar - The cumulative value up to the current day
 * @param referenceTotal - The reference total to compare against (e.g., last week's total)
 * @param day - The current day of the week
 * @returns Percentage difference between projected and reference, or null if no reference
 */
export function pacingVsReference(
  cumulativeSoFar: number,
  referenceTotal: number,
  day?: string,
): number | null {
  if (!referenceTotal) return null;
  const projected = predictWeeklyTotal(cumulativeSoFar, day);
  return ((projected - referenceTotal) / referenceTotal) * 100;
}

/**
 * Gets a human-readable pacing status
 * @param pacePercent - The pacing percentage
 * @returns Status text and suggested emoji
 */
export function getPacingStatus(pacePercent: number | null): { text: string; emoji: string } {
  if (pacePercent === null) return { text: 'No data', emoji: '📊' };
  
  if (pacePercent > 20) return { text: 'Well ahead', emoji: '🚀' };
  if (pacePercent > 5) return { text: 'On track', emoji: '✅' };
  if (pacePercent > -5) return { text: 'Steady', emoji: '➡️' };
  if (pacePercent > -20) return { text: 'Behind', emoji: '⚠️' };
  return { text: 'Needs attention', emoji: '🔴' };
}