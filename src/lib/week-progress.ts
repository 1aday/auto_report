/**
 * Calculate the progress of the current week with hourly precision
 * Weeks start on Monday at 00:00 and end on Sunday at 23:59
 */
export function calculateWeekProgress(weekStartDate: string | Date): number {
  const start = new Date(weekStartDate)
  const now = new Date()
  
  // Ensure the week start is a Monday (if not already)
  // The database should already have Monday as week start, but let's be safe
  const dayOfWeek = start.getDay()
  if (dayOfWeek !== 1) {
    // Adjust to previous Monday if needed
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    start.setDate(start.getDate() - daysToMonday)
  }
  
  // Set start to beginning of Monday
  start.setHours(0, 0, 0, 0)
  
  // Calculate week end (Sunday at 23:59:59)
  const weekEnd = new Date(start)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  // Check if we're in the current week
  if (now < start || now > weekEnd) {
    return 0 // Not current week
  }
  
  // Calculate hours elapsed with precision
  const msElapsed = now.getTime() - start.getTime()
  const hoursElapsed = msElapsed / (60 * 60 * 1000)
  
  // Total hours in a week = 7 * 24 = 168 hours
  const totalHoursInWeek = 168
  
  // Return percentage (0-100) based on hours
  return Math.min(100, (hoursElapsed / totalHoursInWeek) * 100)
}

/**
 * Check if a given week is the current week
 */
export function isCurrentWeek(weekStartDate: string | Date): boolean {
  const start = new Date(weekStartDate)
  const now = new Date()
  
  // Ensure the week start is a Monday
  const dayOfWeek = start.getDay()
  if (dayOfWeek !== 1) {
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    start.setDate(start.getDate() - daysToMonday)
  }
  
  // Calculate week end (Sunday)
  const weekEnd = new Date(start)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  return now >= start && now <= weekEnd
}

/**
 * Get a descriptive label for the week progress with time of day
 */
export function getWeekProgressLabel(progress: number): string {
  if (progress === 0) return "Week not started"
  
  const now = new Date()
  const hour = now.getHours()
  
  // Determine time of day
  let timeOfDay = ""
  if (hour < 6) timeOfDay = " early morning"
  else if (hour < 12) timeOfDay = " morning"
  else if (hour < 17) timeOfDay = " afternoon"
  else if (hour < 21) timeOfDay = " evening"
  else timeOfDay = " night"
  
  // Determine day based on progress (each day is ~14.3% of week)
  if (progress < 14.3) return "Monday" + timeOfDay
  if (progress < 28.6) return "Tuesday" + timeOfDay
  if (progress < 42.9) return "Wednesday" + timeOfDay
  if (progress < 57.1) return "Thursday" + timeOfDay
  if (progress < 71.4) return "Friday" + timeOfDay
  if (progress < 85.7) return "Saturday" + timeOfDay
  if (progress >= 85.7) return "Sunday" + timeOfDay
  return "In progress"
}