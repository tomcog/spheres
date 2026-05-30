import { useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './MigrateRoute.module.css'

type Status = 'idle' | 'running' | 'done' | 'no-data' | 'error'

function openLegacyDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open('SpheresDB')
    req.onupgradeneeded = () => {
      // DB didn't previously exist — nothing to migrate
      req.transaction?.abort()
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

function readStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly')
      const req = tx.objectStore(storeName).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => resolve([])
    } catch {
      resolve([])
    }
  })
}

export default function MigrateRoute() {
  const [status, setStatus] = useState<Status>('idle')
  const [log, setLog] = useState<string[]>([])

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg])
  }

  async function runMigration() {
    setStatus('running')
    setLog([])

    const db = await openLegacyDB()
    if (!db) {
      setStatus('no-data')
      addLog('No local Spheres database found on this device.')
      return
    }

    // Read everything from Dexie's stores
    const [spheres, tasks, items, timers] = await Promise.all([
      readStore<Record<string, unknown>>(db, 'spheres'),
      readStore<Record<string, unknown>>(db, 'tasks'),
      readStore<Record<string, unknown>>(db, 'items'),
      readStore<Record<string, unknown>>(db, 'sphereTimers'),
    ])
    db.close()

    addLog(`Found: ${spheres.length} spheres, ${tasks.length} tasks, ${items.length} items, ${timers.length} timers`)

    if (spheres.length === 0 && items.length === 0) {
      setStatus('no-data')
      addLog('Database was empty — nothing to migrate.')
      return
    }

    // Upsert everything to Supabase
    const errors: string[] = []

    if (spheres.length > 0) {
      const { error } = await supabase.from('spheres').upsert(spheres as never[], { onConflict: 'id' })
      if (error) errors.push(`Spheres: ${error.message}`)
      else addLog(`✓ Migrated ${spheres.length} spheres`)
    }

    if (tasks.length > 0) {
      const { error } = await supabase.from('sphere_tasks').upsert(tasks as never[], { onConflict: 'id' })
      if (error) errors.push(`Tasks: ${error.message}`)
      else addLog(`✓ Migrated ${tasks.length} tasks`)
    }

    if (items.length > 0) {
      const { error } = await supabase.from('items').upsert(items as never[], { onConflict: 'id' })
      if (error) errors.push(`Items: ${error.message}`)
      else addLog(`✓ Migrated ${items.length} items`)
    }

    if (timers.length > 0) {
      const { error } = await supabase.from('sphere_timers').upsert(timers as never[], { onConflict: 'id' })
      if (error) errors.push(`Timers: ${error.message}`)
      else addLog(`✓ Migrated ${timers.length} timers`)
    }

    if (errors.length > 0) {
      errors.forEach((e) => addLog(`✗ ${e}`))
      setStatus('error')
    } else {
      addLog('Migration complete.')
      setStatus('done')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Restore local data</h1>
        <p className={styles.subtitle}>
          Run this once on the device where you had data before the Supabase migration.
          It reads your old IndexedDB data and uploads it to the cloud.
        </p>
      </header>

      {status === 'idle' && (
        <button className={styles.btn} onClick={runMigration}>
          Migrate data from this device
        </button>
      )}

      {status === 'running' && (
        <p className={styles.running}>Migrating…</p>
      )}

      {log.length > 0 && (
        <ul className={styles.log}>
          {log.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      )}

      {status === 'done' && (
        <a className={styles.btn} href="/">Go to Today →</a>
      )}

      {status === 'no-data' && (
        <p className={styles.note}>Nothing to migrate on this device.</p>
      )}

      {status === 'error' && (
        <p className={styles.error}>Some items failed — check the log above.</p>
      )}
    </div>
  )
}
