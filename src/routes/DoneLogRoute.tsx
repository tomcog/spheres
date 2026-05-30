import { useApp } from '../context/AppContext'
import { format, parseISO } from 'date-fns'
import styles from './DoneLogRoute.module.css'

export default function DoneLogRoute() {
  const { items, spheres } = useApp()

  const done = items.filter((i) => i.done)
  const sorted = [...done].sort((a, b) => {
    const da = a.completedAt ?? a.date ?? ''
    const db2 = b.completedAt ?? b.date ?? ''
    return db2.localeCompare(da) || b.id.localeCompare(a.id)
  })

  function sphereName(id: string | null) {
    if (!id) return 'Unsorted'
    return spheres.find((s) => s.id === id)?.name ?? id
  }

  function sphereColor(id: string | null) {
    if (!id) return 'var(--text-dim)'
    return spheres.find((s) => s.id === id)?.color ?? '#888'
  }

  function formatDate(iso: string | null) {
    if (!iso) return 'Completed'
    try { return format(parseISO(iso), 'EEE, MMM d') }
    catch { return iso }
  }

  let lastDate = ''

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Done</h1>
      </header>

      {sorted.length === 0 && (
        <p className={styles.empty}>Nothing done yet. Go do a thing.</p>
      )}

      <ul className={styles.list}>
        {sorted.map((item) => {
          const dateKey = item.completedAt ?? item.date ?? ''
          const isNewDate = dateKey !== lastDate
          lastDate = dateKey
          return (
            <li key={item.id}>
              {isNewDate && (
                <div className={styles.dateDivider}>{formatDate(dateKey)}</div>
              )}
              <div
                className={styles.entry}
                style={{ '--sphere-color': sphereColor(item.sphereId) } as React.CSSProperties}
              >
                <div className={styles.dot} />
                <div className={styles.info}>
                  <span className={styles.sphere}>{sphereName(item.sphereId)}</span>
                  <span className={styles.itemTitle}>{item.title}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
