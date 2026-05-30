-- Run this once in the Supabase SQL editor for your project.
-- Column names are camelCase (quoted) to match TypeScript types directly.

create table if not exists spheres (
  id text primary key,
  name text not null,
  color text not null,
  "targetMinutes" integer not null default 60,
  rhythm text not null default 'daily',
  active boolean not null default true
);

create table if not exists sphere_tasks (
  id text primary key,
  "sphereId" text not null,
  title text not null,
  "defaultDuration" integer not null default 30,
  source text not null default 'user',
  recurrence jsonb,
  archived boolean not null default false
);

create table if not exists items (
  id text primary key,
  title text not null,
  "sphereId" text,
  date text,
  done boolean not null default false,
  "completedAt" text
);

create table if not exists sphere_timers (
  id text primary key,
  "sphereId" text not null,
  date text not null,
  "elapsedSeconds" integer not null default 0,
  "runningAt" double precision
);

-- No auth: disable RLS on all tables so the anon key has full access
alter table spheres disable row level security;
alter table sphere_tasks disable row level security;
alter table items disable row level security;
alter table sphere_timers disable row level security;

-- Enable Realtime so changes on one device appear on others automatically
alter publication supabase_realtime add table spheres;
alter publication supabase_realtime add table sphere_tasks;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table sphere_timers;
