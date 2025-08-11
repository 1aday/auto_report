// Daily contribution percentages (what % of week's total typically happens each day)
// Based on historical patterns, Monday has highest activity
const DAILY_CONTRIBUTION: Record<string, number> = {
  Monday: 0.17,    // 17% of weekly total
  Tuesday: 0.34,   // 34% cumulative (17% + 17%)
  Wednesday: 0.49,  // 49% cumulative  
  Thursday: 0.63,   // 63% cumulative
  Friday: 0.73,     // 73% cumulative
  Saturday: 0.87,   // 87% cumulative
  Sunday: 1.00,     // 100% cumulative
};

// Hourly distribution within a day (EST timezone patterns)
// Represents the typical percentage of a day's activity completed by each hour
const HOURLY_DISTRIBUTION: number[] = [
  0.01, 0.01, 0.01, 0.01, 0.02, 0.03,  // 00:00 - 05:59 (minimal activity)
  0.04, 0.05, 0.07, 0.09, 0.11, 0.12,  // 06:00 - 11:59 (morning ramp-up)
  0.13, 0.14, 0.15, 0.14, 0.13, 0.11,  // 12:00 - 17:59 (peak afternoon)
  0.09, 0.07, 0.05, 0.04, 0.03, 0.02,  // 18:00 - 23:59 (evening decline)
];

// Normalize hourly weights to ensure they sum to 1.0
const HOURLY_NORMALIZED: number[] = (() => {
  const total = HOURLY_DISTRIBUTION.reduce((s, v) => s + v, 0) || 1
  return HOURLY_DISTRIBUTION.map(v => v / total)
})()

/**
 * Get cumulative hourly progress for a specific hour of day
 */
function getCumulativeHourlyProgress(hour: number): number {
  let cumulative = 0;
  for (let h = 0; h <= hour; h++) {
    cumulative += HOURLY_NORMALIZED[h] || 0;
  }
  // Clamp to [0,1]
  return Math.max(0, Math.min(1, cumulative));
}

/**
 * Predicts the total for the entire week based on cumulative progress with hourly precision
 * @param cumulativeSoFar - The cumulative value up to now
 * @param day - The current day of the week (defaults to today)
 * @returns Projected total for the entire week
 */
export function predictWeeklyTotal(
  cumulativeSoFar: number,
  day: string = new Date().toLocaleDateString('en-US', { weekday: 'long' }),
): number {
  // Get current time
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = day;
  
  // Get the cumulative percentage of the week completed
  const dayIndex = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].indexOf(currentDay);
  if (dayIndex === -1) return cumulativeSoFar; // Fallback if day not found
  
  // Calculate what percentage of the week we've completed
  const previousDaysContribution = dayIndex > 0 
    ? DAILY_CONTRIBUTION[['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayIndex - 1]]
    : 0;
    
  // Today's expected contribution
  const todayFullContribution = DAILY_CONTRIBUTION[currentDay] - previousDaysContribution;
  
  // How much of today is complete based on hour
  const todayProgress = getCumulativeHourlyProgress(currentHour);
  
  // Total week progress so far
  const weekProgressSoFar = previousDaysContribution + (todayFullContribution * todayProgress);
  
  // Avoid division by zero
  if (weekProgressSoFar <= 0) return cumulativeSoFar;

  // Project the total and never let it drop below current cumulative
  const projected = Math.round(cumulativeSoFar / weekProgressSoFar);
  return Math.max(projected, cumulativeSoFar);
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