create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists plan_code text not null default 'none',
  add column if not exists access_state text not null default 'no_plan',
  add column if not exists trial_started_at timestamptz null,
  add column if not exists trial_ends_at timestamptz null,
  add column if not exists subscription_provider text null,
  add column if not exists provider_subscription_id text null,
  add column if not exists subscription_status text null,
  add column if not exists current_period_end timestamptz null,
  add column if not exists billing_email text null,
  add column if not exists entitlement_updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'plan'
  ) then
    execute $update$
      update public.profiles
      set
        plan_code = case
          when plan = 'pro' then 'pro_monthly'
          else 'none'
        end,
        access_state = case
          when plan = 'pro' then 'active'
          else 'no_plan'
        end,
        entitlement_updated_at = now()
      where coalesce(plan_code, 'none') = 'none'
    $update$;
  end if;
end
$$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  plan_code text not null,
  provider_plan_id text null,
  provider_subscription_id text null unique,
  provider_payment_id text null,
  status text not null,
  is_trial boolean not null default false,
  trial_start_at timestamptz null,
  trial_end_at timestamptz null,
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  started_at timestamptz null,
  ended_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text unique,
  event_type text not null,
  user_id uuid null references auth.users(id) on delete set null,
  provider_subscription_id text null,
  payload jsonb not null,
  processed_at timestamptz null,
  processing_error text null,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_provider_subscription_id_idx on public.subscriptions (provider_subscription_id);
create index if not exists billing_events_provider_event_id_idx on public.billing_events (provider_event_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    full_name,
    avatar_url,
    billing_email,
    plan_code,
    access_state,
    entitlement_updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.email,
    'none',
    'no_plan',
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    billing_email = coalesce(public.profiles.billing_email, excluded.billing_email),
    entitlement_updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.subscriptions enable row level security;
alter table public.billing_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can view their own profile'
  ) then
    create policy "Users can view their own profile"
      on public.profiles
      for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'subscriptions'
      and policyname = 'Users can view their own subscriptions'
  ) then
    create policy "Users can view their own subscriptions"
      on public.subscriptions
      for select
      using (auth.uid() = user_id);
  end if;
end
$$;
