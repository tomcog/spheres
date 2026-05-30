# Spheres — V1 Product Spec

A time-allocation app for people who fail at rigid to-do lists. You commit to **spheres of attention**, not a list of tasks. You win the day by showing up to a sphere, not by clearing it.

---

## 1. Core Concept

The app tracks **time devoted to life areas**, not tasks completed. Tasks exist only as *supply*—suggestions for how to spend a sphere's time. They never set the bar.

**The daily win condition:** hit each sphere's time floor. Missing one sphere never invalidates the others. There is no total-failure state.

---

## 2. The Five Spheres

| Sphere | Covers | Color |
|---|---|---|
| Physical Health | Exercise, PT, walking, sleep hygiene, food prep, medical | Green |
| Mental Health | Meditation, journaling, therapy, rest, time outside, restorative activity | Blue |
| Professional Development | Freelance work, job applications, portfolio, skill-building, networking | Amber |
| Organization | House, admin, finances, errands, email, adult maintenance | Slate |
| Creative Expression | Making things for their own sake | Purple |

Boundaries are deliberately clean: body, mind, work, environment, soul. Every task should have one obvious home.

---

## 3. Data Model

### Sphere
- `id`
- `name`
- `color`
- `targetMinutes` — the daily floor the user sets (e.g. 60)
- `rhythm` — `daily` | `weekly` (V1 ships daily only; field exists for V2)
- `active` — bool

### Task
- `id`
- `sphereId` — which sphere it feeds
- `title` — e.g. "Clean guest bathroom"
- `defaultDuration` — minutes this task contributes (e.g. 15)
- `source` — `user` | `recurring` | `suggested`
- `recurrence` — `null` | `daily` | `{daysOfWeek: [...]}`
- `archived` — bool

### Session (the actual record of doing something)
- `id`
- `taskId` — nullable (you can log time to a sphere with no task)
- `sphereId`
- `minutes`
- `date`
- `loggedVia` — `timer` | `manual`

A **Session** is the unit of truth. Targets are met by summing today's session minutes per sphere.

---

## 4. The Core Loop

1. Open app → see today: five spheres, each showing `minutes done / target` as a fill bar.
2. Pick a sphere (ideally the one with time left, or the one you have energy for).
3. See its task supply: recurring fixtures, your added tasks, and app suggestions.
4. Either **start a timer** on a task or **log it after** ("that was ~15 min").
5. Session minutes accrue to the sphere. Bar fills. Done log grows.
6. Sphere hits its floor → it's marked satisfied for the day (but stays open for bonus time).

---

## 5. Settled Design Decisions

These are locked for V1:

1. **Fixed floors.** Each sphere's target is a number the user sets once. Task load never changes it. Task pile is *supply*, not a driver.
2. **Both timer and log-after**, with **log-after as default** and timer as a button on each task. Frictionless path first; momentum tool available.
3. **Unmet time vanishes at midnight.** Clean slate daily. No rollover, no debt counter, no shame spiral with math.
4. **Static, hand-built suggestion lists** per sphere. No context-awareness in V1.
5. **All five spheres are daily** in V1. The `rhythm` field exists in the model so weekly spheres can ship in V2 without migration.

---

## 6. Screens (V1)

### Today (home)
- Five sphere cards, each with a fill bar (`done / target`) and satisfied-state checkmark.
- A single **"One thing today"** highlight at top: one suggested next action, to anchor an overwhelmed day.
- Tap a card → Sphere Detail.

### Sphere Detail
- Header: sphere name, color, `done / target`.
- **Task supply**, grouped: Recurring · Yours · Suggestions.
- Each task row: title, default duration, a **timer** button and a **log-it** button.
- "+ Add task" and a free **"Log time"** entry (log minutes with no task attached).

### Timer (modal/overlay)
- Big running clock, sphere color.
- Pause / Stop. On stop → confirm minutes → writes a Session.

### Done Log
- Reverse-chronological list of today's (and past days') sessions.
- The dopamine screen: seeing what got done, not empty checkboxes.

### Settings
- Edit spheres: name, color, target minutes, active toggle.
- Manage recurring tasks.
- Edit per-sphere suggestion lists.

---

## 7. Feature Cut Line

**In V1:**
- Five fixed daily spheres with editable floors
- Tasks (user / recurring / suggested) with durations
- Timer + manual logging → sessions
- Today view with fill bars and "One thing today"
- Done log
- Hand-built suggestions
- Midnight reset

**Explicitly NOT in V1** (parked for later):
- Weekly-rhythm spheres
- Context-aware / smart suggestions
- Streaks and rewards
- Friction logging (why you bounced off a task)
- Rollover / debt accounting
- Body-doubling / social features
- Cross-day analytics and trends

---

## 8. Build Notes

- **Sessions are immutable records**; targets and done-state are always *derived* by summing sessions. Never store "minutes done" as a mutable field—compute it. This keeps the model honest and makes analytics trivial later.
- **Midnight reset is not a delete**—sessions persist forever. "Reset" just means today's derived totals start from zero because you're summing only today's sessions.
- **Suggestions are just Tasks with `source: suggested`** that aren't yet acted on—no separate type needed. Acting on one can optionally convert it to a real session without cluttering the user's task list.
- Smallest possible first build: Today view + Sphere Detail + manual logging. Timer and Done Log can follow once the loop feels right.
