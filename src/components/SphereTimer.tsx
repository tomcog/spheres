import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { liveElapsed } from '../db/utils'
import type { Sphere } from '../db/types'
import styles from './SphereTimer.module.css'

const BREAK_SECONDS = 5 * 60

interface Props {
  sphere: Sphere
  date: string
}

export default function SphereTimer({ sphere, date }: Props) {
  const { getTimer, startTimer, stopTimer, resetTimer } = useApp()
  const [, tick] = useState(0)
  const [breakRemaining, setBreakRemaining] = useState<number | null>(null)
  const breakRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const timer = getTimer(sphere.id, date)
  const running = timer?.runningAt != null
  const elapsed = timer ? liveElapsed(timer.elapsedSeconds, timer.runningAt) : 0
  const targetSeconds = sphere.targetMinutes * 60
  const pct = Math.min(100, (elapsed / targetSeconds) * 100)

  // Tick every second while running or on break
  useEffect(() => {
    if (!running && breakRemaining === null) return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [running, breakRemaining])

  // Break countdown
  useEffect(() => {
    if (breakRemaining === null) return
    if (breakRemaining <= 0) {
      setBreakRemaining(null)
      return
    }
    breakRef.current = setInterval(() => {
      setBreakRemaining((r) => (r !== null ? r - 1 : null))
    }, 1000)
    return () => { if (breakRef.current) clearInterval(breakRef.current) }
  }, [breakRemaining !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    startTimer(sphere.id, date)
  }

  function handlePause() {
    stopTimer(sphere.id, date)
  }

  function handleBreak() {
    stopTimer(sphere.id, date)
    setBreakRemaining(BREAK_SECONDS)
  }

  function handleBackFromBreak() {
    setBreakRemaining(null)
    startTimer(sphere.id, date)
  }

  function handleExtendBreak() {
    setBreakRemaining(BREAK_SECONDS)
  }

  function handleReset() {
    stopTimer(sphere.id, date)
    resetTimer(sphere.id, date)
    setBreakRemaining(null)
  }

  if (!timer && !running) {
    return (
      <div className={styles.idle} style={{ '--sphere-color': sphere.color } as React.CSSProperties}>
        <button className={styles.startBtn} onClick={handleStart}>
          Start timer
        </button>
        <span className={styles.idleLabel}>Track time in this sphere</span>
      </div>
    )
  }

  // Break mode
  if (breakRemaining !== null) {
    return (
      <div className={styles.timer} style={{ '--sphere-color': sphere.color } as React.CSSProperties}>
        <div className={styles.breakLabel}>Break</div>
        <div className={styles.breakClock}>{formatTime(breakRemaining)}</div>
        <div className={styles.breakControls}>
          <button className={styles.resumeBtn} onClick={handleBackFromBreak}>
            I'm back →
          </button>
          <button className={styles.extendBtn} onClick={handleExtendBreak}>
            +5 min
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.timer} style={{ '--sphere-color': sphere.color } as React.CSSProperties}>
      <div className={styles.clockRow}>
        <span className={styles.clock}>{formatTime(elapsed)}</span>
        <span className={styles.target}>/ {formatTime(targetSeconds)}</span>
      </div>

      <div className={styles.timerTrack}>
        <div className={styles.timerFill} style={{ width: `${pct}%` }} />
      </div>

      <div className={styles.controls}>
        {running ? (
          <>
            <button className={styles.breakBtn} onClick={handleBreak}>Take a break</button>
            <button className={styles.pauseBtn} onClick={handlePause}>Pause</button>
          </>
        ) : (
          <>
            <button className={styles.resumeBtn} onClick={handleStart}>Resume</button>
            <button className={styles.resetBtn} onClick={handleReset}>Reset</button>
          </>
        )}
      </div>
    </div>
  )
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
