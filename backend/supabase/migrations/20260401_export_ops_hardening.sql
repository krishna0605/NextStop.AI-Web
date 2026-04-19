alter table public.meeting_exports
  add column if not exists latest_error text null,
  add column if not exists completed_at timestamptz null,
  add column if not exists duration_ms integer null;

create index if not exists meeting_exports_user_status_created_idx
  on public.meeting_exports (user_id, status, created_at desc);

create index if not exists meeting_exports_meeting_status_created_idx
  on public.meeting_exports (meeting_id, status, created_at desc);
