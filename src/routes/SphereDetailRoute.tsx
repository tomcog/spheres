import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { todayString, liveElapsed } from '../db/utils'
import SphereTimer from '../components/SphereTimer'
import styles from './SphereDetailRoute.module.css'

export default function SphereDetailRoute() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    spheres, items, isSatisfied, toggleItem, removeItem,
    getTimer, stopTimer, resetTimer,
    unsortedItems, assignItem,
  } = useApp()

  const sphere = spheres.find((s) => s.id === id)
  const date = searchParams.get('date') ?? todayString()

  if (!sphere) {
    return (
      <div className={styles.notFound}>
        <button onClick={() => navigate('/')}>← Back</button>
        <p>Sphere not found.</p>
      </div>
    )
  }

  const allItems = items.filter((i) => i.sphereId === sphere.id)
  const todayItems = allItems.filter((i) => (i.date === null || i.date <= date) && !i.done)
  const doneItems = allItems.filter((i) => i.done && i.completedAt === date)

  const satisfied = isSatisfied(sphere, date)
  const pct = todayItems.length > 0
    ? Math.min(100, (todayItems.filter((i) => i.done).length / todayItems.length) * 100)
    : 0

  const timer = getTimer(sphere.id, date)
  const elapsed = timer ? liveElapsed(timer.elapsedSeconds, timer.runningAt) : 0

  async function handleResetTimer() {
    await stopTimer(sphere!.id, date)
    await resetTimer(sphere!.id, date)
  }

  async function handleAssignUnsorted(itemId: string) {
    await assignItem(itemId, sphere!.id)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header} style={{ '--sphere-color': sphere.color } as React.CSSProperties}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Back">←</button>
        <div className={styles.headerInfo}>
          <div className={styles.headerTop}>
            <h1 className={styles.name}>{sphere.name}</h1>
            {satisfied && <span className={styles.satisfiedBadge}>✓ Done</span>}
          </div>
          <div className={styles.progressRow}>
            <span className={styles.progressText}>
              {todayItems.length === 0 ? 'Nothing planned' : `${todayItems.filter((i) => i.done).length} of ${todayItems.length} done`}
            </span>
            {elapsed > 0 && <span className={styles.timerLabel}>{formatElapsed(elapsed)} in</span>}
          </div>
          <div className={styles.track}>
            <div className={styles.doneFill} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Timer + reset */}
      <SphereTimer sphere={sphere} date={date} />
      {timer && (
        <div className={styles.timerReset}>
          <button className={styles.resetTimerBtn} onClick={handleResetTimer}>
            Reset timer
          </button>
        </div>
      )}

      {/* Completed items */}
      {doneItems.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Completed</h2>
          {doneItems.map((item) => (
            <div key={item.id} className={styles.doneItem}>
              <span className={styles.doneTitle}>{item.title}</span>
              <button className={styles.undoBtn} onClick={() => toggleItem(item.id, false)}>Undo</button>
              <button className={styles.removeBtn} onClick={() => removeItem(item.id)}>×</button>
            </div>
          ))}
        </section>
      )}

      {/* Unassigned tasks */}
      {unsortedItems.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Unassigned tasks</h2>
          {unsortedItems.map((item) => (
            <div key={item.id} className={styles.unsortedRow}>
              <span className={styles.unsortedTitle}>{item.title}</span>
              <button
                className={styles.assignHereBtn}
                onClick={() => handleAssignUnsorted(item.id)}
                style={{ '--sphere-color': sphere.color } as React.CSSProperties}
              >
                Add to {sphere.name.split(' ')[0]} →
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
