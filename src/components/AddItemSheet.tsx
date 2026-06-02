import { useState, useEffect, useRef } from 'react'
import type { Sphere, Task } from '../db/types'
import styles from './AddItemSheet.module.css'

interface Props {
  sphere: Sphere
  date: string
  suggestions: Task[]
  onAdd: (title: string, date: string | null) => void
  onClose: () => void
}

export default function AddItemSheet({ sphere, date, suggestions, onAdd, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [todayOnly, setTodayOnly] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function resolvedDate() {
    return todayOnly ? date : null
  }

  function handleAdd() {
    const t = title.trim()
    if (!t) return
    onAdd(t, resolvedDate())
    onClose()
  }

  function handleSuggestion(t: string) {
    onAdd(t, resolvedDate())
    onClose()
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.sheet}
        style={{ '--sphere-color': sphere.color } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.sheetHeader}>
          <span className={styles.sheetTitle}>{sphere.name}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="What will you do?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button className={styles.addBtn} onClick={handleAdd} disabled={!title.trim()}>
            Add
          </button>
        </div>

        <label className={styles.todayToggle}>
          <input
            type="checkbox"
            checked={todayOnly}
            onChange={(e) => setTodayOnly(e.target.checked)}
          />
          <span>Today only</span>
          {!todayOnly && <span className={styles.repeatHint}>— repeats daily until done</span>}
        </label>

        {suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((t) => (
              <li key={t.id}>
                <button className={styles.suggestionRow} onClick={() => handleSuggestion(t.title)}>
                  <span>{t.title}</span>
                  <span className={styles.plus}>+</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
