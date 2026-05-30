import { useRef, useEffect } from 'react'
import { weekDays } from '../db/utils'
import styles from './DateStrip.module.css'

interface Props {
  activeDate: string
  onChange: (date: string) => void
}

export default function DateStrip({ activeDate, onChange }: Props) {
  const days = weekDays(8)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth' })
  }, [activeDate])

  return (
    <div className={styles.strip}>
      {days.map((d) => (
        <button
          key={d.date}
          ref={d.date === activeDate ? activeRef : null}
          className={`${styles.day} ${d.date === activeDate ? styles.active : ''}`}
          onClick={() => onChange(d.date)}
        >
          <span className={styles.dayName}>{d.label}</span>
          <span className={styles.dayNum}>{d.dayLabel}</span>
        </button>
      ))}
    </div>
  )
}
