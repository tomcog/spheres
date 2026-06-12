import { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
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
  updateItem: (id: string, updates: Partial<Item>) => Promise<void>
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
  const [spheres, setSpheres] = useState<Sphere[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [timers, setTimers] = useState<SphereTimer[]>([])

  useEffect(() => {
    async function init() {
      await seedIfEmpty()
      await loadAll()
    }

    async function loadAll() {
      const [s, t, i, tm] = await Promise.all([
        supabase.from('spheres').select('*').eq('active', true),
        supabase.from('sphere_tasks').select('*').eq('archived', false),
        supabase.from('items').select('*').order('id'),
        supabase.from('sphere_timers').select('*'),
      ])
      if (s.data) setSpheres(s.data as Sphere[])
      if (t.data) setTasks(t.data as Task[])
      if (i.data) setItems(i.data as Item[])
      if (tm.data) setTimers(tm.data as SphereTimer[])
    }

    init()

    const msUntilMidnight = () => {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      return midnight.getTime() - now.getTime()
    }
    const midnightTimer = setTimeout(() => {
      dispatch({ type: 'SET_DATE', payload: todayString() })
    }, msUntilMidnight())

    // Realtime: refetch each table on any change (cross-device sync)
    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spheres' }, async () => {
        const { data } = await supabase.from('spheres').select('*').eq('active', true)
        if (data) setSpheres(data as Sphere[])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sphere_tasks' }, async () => {
        const { data } = await supabase.from('sphere_tasks').select('*').eq('archived', false)
        if (data) setTasks(data as Task[])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, async () => {
        const { data } = await supabase.from('items').select('*').order('id')
        if (data) setItems(data as Item[])
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sphere_timers' }, async () => {
        const { data } = await supabase.from('sphere_timers').select('*')
        if (data) setTimers(data as SphereTimer[])
      })
      .subscribe()

    return () => {
      clearTimeout(midnightTimer)
      supabase.removeChannel(channel)
    }
  }, [])

  function sphereItemsForDate(sphereId: string, date: string): Item[] {
    const today = todayString()
    return items.filter((item) => {
      if (item.sphereId !== sphereId) return false
      // Completed items appear on the day they were checked off.
      if (item.done) return item.completedAt === date
      // Recurring items (no date) show every day until done, but never project
      // into the future — future days stay clear until they become today.
      if (item.date === null) return date <= today
      // Dated items show on their assigned day and carry forward each following
      // day until completed — but only up to today. They do not pre-populate
      // future days; a task only reappears once that day actually becomes today.
      const carryUntil = item.date > today ? item.date : today
      return item.date <= date && date <= carryUntil
    })
  }

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

  async function reloadItems() {
    const { data } = await supabase.from('items').select('*').order('id')
    if (data) setItems(data as Item[])
  }

  async function reloadTasks() {
    const { data } = await supabase.from('sphere_tasks').select('*').eq('archived', false)
    if (data) setTasks(data as Task[])
  }

  async function reloadSpheres() {
    const { data } = await supabase.from('spheres').select('*').eq('active', true)
    if (data) setSpheres(data as Sphere[])
  }

  async function reloadTimers() {
    const { data } = await supabase.from('sphere_timers').select('*')
    if (data) setTimers(data as SphereTimer[])
  }

  async function addItem(item: Omit<Item, 'id' | 'done' | 'completedAt'>) {
    await supabase.from('items').insert({ ...item, id: crypto.randomUUID(), done: false, completedAt: null })
    await reloadItems()
  }

  async function toggleItem(id: string, done: boolean) {
    await supabase.from('items').update({ done, completedAt: done ? todayString() : null }).eq('id', id)
    await reloadItems()
  }

  async function assignItem(id: string, sphereId: string, date?: string | null) {
    const update: Partial<Item> = { sphereId }
    if (date !== undefined) update.date = date
    await supabase.from('items').update(update).eq('id', id)
    await reloadItems()
  }

  async function updateItem(id: string, updates: Partial<Item>) {
    await supabase.from('items').update(updates).eq('id', id)
    await reloadItems()
  }

  async function removeItem(id: string) {
    await supabase.from('items').delete().eq('id', id)
    await reloadItems()
  }

  async function addTask(task: Omit<Task, 'id'>) {
    await supabase.from('sphere_tasks').insert({ ...task, id: crypto.randomUUID() })
    await reloadTasks()
  }

  async function updateSphere(id: string, updates: Partial<Sphere>) {
    await supabase.from('spheres').update(updates).eq('id', id)
    await reloadSpheres()
  }

  async function startTimer(sphereId: string, date: string) {
    const id = `${sphereId}:${date}`
    const existing = timers.find((t) => t.id === id)
    if (existing) {
      if (existing.runningAt === null) {
        await supabase.from('sphere_timers').update({ runningAt: Date.now() }).eq('id', id)
      }
    } else {
      await supabase.from('sphere_timers').insert({ id, sphereId, date, elapsedSeconds: 0, runningAt: Date.now() })
    }
    await reloadTimers()
  }

  async function stopTimer(sphereId: string, date: string) {
    const id = `${sphereId}:${date}`
    const existing = timers.find((t) => t.id === id)
    if (existing && existing.runningAt !== null) {
      const elapsed = existing.elapsedSeconds + Math.floor((Date.now() - existing.runningAt) / 1000)
      await supabase.from('sphere_timers').update({ elapsedSeconds: elapsed, runningAt: null }).eq('id', id)
      await reloadTimers()
    }
  }

  async function resetTimer(sphereId: string, date: string) {
    await supabase.from('sphere_timers').delete().eq('id', `${sphereId}:${date}`)
    await reloadTimers()
  }

  return (
    <AppContext.Provider value={{
      state, setActiveDate: (d) => dispatch({ type: 'SET_DATE', payload: d }),
      spheres, tasks, items, timers,
      sphereItemsForDate, unsortedItems, isSatisfied,
      getTimer, getElapsed,
      addItem, toggleItem, assignItem, updateItem, removeItem,
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
