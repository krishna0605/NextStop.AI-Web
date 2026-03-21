create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.web_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null,
  artifact_type text null,
  status text not null default 'queued',
  stage text not null default 'queued',
  attempts integer not null default 0,
  provider_metadata jsonb not null default '{}'::jsonb,
  error text null,
  started_at timestamptz null,
  finished_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_assets (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.web_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_kind text not null,
  bucket text not null,
  path text not null,
  mime_type text null,
  byte_size bigint null,
  checksum text null,
  status text not null default 'available',
  expires_at timestamptz null,
  created_by_job_id uuid null references public.ai_jobs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, asset_kind, path)
);

create table if not exists public.meeting_artifacts (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.web_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  artifact_type text not null,
  status text not null default 'ready',
  payload_json jsonb null,
  payload_text text null,
  source_model text null,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_by_job_id uuid null references public.ai_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (meeting_id, artifact_type)
);

create table if not exists public.meeting_speaker_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.web_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  speaker_label text not null,
  start_ms integer not null default 0,
  end_ms integer not null default 0,
  text_snippet text null,
  confidence double precision null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_jobs_user_id_idx on public.ai_jobs (user_id);
create index if not exists ai_jobs_meeting_id_idx on public.ai_jobs (meeting_id);
create index if not exists meeting_assets_user_id_idx on public.meeting_assets (user_id);
create index if not exists meeting_assets_meeting_id_idx on public.meeting_assets (meeting_id);
create index if not exists meeting_assets_expires_at_idx on public.meeting_assets (expires_at);
create index if not exists meeting_artifacts_user_id_idx on public.meeting_artifacts (user_id);
create index if not exists meeting_artifacts_meeting_id_idx on public.meeting_artifacts (meeting_id);
create index if not exists meeting_speaker_segments_user_id_idx on public.meeting_speaker_segments (user_id);
create index if not exists meeting_speaker_segments_meeting_id_idx on public.meeting_speaker_segments (meeting_id);

drop trigger if exists ai_jobs_set_updated_at on public.ai_jobs;
create trigger ai_jobs_set_updated_at
before update on public.ai_jobs
for each row
execute function public.set_workspace_updated_at();

drop trigger if exists meeting_assets_set_updated_at on public.meeting_assets;
create trigger meeting_assets_set_updated_at
before update on public.meeting_assets
for each row
execute function public.set_workspace_updated_at();

drop trigger if exists meeting_artifacts_set_updated_at on public.meeting_artifacts;
create trigger meeting_artifacts_set_updated_at
before update on public.meeting_artifacts
for each row
execute function public.set_workspace_updated_at();

alter table public.ai_jobs enable row level security;
alter table public.meeting_assets enable row level security;
alter table public.meeting_artifacts enable row level security;
alter table public.meeting_speaker_segments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_jobs'
      and policyname = 'Users can view their own ai jobs'
  ) then
    create policy "Users can view their own ai jobs"
      on public.ai_jobs
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_assets'
      and policyname = 'Users can view their own meeting assets'
  ) then
    create policy "Users can view their own meeting assets"
      on public.meeting_assets
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_artifacts'
      and policyname = 'Users can view their own meeting artifacts'
  ) then
    create policy "Users can view their own meeting artifacts"
      on public.meeting_artifacts
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_speaker_segments'
      and policyname = 'Users can view their own speaker segments'
  ) then
    create policy "Users can view their own speaker segments"
      on public.meeting_speaker_segments
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;
