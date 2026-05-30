import { supabase } from '../lib/supabase'
import type { Sphere, Task } from './types'

const SPHERES: Sphere[] = [
  { id: 'physical', name: 'Physical Health', color: '#4caf6e', targetMinutes: 60, rhythm: 'daily', active: true },
  { id: 'mental', name: 'Mental Health', color: '#5b9bd5', targetMinutes: 60, rhythm: 'daily', active: true },
  { id: 'professional', name: 'Professional Development', color: '#e8a838', targetMinutes: 60, rhythm: 'daily', active: true },
  { id: 'organization', name: 'Organization', color: '#78909c', targetMinutes: 60, rhythm: 'daily', active: true },
  { id: 'creative', name: 'Creative Expression', color: '#9c6dd4', targetMinutes: 60, rhythm: 'daily', active: true },
]

const SEED_TASKS: Task[] = [
  // Physical Health
  { id: 't-ph-1', sphereId: 'physical', title: 'Morning walk', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-ph-2', sphereId: 'physical', title: 'Workout / gym', defaultDuration: 45, source: 'suggested', recurrence: null, archived: false },
  { id: 't-ph-3', sphereId: 'physical', title: 'Stretch or PT exercises', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-ph-4', sphereId: 'physical', title: 'Meal prep', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-ph-5', sphereId: 'physical', title: 'Sleep wind-down routine', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  // Mental Health
  { id: 't-mh-1', sphereId: 'mental', title: 'Meditation', defaultDuration: 15, source: 'suggested', recurrence: null, archived: false },
  { id: 't-mh-2', sphereId: 'mental', title: 'Journaling', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-mh-3', sphereId: 'mental', title: 'Time outside (no phone)', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-mh-4', sphereId: 'mental', title: 'Read for pleasure', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-mh-5', sphereId: 'mental', title: 'Rest / nap', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  // Professional Development
  { id: 't-pd-1', sphereId: 'professional', title: 'Work on portfolio', defaultDuration: 45, source: 'suggested', recurrence: null, archived: false },
  { id: 't-pd-2', sphereId: 'professional', title: 'Apply to jobs', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-pd-3', sphereId: 'professional', title: 'Learn a skill / course', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-pd-4', sphereId: 'professional', title: 'Freelance work', defaultDuration: 60, source: 'suggested', recurrence: null, archived: false },
  { id: 't-pd-5', sphereId: 'professional', title: 'Networking / reach out', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  // Organization
  { id: 't-or-1', sphereId: 'organization', title: 'Tidy / clean the house', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-or-2', sphereId: 'organization', title: 'Admin / paperwork', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-or-3', sphereId: 'organization', title: 'Groceries / errands', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-or-4', sphereId: 'organization', title: 'Finances / bills', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-or-5', sphereId: 'organization', title: 'Inbox zero', defaultDuration: 15, source: 'suggested', recurrence: null, archived: false },
  // Creative Expression
  { id: 't-cr-1', sphereId: 'creative', title: 'Draw or sketch', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-cr-2', sphereId: 'creative', title: 'Write (fiction or poetry)', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-cr-3', sphereId: 'creative', title: 'Music practice', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-cr-4', sphereId: 'creative', title: 'Photography / editing', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-cr-5', sphereId: 'creative', title: 'Make something (no rules)', defaultDuration: 45, source: 'suggested', recurrence: null, archived: false },
]

export async function seedIfEmpty() {
  const { count } = await supabase.from('spheres').select('*', { count: 'exact', head: true })
  if (count && count > 0) return
  await supabase.from('spheres').insert(SPHERES)
  await supabase.from('tasks').insert(SEED_TASKS)
}
