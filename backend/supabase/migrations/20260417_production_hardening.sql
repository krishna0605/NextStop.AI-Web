alter table public.meeting_findings
  add column if not exists generation_mode text null,
  add column if not exists generation_status text null,
  add column if not exists fallback_reason text null;

alter table public.meeting_assets
  add column if not exists deleted_at timestamptz null,
  add column if not exists deletion_status text null,
  add column if not exists deletion_error text null;

create index if not exists meeting_assets_expiry_cleanup_idx
  on public.meeting_assets (asset_kind, expires_at, deleted_at, status);

create index if not exists meeting_findings_generation_status_idx
  on public.meeting_findings (generation_status, updated_at desc);
