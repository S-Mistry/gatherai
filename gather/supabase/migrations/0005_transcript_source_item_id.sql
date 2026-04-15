alter table public.transcript_segments
add column if not exists source_item_id text;

create unique index if not exists idx_transcript_segments_session_source_item
on public.transcript_segments (session_id, source_item_id);
