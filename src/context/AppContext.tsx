import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { seedIfEmpty } from '../db/seed'
import { todayString, liveElapsed } from '../db/utils'
import type { Sphere, Task, Item, SphereTimer } from '../db/types'

interface AppState {
  activeDate: string
}

type AppAction = { type: 'SET_DATE'; payload: string }

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_DATE': return { ...state, activeDate: action.payload }
    default: return state
  }
}

interface AppContextValue {
  state: AppState
  setActiveDate: (date: string) => void
  spheres: Sphere[]
  tasks: Task[]
  items: Item[]
  timers: SphereTimer[]
  // Derived
  sphereItemsForDate: (sphereId: string, date: string) => Item[]
  unsortedItems: Item[]
  isSatisfied: (sphere: Sphere, date: string) => boolean
  getTimer: (sphereId: string, date: string) => SphereTimer | undefined
  getElapsed: (sphereId: string, date: string) => number
  // Item mutations
  addItem: (item: Omit<Item, 'id' | 'done' | 'completedAt'>) => Promise<void>
  toggleItem: (id: string, done: boolean) => Promise<void>
  assignItem: (id: string, sphereId: string, date?: string | null) => Promise<void>
  removeItem: (id: string) => Promise<void>
  // Task mutations
  addTask: (task: Omit<Task, 'id'>) => Promise<void>
  updateSphere: (id: string, updates: Partial<Sphere>) => Promise<void>
  // Timer
  startTimer: (sphereId: string, date: string) => Promise<void>
  stopTimer: (sphereId: string, date: string) => Promise<void>
  resetTimer: (sphereId: string, date: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { activeDate: todayString() })

  useEffect(() => {
    seedIfEmpty()
    const msUntilMidnight = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      return midnight.getTime() - now.getTime()
    }
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_DATE', payload: todayString() })
    }, msUntilMidnight())
    return () => clearTimeout(timer)
  }, [])

  const spheres = useLiveQuery<Sphere[]>(() => db.spheres.filter((s) => s.active).toArray(), []) ?? []
  const tasks = useLiveQuery<Task[]>(() => db.tasks.filter((t) => !t.archived).toArray(), []) ?? []
  const items = useLiveQuery<Item[]>(() => db.items.toArray(), []) ?? []
  const timers = useLiveQuery<SphereTimer[]>(() => db.sphereTimers.toArray(), []) ?? []

  // Items for a sphere on a date: dated items for that day + undated ongoing items (not done)
  function sphereItemsForDate(sphereId: string, date: string): Item[] {
    return items.filter((item) => {
      if (item.sphereId !== sphereId) return false
      if (item.date === date) return true
      if (item.date === null && !item.done) return true
      return false
    })
  }

  // Items with no sphere assigned (not done)
  const unsortedItems = items.filter((i) => i.sphereId === null && !i.done)

  function getTimer(sphereId: string, date: string) {
    return timers.find((t) => t.sphereId === sphereId && t.date === date)
  }

  function getElapsed(sphereId: string, date: string): number {
    const t = getTimer(sphereId, date)
    return t ? liveElapsed(t.elapsedSeconds, t.runningAt) : 0
  }

  function isSatisfied(sphere: Sphere, date: string): boolean {
    const acts = sphereItemsForDate(sphere.id, date)
    const allDone = acts.length > 0 && acts.every((a) => a.done)
    const timerHit = getElapsed(sphere.id, date) >= sphere.targetMinutes * 60
    return allDone || timerHit
  }

  async function addItem(item: Omit<Item, 'id' | 'done' | 'completedAt'>) {
    await db.items.add({ ...item, id: crypto.randomUUID(), done: false, completedAt: null })
  }

  async function toggleItem(id: string, done: boolean) {
    await db.items.update(id, {
      done,
      completedAt: done ? todayString() : null,
    })
  }

  async function assignItem(id: string, sphereId: string, date?: string | null) {
    const update: Partial<Item> = { sphereId }
    if (date !== undefined) update.date = date
    await db.items.update(id, update)
  }

  async function removeItem(id: string) {
    await db.items.delete(id)
  }

  async function addTask(task: Omit<Task, 'id'>) {
    await db.tasks.add({ ...task, id: crypto.randomUUID() })
  }

  async function updateSphere(id: string, updates: Partial<Sphere>) {
    await db.spheres.update(id, updates)
  }

  async function startTimer(sphereId: string, date: string) {
    const id = `${sphereId}:${date}`
    const existing = await db.sphereTimers.get(id)
    if (existing) {
      if (existing.runningAt === null) {
        await db.sphereTimers.update(id, { runningAt: Date.now() })
      }
    } else {
      await db.sphereTimers.add({ id, sphereId, date, elapsedSeconds: 0, runningAt: Date.now() })
    }
  }

  async function stopTimer(sphereId: string, date: string) {
    const id = `${sphereId}:${date}`
    const existing = await db.sphereTimers.get(id)
    if (existing && existing.runningAt !== null) {
      const elapsed = existing.elapsedSeconds + Math.floor((Date.now() - existing.runningAt) / 1000)
      await db.sphereTimers.update(id, { elapsedSeconds: elapsed, runningAt: null })
    }
  }

  async function resetTimer(sphereId: string, date: string) {
    await db.sphereTimers.delete(`${sphereId}:${date}`)
  }

  return (
    <AppContext.Provider value={{
      state, setActiveDate: (d) => dispatch({ type: 'SET_DATE', payload: d }),
      spheres, tasks, items, timers,
      sphereItemsForDate, unsortedItems, isSatisfied,
      getTimer, getElapsed,
      addItem, toggleItem, assignItem, removeItem,
      addTask, updateSphere,
      startTimer, stopTimer, resetTimer,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
