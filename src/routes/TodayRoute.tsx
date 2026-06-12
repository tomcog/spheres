import { useState, useRef, useEffect } from 'react'
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
  const { spheres, state, setActiveDate, unsortedItems, assignItem, tasks, addItem, addTask, sphereItemsForDate } = useApp()
  const [activeItem, setActiveItem] = useState<Item | null>(null)
  const [addSheet, setAddSheet] = useState<Sphere | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  // The oldest pending (incomplete, dated) task in a sphere — its "age".
  // Recurring items (date === null) and completed items don't count.
  function oldestPendingDate(sphereId: string): string | null {
    const dates = sphereItemsForDate(sphereId, state.activeDate)
      .filter((i) => !i.done && i.date !== null)
      .map((i) => i.date as string)
    return dates.length ? dates.reduce((a, b) => (a < b ? a : b)) : null
  }

  // Cards sort oldest-task-first; spheres with no dated task fall to the
  // bottom; ties (including all-equal ages) break alphabetically by name.
  const sortedSpheres = [...spheres].sort((a, b) => {
    const da = oldestPendingDate(a.id)
    const db = oldestPendingDate(b.id)
    if (da !== db) {
      if (da === null) return 1
      if (db === null) return -1
      return da < db ? -1 : 1
    }
    return a.name.localeCompare(b.name)
  })

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
          {sortedSpheres.map((sphere) => (
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
          suggestions={tasks.filter((t) => t.sphereId === addSheet.id)}
          onAdd={(title, saveAsSuggestion) => {
            addItem({ title, sphereId: addSheet.id, date: state.activeDate })
            const exists = tasks.some(
              (t) => t.sphereId === addSheet.id && t.title.toLowerCase() === title.toLowerCase(),
            )
            if (saveAsSuggestion && !exists) {
              addTask({
                sphereId: addSheet.id,
                title,
                defaultDuration: 30,
                source: 'suggested',
                recurrence: null,
                archived: false,
              })
            }
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
  const { sphereItemsForDate, isSatisfied, toggleItem, removeItem, updateItem, getTimer, getElapsed, startTimer, stopTimer } = useApp()
  const { setNodeRef, isOver } = useDroppable({ id: sphere.id })
  const [, tick] = useState(0)

  const timer = getTimer(sphere.id, date)
  const running = timer?.runningAt != null
  if (running) setTimeout(() => tick((n) => n + 1), 1000)

  // Optimistic check-off: flip the checkbox immediately but hold the backend
  // write (and therefore any resort) for 2s so a mis-tap can be undone.
  const [pendingDone, setPendingDone] = useState<Record<string, boolean>>({})
  const commitTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const timers = commitTimers.current
    return () => { for (const t of Object.values(timers)) clearTimeout(t) }
  }, [])

  function effectiveDone(item: Item) {
    return item.id in pendingDone ? pendingDone[item.id] : item.done
  }

  function handleToggleItem(item: Item) {
    const id = item.id
    // A second tap within the window cancels the pending commit (undo).
    if (commitTimers.current[id]) {
      clearTimeout(commitTimers.current[id])
      delete commitTimers.current[id]
      setPendingDone((p) => { const { [id]: _, ...rest } = p; return rest })
      return
    }
    const next = !item.done
    setPendingDone((p) => ({ ...p, [id]: next }))
    commitTimers.current[id] = setTimeout(async () => {
      delete commitTimers.current[id]
      await toggleItem(id, next)
      // Clear the override only after the real value has landed, avoiding flicker.
      setPendingDone((p) => { const { [id]: _, ...rest } = p; return rest })
    }, 2000)
  }

  const acts = sphereItemsForDate(sphere.id, date)
  const doneCount = acts.filter((a) => effectiveDone(a)).length
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
        <div className={styles.blockHeaderLeft}>
          <button
            className={styles.addDot}
            onClick={() => onOpenAdd(sphere)}
            aria-label={`Add task to ${sphere.name}`}
          >
            <span className={styles.addDotIcon}>+</span>
          </button>
          <button
            className={styles.blockTitle}
            onClick={() => navigate(`/sphere/${sphere.id}?date=${date}`)}
            aria-label={`${sphere.name} settings`}
          >
            <span className={styles.titleText}>{sphere.name}</span>
            {satisfied && <span className={styles.satisfiedCheck}>✓</span>}
          </button>
        </div>

        <button
          className={`${styles.timerBtn} ${running ? styles.timerRunning : ''}`}
          onClick={handleToggleTimer}
          aria-label={running ? 'Pause timer' : 'Start timer'}
        >
          {running ? (
            <><span className={styles.timerIcon}>⏸</span><span className={styles.timerElapsed}>{formatElapsed(elapsed)}</span></>
          ) : elapsed > 0 ? (
            <><span className={styles.timerIcon}>▶</span><span className={styles.timerElapsed}>{formatElapsed(elapsed)}</span></>
          ) : (
            <span className={styles.timerIcon}>▶</span>
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
          {acts.map((item) => {
            const done = effectiveDone(item)
            return (
            <li key={item.id} className={styles.itemRow}>
              <button
                className={`${styles.checkbox} ${done ? styles.checked : ''}`}
                onClick={() => handleToggleItem(item)}
                aria-label={done ? `Uncheck ${item.title}` : `Check ${item.title}`}
                aria-pressed={done}
              >
                {done && <span className={styles.checkmark}>✓</span>}
              </button>
              <EditableItemTitle
                item={item}
                done={done}
                onSave={(title) => updateItem(item.id, { title })}
              />
              <button className={styles.removeBtn} onClick={() => removeItem(item.id)} aria-label={`Remove ${item.title}`}>×</button>
            </li>
            )
          })}
        </ul>
      ) : (
        <p className={styles.emptyHint}>Nothing planned yet</p>
      )}
    </div>
  )
}

// ─── Editable item title ──────────────────────────────────────────────────

function EditableItemTitle({ item, done, onSave }: { item: Item; done: boolean; onSave: (title: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.title)

  function commit() {
    const t = draft.trim()
    if (t && t !== item.title) onSave(t)
    else setDraft(item.title)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        className={styles.itemEditInput}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(item.title); setEditing(false) }
        }}
      />
    )
  }

  return (
    <span
      className={`${styles.itemTitle} ${done ? styles.itemDone : ''}`}
      onClick={() => { setDraft(item.title); setEditing(true) }}
      title="Tap to edit"
    >
      {item.title}
      {item.date === null && !done && (
        <span className={styles.recurringDot} title="Repeats daily until done" />
      )}
    </span>
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
