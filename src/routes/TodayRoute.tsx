import { useState } from 'react'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import DateStrip from '../components/DateStrip'
import AddItemSheet from '../components/AddItemSheet'
import type { Sphere, Item } from '../db/types'
import styles from './TodayRoute.module.css'

export default function TodayRoute() {
  const { spheres, state, setActiveDate, unsortedItems, assignItem, tasks, addItem } = useApp()
  const [activeItem, setActiveItem] = useState<Item | null>(null)
  const [addSheet, setAddSheet] = useState<Sphere | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function handleDragStart(event: DragStartEvent) {
    const item = unsortedItems.find((i) => i.id === String(event.active.id))
    if (item) setActiveItem(item)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null)
    const { active, over } = event
    if (over) {
      assignItem(String(active.id), String(over.id))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={styles.page}>
        <header className={styles.header}>
          <h1 className={styles.title}>Today</h1>
        </header>

        <DateStrip activeDate={state.activeDate} onChange={setActiveDate} />

        <div className={styles.sphereList}>
          {spheres.map((sphere) => (
            <SphereBlock
              key={sphere.id}
              sphere={sphere}
              date={state.activeDate}
              onOpenAdd={setAddSheet}
            />
          ))}
        </div>

        {unsortedItems.length > 0 && (
          <UnsortedSection items={unsortedItems} spheres={spheres} />
        )}

        <QuickAddBar activeDate={state.activeDate} spheres={spheres} />
      </div>

      <DragOverlay>
        {activeItem && (
          <div className={styles.dragGhost}>{activeItem.title}</div>
        )}
      </DragOverlay>

      {addSheet && (
        <AddItemSheet
          sphere={addSheet}
          date={state.activeDate}
          suggestions={tasks.filter((t) => t.sphereId === addSheet.id)}
          onAdd={(title, date) => {
            addItem({ title, sphereId: addSheet.id, date })
          }}
          onClose={() => setAddSheet(null)}
        />
      )}
    </DndContext>
  )
}

// ─── Sphere block ──────────────────────────────────────────────────────────

function SphereBlock({
  sphere,
  date,
  onOpenAdd,
}: {
  sphere: Sphere
  date: string
  onOpenAdd: (sphere: Sphere) => void
}) {
  const navigate = useNavigate()
  const { sphereItemsForDate, isSatisfied, toggleItem, removeItem, getTimer, getElapsed, startTimer, stopTimer } = useApp()
  const { setNodeRef, isOver } = useDroppable({ id: sphere.id })
  const [, tick] = useState(0)

  const timer = getTimer(sphere.id, date)
  const running = timer?.runningAt != null
  if (running) setTimeout(() => tick((n) => n + 1), 1000)

  const acts = sphereItemsForDate(sphere.id, date)
  const doneCount = acts.filter((a) => a.done).length
  const pct = acts.length > 0 ? Math.min(100, (doneCount / acts.length) * 100) : 0
  const satisfied = isSatisfied(sphere, date)
  const elapsed = getElapsed(sphere.id, date)

  async function handleToggleTimer() {
    if (running) await stopTimer(sphere.id, date)
    else await startTimer(sphere.id, date)
  }

  return (
    <div
      ref={setNodeRef}
      className={`${styles.sphereBlock} ${isOver ? styles.dropOver : ''}`}
      style={{ '--sphere-color': sphere.color } as React.CSSProperties}
    >
      <div className={styles.blockHeader}>
        <button
          className={styles.blockTitle}
          onClick={() => navigate(`/sphere/${sphere.id}?date=${date}`)}
          aria-label={`${sphere.name} settings`}
        >
          <span className={styles.colorDot} />
          <span className={styles.titleText}>{sphere.name}</span>
          {satisfied && <span className={styles.satisfiedCheck}>✓</span>}
        </button>

        <button
          className={`${styles.timerBtn} ${running ? styles.timerRunning : ''}`}
          onClick={handleToggleTimer}
          aria-label={running ? 'Stop timer' : 'Start timer'}
        >
          {running ? (
            <><span className={styles.timerIcon}>⏹</span><span className={styles.timerElapsed}>{formatElapsed(elapsed)}</span></>
          ) : elapsed > 0 ? (
            <><span className={styles.timerIcon}>▶</span><span className={styles.timerElapsed}>{formatElapsed(elapsed)}</span></>
          ) : (
            <span className={styles.timerStart}>▶ Start</span>
          )}
        </button>
      </div>

      {acts.length > 0 && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      )}

      {acts.length > 0 ? (
        <ul className={styles.itemList}>
          {acts.map((item) => (
            <li key={item.id} className={styles.itemRow}>
              <button
                className={`${styles.checkbox} ${item.done ? styles.checked : ''}`}
                onClick={() => toggleItem(item.id, !item.done)}
                aria-label={item.done ? `Uncheck ${item.title}` : `Check ${item.title}`}
                aria-pressed={item.done}
              >
                {item.done && <span className={styles.checkmark}>✓</span>}
              </button>
              <span className={`${styles.itemTitle} ${item.done ? styles.itemDone : ''}`}>
                {item.title}
                {item.date === null && !item.done && (
                  <span className={styles.recurringDot} title="Repeats daily until done" />
                )}
              </span>
              <button className={styles.removeBtn} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.title}`}>×</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyHint}>Nothing planned yet</p>
      )}

      <div className={styles.addArea}>
        <button className={styles.addTrigger} onClick={() => onOpenAdd(sphere)}>+ Add</button>
      </div>
    </div>
  )
}

// ─── Unsorted section ─────────────────────────────────────────────────────

function UnsortedSection({ items, spheres }: { items: Item[]; spheres: Sphere[] }) {
  const { assignItem, removeItem } = useApp()
  const [assigningId, setAssigningId] = useState<string | null>(null)

  return (
    <div className={styles.unsortedSection}>
      <h2 className={styles.unsortedTitle}>Unsorted</h2>
      <ul className={styles.unsortedList}>
        {items.map((item) => (
          <DraggableUnsortedItem
            key={item.id}
            item={item}
            spheres={spheres}
            assigning={assigningId === item.id}
            onToggleAssign={() => setAssigningId(assigningId === item.id ? null : item.id)}
            onAssign={(sphereId) => { assignItem(item.id, sphereId); setAssigningId(null) }}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </ul>
    </div>
  )
}

function DraggableUnsortedItem({
  item, spheres, assigning, onToggleAssign, onAssign, onRemove,
}: {
  item: Item
  spheres: Sphere[]
  assigning: boolean
  onToggleAssign: () => void
  onAssign: (sphereId: string) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }

  return (
    <li ref={setNodeRef} style={style} className={styles.unsortedItem}>
      <span className={styles.dragHandle} {...listeners} {...attributes} aria-label="Drag to assign">⠿</span>
      <span className={styles.unsortedItemTitle}>{item.title}</span>
      <button className={styles.assignBtn} onClick={onToggleAssign} aria-label="Assign to sphere">→</button>
      <button className={styles.removeBtn} onClick={onRemove} aria-label={`Remove ${item.title}`}>×</button>
      {assigning && (
        <div className={styles.spherePicker}>
          {spheres.map((s) => (
            <button
              key={s.id}
              className={styles.spherePickerBtn}
              style={{ '--sphere-color': s.color } as React.CSSProperties}
              onClick={() => onAssign(s.id)}
            >
              <span className={styles.spherePickerDot} />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}

// ─── Quick add bar ─────────────────────────────────────────────────────────

function QuickAddBar({ activeDate, spheres }: { activeDate: string; spheres: Sphere[] }) {
  const { addItem } = useApp()
  const [title, setTitle] = useState('')
  const [sphereId, setSphereId] = useState<string>('')
  const [useDate, setUseDate] = useState(false)
  const [expanded, setExpanded] = useState(false)

  async function handleAdd() {
    const t = title.trim()
    if (!t) return
    await addItem({
      title: t,
      sphereId: sphereId || null,
      date: sphereId && useDate ? activeDate : null,
    })
    setTitle('')
    setSphereId('')
    setUseDate(false)
    setExpanded(false)
  }

  return (
    <div className={styles.quickAdd}>
      <div className={styles.quickAddRow}>
        <input
          className={styles.quickAddInput}
          type="text"
          placeholder="Quick add a task…"
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (e.target.value) setExpanded(true) }}
          onFocus={() => setExpanded(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className={styles.quickAddBtn} onClick={handleAdd} disabled={!title.trim()}>
          Add
        </button>
      </div>

      {expanded && (
        <div className={styles.quickAddOptions}>
          <select
            className={styles.quickAddSelect}
            value={sphereId}
            onChange={(e) => setSphereId(e.target.value)}
          >
            <option value="">No sphere (unsorted)</option>
            {spheres.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {sphereId && (
            <label className={styles.quickAddDateToggle}>
              <input
                type="checkbox"
                checked={useDate}
                onChange={(e) => setUseDate(e.target.checked)}
              />
              Today only (not recurring)
            </label>
          )}
        </div>
      )}
    </div>
  )
}

function formatElapsed(s: number) {
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
