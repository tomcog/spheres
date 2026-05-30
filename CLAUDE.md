# CLAUDE.md — Spheres

Build instructions and project conventions for Claude Code. Read this fully before writing code.

---

## What this is

A local-first PWA for time-allocation against **spheres of attention**. The user commits to spending a daily floor of minutes on each life area (sphere). They win the day by *showing up* to a sphere, not by clearing a task list. Tasks exist only as *supply*—suggestions for how to spend a sphere's time. Tasks never set the bar; the floor is a fixed number the user sets.

This is a personal app for one user. Optimize for clarity, low friction, and offline reliability—not for scale, multi-user, or a backend.

---

## Tech stack (locked — do not substitute)

- **React + Vite + TypeScript**
- **Styling: plain CSS via CSS Modules + CSS custom properties.** NO Tailwind. NO CSS-in-JS runtime. NO preprocessor (Sass/Less). Use native CSS nesting and `clamp()`.
- **Storage: Dexie.js over IndexedDB.** Local-first. No backend, no auth, no network calls for data.
- **State: React Context + `useReducer`.** Do not add Redux/Zustand/Jotai.
- **Routing: react-router.** Real routes so the mobile back button works.
- **PWA: vite-plugin-pwa** for manifest + service worker (offline-capable).
- **Dates: date-fns** for all day-boundary logic.
- **Lint/format: ESLint + Prettier**, configured before feature work.

If a requirement seems to need a library outside this list, STOP and ask rather than adding it.

---

## Design constraints

- **Mobile-first, responsive.** Design for a ~380px viewport first; scale up gracefully. Touch targets ≥ 44px.
- **One screen, one decision.** Avoid choice paralysis. Don't crowd screens.
- **No shame mechanics.** No streak-breaking guilt, no red "you failed" states, no debt counters. Missing a sphere is neutral, never an error.
- **Lean CSS.** Define design tokens once in `:root` (the five sphere colors, a spacing scale, font sizes). Reuse them everywhere.

---

## Data model

Three entities. **A Session is the only source of truth.** Progress, satisfied-state, and the daily reset are ALWAYS *derived* by summing sessions—never stored as mutable fields.

```ts
interface Sphere {
  id: string;
  name: string;
  color: string;          // hex; also surfaced as a CSS custom property
  targetMinutes: number;  // the daily floor the user sets (e.g. 60)
  rhythm: 'daily' | 'weekly'; // V1 ships 'daily' only; field exists for V2
  active: boolean;
}

interface Task {
  id: string;
  sphereId: string;
  title: string;
  defaultDuration: number;          // minutes this task contributes
  source: 'user' | 'recurring' | 'suggested';
  recurrence: null | 'daily' | { daysOfWeek: number[] };
  archived: boolean;
}

interface Session {
  id: string;
  taskId: string | null;            // nullable: time can be logged with no task
  sphereId: string;
  minutes: number;
  date: string;                     // ISO date; belongs to the LOCAL calendar day it was logged
  loggedVia: 'timer' | 'manual';
}
```

### Critical rules

- **Never store "minutes done" on a Sphere.** Compute it by summing today's Sessions for that sphere. Same for satisfied-state (`sum >= targetMinutes`).
- **Sessions are immutable and persist forever.** The "midnight reset" is not a delete—today's totals start at zero simply because you only sum sessions whose `date` is today (local time).
- **Suggestions are just `Task`s with `source: 'suggested'`.** No separate type. Acting on one writes a Session; optionally promote it to a real task.
- **Day boundary is local-time.** A session belongs to the local calendar day it was logged. Use date-fns; never compare raw UTC strings for "is this today."

---

## The five spheres (seed data)

Seed the DB on first run with these. Targets are user-editable afterward; default each to 60 min, all daily.

| Name | Color | Covers |
|---|---|---|
| Physical Health | green | exercise, PT, walking, sleep hygiene, food prep, medical |
| Mental Health | blue | meditation, journaling, therapy, rest, time outside |
| Professional Development | amber | freelance work, job applications, portfolio, skills, networking |
| Organization | slate | house, admin, finances, errands, email |
| Creative Expression | purple | making things for their own sake |

Pick pleasant, accessible hex values for each; expose them as CSS custom properties.

---

## Screens (V1)

1. **Today (home)** — five sphere cards, each a fill bar (`done / target`) + satisfied checkmark. A single **"One thing today"** highlight at top (one suggested next action). Tap a card → Sphere Detail.
2. **Sphere Detail** — header with `done / target`; task supply grouped **Recurring · Yours · Suggestions**; each row has a **timer** button and a **log-it** button; "+ Add task" and a free **"Log time"** entry (minutes, no task needed).
3. **Timer** — overlay with running clock in the sphere's color; pause/stop; on stop, confirm minutes → write a Session.
4. **Done Log** — reverse-chronological list of sessions. This is the reward screen: seeing what got done.
5. **Settings** — edit spheres (name, color, target, active); manage recurring tasks; edit per-sphere suggestion lists; **export/import all data as JSON**.

---

## Settled decisions (do not relitigate)

1. Fixed floors. Task load never changes a sphere's target.
2. Both timer and log-after; **log-after is the default path**, timer is a button.
3. Unmet time vanishes at midnight. No rollover, no debt.
4. Static, hand-built suggestion lists. No smart/context-aware suggestions in V1.
5. All five spheres are daily in V1. `rhythm` field exists for a V2 weekly mode.

---

## In V1 / NOT in V1

**In:** five fixed daily spheres with editable floors; tasks (user/recurring/suggested); timer + manual logging → sessions; Today view with fill bars + "One thing today"; Done Log; hand-built suggestions; midnight reset (derived); JSON export/import.

**Not (parked):** weekly-rhythm spheres; smart suggestions; streaks/rewards; friction logging; rollover/debt; body-doubling/social; cross-day analytics/trends; tests.

---

## Build order

Build in slices; get the core loop working before polish. Confirm each slice runs before moving on.

1. **Scaffold.** Vite + React + TS project. ESLint + Prettier. Dexie schema for the three entities. Seed the five spheres on first run. Design tokens in `:root`.
2. **Today view + Sphere Detail + manual logging.** This is the whole loop minus polish: see spheres, open one, log minutes, watch the bar fill (derived from sessions). Make this feel right before anything else.
3. **Tasks.** Add user tasks, recurring fixtures, and per-sphere suggestion lists. Wire "log-it" buttons to default durations.
4. **Timer.** Overlay timer writing timer-sourced sessions.
5. **Done Log.**
6. **Settings** including JSON export/import.
7. **PWA.** Manifest, icons (192/512), service worker, offline check, installability.

---

## Conventions

- TypeScript strict mode on. No `any` without a comment justifying it.
- Derive, don't store: any "progress" number is computed from sessions at read time.
- Keep components small and one-purpose. Co-locate each component's CSS Module.
- All user data stays on-device. No analytics, no telemetry, no external requests.
- When unsure about a product decision, ask rather than inventing scope.
