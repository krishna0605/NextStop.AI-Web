create index if not exists web_meetings_user_started_created_idx
  on public.web_meetings (user_id, started_at desc, created_at desc);

create index if not exists meeting_findings_meeting_user_idx
  on public.meeting_findings (meeting_id, user_id);

create index if not exists meeting_exports_meeting_user_created_idx
  on public.meeting_exports (meeting_id, user_id, created_at desc);

create index if not exists ai_jobs_meeting_user_created_idx
  on public.ai_jobs (meeting_id, user_id, created_at desc);

create index if not exists meeting_assets_meeting_user_kind_created_idx
  on public.meeting_assets (meeting_id, user_id, asset_kind, created_at desc);

create index if not exists meeting_artifacts_meeting_user_type_idx
  on public.meeting_artifacts (meeting_id, user_id, artifact_type);

create index if not exists meeting_speaker_segments_meeting_user_start_idx
  on public.meeting_speaker_segments (meeting_id, user_id, start_ms);
