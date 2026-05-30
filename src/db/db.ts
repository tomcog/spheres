import Dexie, { type Table } from 'dexie'
import type { Sphere, Task, Item, SphereTimer } from './types'

export class SpheresDB extends Dexie {
  spheres!: Table<Sphere>
  tasks!: Table<Task>
  items!: Table<Item>
  sphereTimers!: Table<SphereTimer>

  constructor() {
    super('SpheresDB')
    this.version(4).stores({
      spheres: 'id, active',
      tasks: 'id, sphereId, source, archived',
      items: 'id, sphereId, date, done',
      sphereTimers: 'id, sphereId, date',
    })
  }
}

export const db = new SpheresDB()
