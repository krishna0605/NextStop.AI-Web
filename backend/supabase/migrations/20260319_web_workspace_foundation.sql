create extension if not exists pgcrypto;

create table if not exists public.integrations_google (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'disconnected',
  external_account_email text null,
  selected_calendar_id text null,
  selected_calendar_name text null,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists public.integrations_notion (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'disconnected',
  external_workspace_name text null,
  selected_destination_id text null,
  selected_destination_name text null,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz null,
  updated_at timestamptz not null default now()
);

create table if not exists public.web_meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null,
  status text not null default 'draft',
  google_event_id text null,
  notion_destination_id text null,
  tags jsonb not null default '[]'::jsonb,
  session_metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz null,
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_findings (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.web_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ready',
  summary_short text null,
  summary_full text null,
  executive_bullets_json jsonb not null default '[]'::jsonb,
  decisions_json jsonb not null default '[]'::jsonb,
  action_items_json jsonb not null default '[]'::jsonb,
  risks_json jsonb not null default '[]'::jsonb,
  follow_ups_json jsonb not null default '[]'::jsonb,
  email_draft text null,
  source_model text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meeting_exports (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.web_meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  export_type text not null,
  status text not null,
  destination text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists web_meetings_user_id_idx on public.web_meetings (user_id);
create index if not exists meeting_findings_user_id_idx on public.meeting_findings (user_id);
create index if not exists meeting_exports_user_id_idx on public.meeting_exports (user_id);
create index if not exists meeting_exports_meeting_id_idx on public.meeting_exports (meeting_id);

create or replace function public.set_workspace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists integrations_google_set_updated_at on public.integrations_google;
create trigger integrations_google_set_updated_at
before update on public.integrations_google
for each row
execute function public.set_workspace_updated_at();

drop trigger if exists integrations_notion_set_updated_at on public.integrations_notion;
create trigger integrations_notion_set_updated_at
before update on public.integrations_notion
for each row
execute function public.set_workspace_updated_at();

drop trigger if exists web_meetings_set_updated_at on public.web_meetings;
create trigger web_meetings_set_updated_at
before update on public.web_meetings
for each row
execute function public.set_workspace_updated_at();

drop trigger if exists meeting_findings_set_updated_at on public.meeting_findings;
create trigger meeting_findings_set_updated_at
before update on public.meeting_findings
for each row
execute function public.set_workspace_updated_at();

alter table public.integrations_google enable row level security;
alter table public.integrations_notion enable row level security;
alter table public.web_meetings enable row level security;
alter table public.meeting_findings enable row level security;
alter table public.meeting_exports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integrations_google'
      and policyname = 'Users can view their own Google integration'
  ) then
    create policy "Users can view their own Google integration"
      on public.integrations_google
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integrations_notion'
      and policyname = 'Users can view their own Notion integration'
  ) then
    create policy "Users can view their own Notion integration"
      on public.integrations_notion
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'web_meetings'
      and policyname = 'Users can view their own web meetings'
  ) then
    create policy "Users can view their own web meetings"
      on public.web_meetings
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_findings'
      and policyname = 'Users can view their own meeting findings'
  ) then
    create policy "Users can view their own meeting findings"
      on public.meeting_findings
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'meeting_exports'
      and policyname = 'Users can view their own meeting exports'
  ) then
    create policy "Users can view their own meeting exports"
      on public.meeting_exports
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;
