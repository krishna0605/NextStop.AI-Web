create table if not exists public.meeting_capture_sessions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.web_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'preparing',
  capture_mode text not null default 'browser_tab',
  source_surface text null,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  sealed_at timestamptz null,
  cancel_requested_at timestamptz null,
  canceled_at timestamptz null,
  last_client_heartbeat_at timestamptz null,
  last_chunk_received_at timestamptz null,
  total_chunks_received integer not null default 0,
  total_bytes_received bigint not null default 0,
  final_asset_bucket text null,
  final_asset_path text null,
  final_asset_status text null,
  error text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_capture_chunks (
  id uuid primary key default gen_random_uuid(),
  capture_session_id uuid not null references public.meeting_capture_sessions(id) on delete cascade,
  meeting_id uuid not null references public.web_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index integer not null,
  bucket text not null,
  path text not null,
  byte_size bigint null,
  checksum text null,
  received_at timestamptz null,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (capture_session_id, chunk_index)
);

alter table public.web_meetings
  add column if not exists cancel_requested_at timestamptz null,
  add column if not exists canceled_at timestamptz null,
  add column if not exists current_capture_session_id uuid null;

alter table public.ai_jobs
  add column if not exists cancel_requested_at timestamptz null,
  add column if not exists canceled_at timestamptz null,
  add column if not exists cancel_reason text null,
  add column if not exists cancel_requested_by uuid null;

create index if not exists meeting_capture_sessions_user_id_idx
  on public.meeting_capture_sessions (user_id);

create index if not exists meeting_capture_sessions_meeting_id_idx
  on public.meeting_capture_sessions (meeting_id, created_at desc);

create index if not exists meeting_capture_sessions_status_idx
  on public.meeting_capture_sessions (status, updated_at desc);

create index if not exists meeting_capture_chunks_session_idx
  on public.meeting_capture_chunks (capture_session_id, chunk_index asc);

create index if not exists meeting_capture_chunks_meeting_idx
  on public.meeting_capture_chunks (meeting_id, created_at desc);

create index if not exists ai_jobs_cancel_requested_idx
  on public.ai_jobs (cancel_requested_at, status);

drop trigger if exists meeting_capture_sessions_set_updated_at on public.meeting_capture_sessions;
create trigger meeting_capture_sessions_set_updated_at
before update on public.meeting_capture_sessions
for each row
execute function public.set_workspace_updated_at();

drop trigger if exists meeting_capture_chunks_set_updated_at on public.meeting_capture_chunks;
create trigger meeting_capture_chunks_set_updated_at
before update on public.meeting_capture_chunks
for each row
execute function public.set_workspace_updated_at();

alter table public.meeting_capture_sessions enable row level security;
alter table public.meeting_capture_chunks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_capture_sessions'
      and policyname = 'Users can view their own capture sessions'
  ) then
    create policy "Users can view their own capture sessions"
      on public.meeting_capture_sessions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_capture_chunks'
      and policyname = 'Users can view their own capture chunks'
  ) then
    create policy "Users can view their own capture chunks"
      on public.meeting_capture_chunks
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;
