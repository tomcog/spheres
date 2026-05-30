export interface Sphere {
  id: string
  name: string
  color: string
  targetMinutes: number
  rhythm: 'daily' | 'weekly'
  active: boolean
}

export interface Task {
  id: string
  sphereId: string
  title: string
  defaultDuration: number
  source: 'user' | 'recurring' | 'suggested'
  recurrence: null | 'daily' | { daysOfWeek: number[] }
  archived: boolean
}

// Flexible to-do item. Three modes:
//   sphereId + date  → appears in that sphere on that day only
//   sphereId + null  → appears in that sphere every day until done
//   null     + null  → unsorted; floats at bottom of Today until assigned
export interface Item {
  id: string
  title: string
  sphereId: string | null
  date: string | null       // YYYY-MM-DD or null
  done: boolean
  completedAt: string | null  // YYYY-MM-DD when checked off
}

// Per-sphere per-day timer
export interface SphereTimer {
  id: string               // `${sphereId}:${date}`
  sphereId: string
  date: string
  elapsedSeconds: number
  runningAt: number | null // epoch ms when last started, null = paused
}
