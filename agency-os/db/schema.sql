create table if not exists agency_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  goal text not null,
  status text not null default 'queued',
  current_agent text,
  priority int not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agency_tasks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references agency_jobs(id) on delete cascade,
  agent text not null,
  task_type text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists agency_events (
  id bigserial primary key,
  job_id uuid not null references agency_jobs(id) on delete cascade,
  event_type text not null,
  agent text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists agency_artifacts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references agency_jobs(id) on delete cascade,
  kind text not null,
  uri text not null,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists agency_gates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references agency_jobs(id) on delete cascade,
  gate_name text not null,
  status text not null default 'pending',
  evidence jsonb not null default '{}'::jsonb,
  checked_by text,
  checked_at timestamptz
);
