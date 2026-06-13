import { useState, useEffect, useRef } from 'react'
import type { Sphere, Task } from '../db/types'
import styles from './AddItemSheet.module.css'

interface Props {
  sphere: Sphere
  suggestions: Task[]
  onAdd: (title: string, saveAsSuggestion: boolean) => void
  onClose: () => void
}

export default function AddItemSheet({ sphere, suggestions, onAdd, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [saveAsSuggestion, setSaveAsSuggestion] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleAdd() {
    const t = title.trim()
    if (!t) return
    onAdd(t, saveAsSuggestion)
    onClose()
  }

  function handleSuggestion(t: string) {
    onAdd(t, false)
    onClose()
  }

  return (
    <div
      className={styles.takeover}
      style={{ '--sphere-color': sphere.color } as React.CSSProperties}
    >
      <div className={styles.sheetHeader}>
        <span className={styles.sheetTitle}>Add to {sphere.name}</span>
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

      <label className={styles.saveToggle}>
        <input
          type="checkbox"
          checked={saveAsSuggestion}
          onChange={(e) => setSaveAsSuggestion(e.target.checked)}
        />
        <span>Save to {sphere.name} suggestions</span>
      </label>

      {suggestions.length > 0 && (
        <>
          <h2 className={styles.suggestionsLabel}>Suggestions</h2>
          <ul className={styles.suggestions}>
            {suggestions.map((t) => (
              <li key={t.id}>
                <button className={styles.suggestionRow} onClick={() => handleSuggestion(t.title)}>
                  <span className={styles.plus}>+</span>
                  <span>{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
