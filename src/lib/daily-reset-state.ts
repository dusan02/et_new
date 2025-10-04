import { prisma } from '@/lib/prisma'

export type DailyResetState = 'INIT' | 'RESET_DONE' | 'FETCH_DONE'

/**
 * Get today's date in NY timezone (as UTC date)
 */
export function getTodayDate(): Date {
  const now = new Date()
  const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  return new Date(Date.UTC(nyTime.getFullYear(), nyTime.getMonth(), nyTime.getDate()))
}

/**
 * Get current daily reset state
 */
export async function getDailyResetState(date?: Date): Promise<DailyResetState> {
  const targetDate = date || getTodayDate()
  
  const state = await prisma.dailyResetState.findUnique({
    where: { date: targetDate },
    select: { state: true }
  })
  
  return (state?.state as DailyResetState) || 'INIT'
}

/**
 * Set daily reset state
 */
export async function setDailyResetState(
  state: DailyResetState, 
  date?: Date
): Promise<void> {
  const targetDate = date || getTodayDate()
  
  await prisma.dailyResetState.upsert({
    where: { date: targetDate },
    update: { 
      state,
      updatedAt: new Date(),
      ...(state === 'RESET_DONE' && { resetAt: new Date() }),
      ...(state === 'FETCH_DONE' && { fetchAt: new Date() })
    },
    create: {
      date: targetDate,
      state,
      resetAt: state === 'RESET_DONE' ? new Date() : undefined,
      fetchAt: state === 'FETCH_DONE' ? new Date() : undefined
    }
  })
}

/**
 * Check if daily reset is completed
 */
export async function isDailyResetCompleted(date?: Date): Promise<boolean> {
  const state = await getDailyResetState(date)
  return state === 'RESET_DONE' || state === 'FETCH_DONE'
}

/**
 * Check if daily fetch is completed
 */
export async function isDailyFetchCompleted(date?: Date): Promise<boolean> {
  const state = await getDailyResetState(date)
  return state === 'FETCH_DONE'
}

/**
 * Reset daily state (for testing or manual reset)
 */
export async function resetDailyState(date?: Date): Promise<void> {
  const targetDate = date || getTodayDate()
  
  await prisma.dailyResetState.delete({
    where: { date: targetDate }
  }).catch(() => {
    // Ignore if doesn't exist
  })
}
