import { format, addDays } from 'date-fns'

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function dateString(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

// Returns array of {date, label} for today + next N days
export function weekDays(n = 7): { date: string; label: string; dayLabel: string }[] {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today, i)
    return {
      date: dateString(d),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE'),
      dayLabel: format(d, 'd'),
    }
  })
}

export function liveElapsed(elapsedSeconds: number, runningAt: number | null): number {
  if (runningAt === null) return elapsedSeconds
  return elapsedSeconds + Math.floor((Date.now() - runningAt) / 1000)
}
