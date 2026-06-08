# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What this is

Spheres is a single-user PWA for time-allocation against **spheres of attention**. The user commits to a daily floor of minutes on each life area (sphere) and wins the day by *showing up* to a sphere, not by clearing a task list. Tasks/items are *supply* — suggestions for how to spend a sphere's time; they never set the bar.

Optimize for clarity, low friction, and mobile reliability — not for scale or multi-user. There is exactly one user.

> **Note:** `spheres-app-spec.md` is the original product brief. It describes a Dexie/IndexedDB local-first design that the app **no longer uses** (see Architecture below). Treat the spec as product intent, not implementation truth.

---

## Commands

```bash
npm run dev       # Vite dev server on :5173
npm run build     # tsc -b && vite build  (type-check is part of the build)
npm run lint      # ESLint over the repo
npm run preview   # serve the production build locally
```

There is no test suite (tests are intentionally out of scope). `npm run build` is the type-check gate — run it to verify TypeScript before considering a change done.

`.env` must define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`). Without them the app cannot reach its data store.

---

## Architecture

### Data store: Supabase (Postgres), not local

Despite the "local-first" framing in the spec, **all data lives in Supabase**. The app is a thin client over four tables (`src/lib/supabase.ts` creates the client from env vars):

- `spheres` — the five life areas
- `sphere_tasks` — the static suggestion library per sphere (the TS type is `Task`)
- `items` — flexible to-do items (the unit the user actually checks off)
- `sphere_timers` — one running/paused timer per sphere per day

Key facts about the store:
- **No auth, RLS disabled.** The anon key has full read/write. This is deliberate for a single-user app — do not add auth or row-level security without being asked.
- **Column names are camelCase and quoted** in `supabase-schema.sql` (e.g. `"targetMinutes"`, `"completedAt"`) so rows map directly onto the TS interfaces with no field translation. Preserve this when altering the schema.
- **Realtime sync** (`AppContext`): a single channel subscribes to `postgres_changes` on each table and refetches that table on any change, so edits propagate across devices. Schema changes must also be added to the `supabase_realtime` publication (see bottom of `supabase-schema.sql`).
- Schema lives in `supabase-schema.sql` and is applied by hand in the Supabase SQL editor — there are no migration files.

### State: one Context is the source of truth

`src/context/AppContext.tsx` is the heart of the app. It:
- Holds the four tables in React state (`spheres`, `tasks`, `items`, `timers`) plus an `activeDate` in a `useReducer`.
- On mount: `seedIfEmpty()` → `loadAll()` → subscribes to realtime → sets a timer to roll `activeDate` at local midnight.
- Exposes **all mutations** (`addItem`, `toggleItem`, `assignItem`, `removeItem`, `addTask`, `updateSphere`, `startTimer`/`stopTimer`/`resetTimer`). Every mutation writes to Supabase, then calls a `reload*()` helper to refetch that table. Components never touch `supabase` directly except the one-off `MigrateRoute`.
- Exposes **derived selectors** — never store computed progress; compute it at read time:
  - `sphereItemsForDate(sphereId, date)` — the carry-forward logic (see below).
  - `isSatisfied(sphere, date)` — true when every item for the day is done **or** the timer has reached `targetMinutes`.
  - `getElapsed` / `liveElapsed` — timer seconds, computed live from `elapsedSeconds + (now - runningAt)`.

Use `useApp()` to consume the context; it throws if used outside `AppProvider`.

### The `Item` model and carry-forward

`Item` (`src/db/types.ts`) has three modes, encoded by `sphereId`/`date`:
- `sphereId` + `date` → shows in that sphere on that day, and **carries forward** each later day until completed (`date <= activeDate`).
- `sphereId` + `null` → recurring; shows in that sphere every day until done.
- `null` + `null` → unsorted; floats at the bottom of Today until assigned (`unsortedItems`).

A completed item appears only on the day it was checked off (`completedAt === date`). This carry-forward / completion logic lives entirely in `sphereItemsForDate` — change it there, not in components.

### Routing & screens

`react-router` real routes (so the mobile back button works), defined in `src/App.tsx`, with a persistent bottom `NavBar`:
- `/` — `TodayRoute`: the five sphere cards + a `DateStrip` to move `activeDate` across the next several days.
- `/sphere/:id` — `SphereDetailRoute`: items for that sphere on the active date, the timer, and add/assign actions.
- `/log` — `DoneLogRoute`: reverse-chronological completed items.
- `/settings` — `SettingsRoute`: edit spheres, manage the suggestion library, etc.
- `/migrate` — `MigrateRoute`: **one-time** helper that reads the legacy Dexie `SpheresDB` IndexedDB from a device and upserts it into Supabase. Not part of the normal flow; leave it unless doing migration work.

Drag-and-drop (assigning/reordering items) uses `@dnd-kit`.

---

## Conventions

- TypeScript strict mode. No `any` without a comment justifying it.
- **Derive, don't store.** Any progress/satisfied number is computed from the current rows, never persisted as a mutable field.
- Styling is **CSS Modules + CSS custom properties** only. No Tailwind, no CSS-in-JS, no preprocessor. Each component co-locates its `.module.css`. The five sphere colors and other tokens are defined once in `:root` (`src/index.css`) and reused.
- **Mobile-first** (~380px viewport), touch targets ≥ 44px. iOS zoom is suppressed via `src/lib/disableZoom.ts`.
- **No shame mechanics.** Missing a sphere is neutral — never a red error/failure state, no streak/debt counters.
- When a change would need a library outside the existing deps (`react-router-dom`, `date-fns`, `@dnd-kit`, `@supabase/supabase-js`), or would add auth/a second user, **stop and ask** rather than inventing scope.

---

## Gotchas

- `seedIfEmpty()` only seeds when the `spheres` table is empty; it inserts both spheres and the suggestion library. It won't re-seed or reconcile a partially-populated DB.
- Day boundaries are **local time** via `date-fns` (`todayString`, `dateString`). Never compare raw UTC strings for "is this today."
