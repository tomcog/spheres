import { supabase } from '../lib/supabase'
import type { Sphere, Task } from './types'

const SPHERES: Sphere[] = [
  { id: 'physical', name: 'Physical', color: '#4caf6e', targetMinutes: 60, rhythm: 'daily', active: true },
  { id: 'mental', name: 'Wellbeing', color: '#5b9bd5', targetMinutes: 60, rhythm: 'daily', active: true },
  { id: 'professional', name: 'Professional', color: '#e8a838', targetMinutes: 60, rhythm: 'daily', active: true },
  { id: 'organization', name: 'Organization', color: '#78909c', targetMinutes: 60, rhythm: 'daily', active: true },
  { id: 'creative', name: 'Creative', color: '#9c6dd4', targetMinutes: 60, rhythm: 'daily', active: true },
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
  // Physical Health (more)
  { id: 't-ph-6', sphereId: 'physical', title: 'Bike ride', defaultDuration: 40, source: 'suggested', recurrence: null, archived: false },
  { id: 't-ph-7', sphereId: 'physical', title: 'Yoga', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-ph-8', sphereId: 'physical', title: 'Swim', defaultDuration: 45, source: 'suggested', recurrence: null, archived: false },
  { id: 't-ph-9', sphereId: 'physical', title: 'Hydrate', defaultDuration: 5, source: 'suggested', recurrence: null, archived: false },
  { id: 't-ph-10', sphereId: 'physical', title: 'Foam rolling / mobility', defaultDuration: 15, source: 'suggested', recurrence: null, archived: false },
  // Wellbeing (more)
  { id: 't-mh-6', sphereId: 'mental', title: 'Breathing exercise', defaultDuration: 10, source: 'suggested', recurrence: null, archived: false },
  { id: 't-mh-7', sphereId: 'mental', title: 'Gratitude list', defaultDuration: 10, source: 'suggested', recurrence: null, archived: false },
  { id: 't-mh-8', sphereId: 'mental', title: 'Call a friend', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-mh-9', sphereId: 'mental', title: 'Digital detox hour', defaultDuration: 60, source: 'suggested', recurrence: null, archived: false },
  { id: 't-mh-10', sphereId: 'mental', title: 'Therapy / reflection', defaultDuration: 50, source: 'suggested', recurrence: null, archived: false },
  // Professional Development (more)
  { id: 't-pd-6', sphereId: 'professional', title: 'Update resume', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-pd-7', sphereId: 'professional', title: 'Read industry article', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-pd-8', sphereId: 'professional', title: 'Practice interview', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-pd-9', sphereId: 'professional', title: 'Side project', defaultDuration: 60, source: 'suggested', recurrence: null, archived: false },
  { id: 't-pd-10', sphereId: 'professional', title: 'Update LinkedIn', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  // Organization (more)
  { id: 't-or-6', sphereId: 'organization', title: 'Meal plan the week', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-or-7', sphereId: 'organization', title: 'Declutter one area', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-or-8', sphereId: 'organization', title: 'Laundry', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-or-9', sphereId: 'organization', title: 'Plan tomorrow', defaultDuration: 10, source: 'suggested', recurrence: null, archived: false },
  { id: 't-or-10', sphereId: 'organization', title: 'Back up files / photos', defaultDuration: 15, source: 'suggested', recurrence: null, archived: false },
  // Creative Expression (more)
  { id: 't-cr-6', sphereId: 'creative', title: 'Play an instrument', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
  { id: 't-cr-7', sphereId: 'creative', title: 'Brainstorm ideas', defaultDuration: 20, source: 'suggested', recurrence: null, archived: false },
  { id: 't-cr-8', sphereId: 'creative', title: 'Craft / DIY project', defaultDuration: 45, source: 'suggested', recurrence: null, archived: false },
  { id: 't-cr-9', sphereId: 'creative', title: 'Cook something new', defaultDuration: 45, source: 'suggested', recurrence: null, archived: false },
  { id: 't-cr-10', sphereId: 'creative', title: 'Edit photos / collage', defaultDuration: 30, source: 'suggested', recurrence: null, archived: false },
]

export async function seedIfEmpty() {
  const { count } = await supabase.from('spheres').select('*', { count: 'exact', head: true })
  if (count && count > 0) return
  await supabase.from('spheres').insert(SPHERES)
  await supabase.from('sphere_tasks').insert(SEED_TASKS)
}
