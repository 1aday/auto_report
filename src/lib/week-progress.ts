/**
 * Calculate the progress of the current week
 * Weeks start on Monday and end on Sunday
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
  
  // Calculate week end (Sunday)
  const weekEnd = new Date(start)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)
  
  // Check if we're in the current week
  if (now < start || now > weekEnd) {
    return 0 // Not current week
  }
  
  // Calculate days elapsed (minimum 1 day for better UX)
  const msElapsed = now.getTime() - start.getTime()
  const daysElapsed = Math.max(1, Math.ceil(msElapsed / (24 * 60 * 60 * 1000)))
  
  // Return percentage (0-100)
  return Math.min(100, (daysElapsed / 7) * 100)
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
 * Get a descriptive label for the week progress
 */
export function getWeekProgressLabel(progress: number): string {
  if (progress === 0) return "Week not started"
  if (progress < 15) return "Monday"
  if (progress < 30) return "Tuesday"  
  if (progress < 45) return "Wednesday"
  if (progress < 60) return "Thursday"
  if (progress < 75) return "Friday"
  if (progress < 90) return "Saturday"
  if (progress >= 90) return "Sunday"
  return "In progress"
}