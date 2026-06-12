# CLAUDE.md

## Overview

Spheres is a single-user PWA focused on daily time allocation across life spheres. Success is measured by showing up consistently, not completing task lists.

- One user only.
- Optimize for simplicity, low friction, and mobile reliability.
- `spheres-app-spec.md` reflects product intent, not current implementation.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Run `npm run build` before considering work complete.

Required env vars:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## Architecture

### Data

Supabase is the source of truth.

Tables:

- `spheres`
- `sphere_tasks`
- `items`
- `sphere_timers`

Important:

- No auth or RLS.
- Schema is defined in `supabase-schema.sql`.
- Quoted camelCase column names must be preserved.
- Realtime subscriptions refetch changed tables.
- Schema changes must be added to the realtime publication.

### State

`src/context/AppContext.tsx` is the application's source of truth.

Responsibilities:

- Loads and stores all application data.
- Exposes all mutations.
- Handles realtime sync.
- Provides derived selectors.

Components should use `useApp()` and never access Supabase directly.

### Item Rules

Items exist in three states:

- `sphereId + date` → assigned to a day and carries forward until completed.
- `sphereId + null` → recurring.
- `null + null` → unsorted.

Carry-forward and completion logic lives in `sphereItemsForDate()`.

### Routes

- `/` — Today
- `/sphere/:id` — Sphere details
- `/log` — Completed items
- `/settings` — Configuration
- `/migrate` — Legacy Dexie migration tool

## Conventions

- TypeScript strict mode.
- Derive state; do not persist computed values.
- CSS Modules + CSS custom properties only.
- Mobile-first design.
- No shame mechanics (streaks, penalties, failure states).
- Do not add auth, multi-user support, or new dependencies without approval.

## Gotchas

- `seedIfEmpty()` only runs on an empty `spheres` table.
- Use local dates (`date-fns` helpers), never raw UTC comparisons for day logic.