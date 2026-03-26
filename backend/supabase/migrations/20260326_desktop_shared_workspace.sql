create extension if not exists pgcrypto;

create table if not exists public.desktop_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  platform text not null,
  app_version text null,
  last_seen_at timestamptz not null default now(),
  last_entitlement_refresh_at timestamptz null,
  grace_window_expires_at timestamptz null,
  revoked_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, device_id)
);

alter table public.web_meetings
  add column if not exists origin_platform text not null default 'web',
  add column if not exists origin_device_id text null,
  add column if not exists external_local_id text null,
  add column if not exists transcript_storage text not null default 'none';

create index if not exists desktop_devices_user_id_idx on public.desktop_devices (user_id);
create index if not exists desktop_devices_device_id_idx on public.desktop_devices (device_id);
create index if not exists web_meetings_origin_device_id_idx on public.web_meetings (origin_device_id);
create unique index if not exists web_meetings_user_origin_external_local_idx
  on public.web_meetings (user_id, origin_platform, external_local_id)
  where external_local_id is not null;

drop trigger if exists desktop_devices_set_updated_at on public.desktop_devices;
create trigger desktop_devices_set_updated_at
before update on public.desktop_devices
for each row
execute function public.set_workspace_updated_at();

alter table public.desktop_devices enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'desktop_devices'
      and policyname = 'Users can view their own desktop devices'
  ) then
    create policy "Users can view their own desktop devices"
      on public.desktop_devices
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;
