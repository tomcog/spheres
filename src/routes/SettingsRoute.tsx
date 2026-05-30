import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import type { Sphere, Task, Item } from '../db/types'
import styles from './SettingsRoute.module.css'

export default function SettingsRoute() {
  const { spheres, updateSphere } = useApp()
  const [exportMsg, setExportMsg] = useState('')
  const [importError, setImportError] = useState('')

  async function handleExport() {
    const [s, t, i] = await Promise.all([
      supabase.from('spheres').select('*'),
      supabase.from('sphere_tasks').select('*'),
      supabase.from('items').select('*'),
    ])
    const data = JSON.stringify({ spheres: s.data, tasks: t.data, items: i.data }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spheres-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExportMsg('Exported!')
    setTimeout(() => setExportMsg(''), 2000)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError('')
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as { spheres: Sphere[]; tasks: Task[]; items: Item[] }
      if (!data.spheres || !data.tasks) throw new Error('Invalid format')
      // Delete in dependency order, then re-insert
      await supabase.from('items').delete().neq('id', '')
      await supabase.from('sphere_timers').delete().neq('id', '')
      await supabase.from('sphere_tasks').delete().neq('id', '')
      await supabase.from('spheres').delete().neq('id', '')
      await supabase.from('spheres').insert(data.spheres)
      await supabase.from('sphere_tasks').insert(data.tasks)
      if (data.items?.length) await supabase.from('items').insert(data.items)
      setExportMsg('Imported!')
      setTimeout(() => setExportMsg(''), 2000)
    } catch {
      setImportError("Failed to import. Make sure it's a valid Spheres backup file.")
    }
    e.target.value = ''
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Spheres</h2>
        {spheres.map((sphere) => (
          <SphereRow key={sphere.id} sphere={sphere} onUpdate={updateSphere} />
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data</h2>
        <div className={styles.dataActions}>
          <button className={styles.actionBtn} onClick={handleExport}>
            Export all data
          </button>
          <label className={styles.actionBtn}>
            Import backup
            <input type="file" accept=".json" onChange={handleImport} className={styles.fileInput} />
          </label>
        </div>
        {exportMsg && <p className={styles.successMsg}>{exportMsg}</p>}
        {importError && <p className={styles.errorMsg}>{importError}</p>}
      </section>
    </div>
  )
}

function SphereRow({
  sphere,
  onUpdate,
}: {
  sphere: Sphere
  onUpdate: (id: string, updates: Partial<Sphere>) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(sphere.name)
  const [target, setTarget] = useState(String(sphere.targetMinutes))
  const [color, setColor] = useState(sphere.color)

  async function handleSave() {
    await onUpdate(sphere.id, {
      name: name.trim() || sphere.name,
      targetMinutes: parseInt(target, 10) || sphere.targetMinutes,
      color,
    })
    setEditing(false)
  }

  return (
    <div className={styles.sphereRow} style={{ '--sphere-color': sphere.color } as React.CSSProperties}>
      {!editing ? (
        <>
          <div className={styles.dot} />
          <div className={styles.sphereInfo}>
            <span className={styles.sphereName}>{sphere.name}</span>
            <span className={styles.sphereMeta}>{sphere.targetMinutes} min / day</span>
          </div>
          <button className={styles.editBtn} onClick={() => setEditing(true)}>Edit</button>
        </>
      ) : (
        <div className={styles.editForm}>
          <input
            className={styles.editInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
          <div className={styles.editRow}>
            <input
              className={styles.editInputSmall}
              type="number"
              min="5"
              max="480"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <span className={styles.editLabel}>min / day</span>
            <input
              className={styles.colorInput}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Sphere color"
            />
            <button className={styles.saveBtn} onClick={handleSave}>Save</button>
            <button className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
