drop index if exists public.idx_transcript_segments_session_source_item;

create unique index if not exists idx_transcript_segments_session_source_item
on public.transcript_segments (session_id, source_item_id)
where source_item_id is not null;

create index if not exists idx_participant_sessions_project_last_activity
on public.participant_sessions (project_id, last_activity_at desc);

create index if not exists idx_analysis_jobs_processing_claimed_at
on public.analysis_jobs (claimed_at)
where status = 'processing';

create index if not exists idx_analysis_jobs_session_queue
on public.analysis_jobs (session_id, created_at asc)
where status = 'queued'
  and session_id is not null;

create index if not exists idx_analysis_jobs_project_queue
on public.analysis_jobs (project_id, created_at asc)
where status = 'queued'
  and project_id is not null
  and job_type = 'project_synthesis';

create or replace function public.append_session_events(
  target_session_id uuid,
  transcript_segments_payload jsonb default '[]'::jsonb,
  runtime_state_payload jsonb default null,
  activity_at timestamptz default timezone('utc', now())
)
returns setof public.transcript_segments
language plpgsql
security definer
set search_path = public
as $$
declare
  base_order integer := 0;
  effective_activity_at timestamptz := coalesce(activity_at, timezone('utc', now()));
begin
  perform 1
  from public.participant_sessions ps
  where ps.id = target_session_id
  for update;

  if not found then
    return;
  end if;

  update public.participant_sessions ps
  set last_activity_at = effective_activity_at,
      runtime_state = coalesce(runtime_state_payload, ps.runtime_state)
  where ps.id = target_session_id;

  select coalesce(max(ts.order_index), 0)
  into base_order
  from public.transcript_segments ts
  where ts.session_id = target_session_id;

  return query
  with payload as (
    select
      value as item,
      ordinality
    from jsonb_array_elements(coalesce(transcript_segments_payload, '[]'::jsonb))
      with ordinality
  ),
  normalized as (
    select
      nullif(trim(item ->> 'source_item_id'), '') as source_item_id,
      case
        when item ? 'speaker' then (item ->> 'speaker')::public.transcript_speaker
        else null
      end as speaker,
      nullif(trim(item ->> 'content'), '') as content,
      case
        when item ? 'start_offset_ms'
          and jsonb_typeof(item -> 'start_offset_ms') = 'number'
          then (item ->> 'start_offset_ms')::integer
        else null
      end as start_offset_ms,
      case
        when item ? 'end_offset_ms'
          and jsonb_typeof(item -> 'end_offset_ms') = 'number'
          then (item ->> 'end_offset_ms')::integer
        else null
      end as end_offset_ms,
      ordinality
    from payload
  ),
  deduped as (
    select *
    from (
      select
        normalized.*,
        case
          when normalized.source_item_id is null then 1
          else row_number() over (
            partition by normalized.source_item_id
            order by normalized.ordinality
          )
        end as source_rank
      from normalized
    ) ranked
    where ranked.source_rank = 1
  ),
  filtered as (
    select *
    from deduped d
    where d.content is not null
      and d.speaker is not null
      and (
        d.source_item_id is null
        or not exists (
          select 1
          from public.transcript_segments ts
          where ts.session_id = target_session_id
            and ts.source_item_id = d.source_item_id
        )
      )
  ),
  inserted as (
    insert into public.transcript_segments (
      session_id,
      source_item_id,
      speaker,
      content,
      order_index,
      start_offset_ms,
      end_offset_ms,
      created_at
    )
    select
      target_session_id,
      filtered.source_item_id,
      filtered.speaker,
      filtered.content,
      base_order + row_number() over (order by filtered.ordinality),
      filtered.start_offset_ms,
      filtered.end_offset_ms,
      effective_activity_at
    from filtered
    order by filtered.ordinality
    returning *
  )
  select *
  from inserted
  order by order_index asc;
end;
$$;

create or replace function public.get_latest_session_outputs_for_project(
  target_project_id uuid
)
returns setof public.session_outputs_generated
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (sog.session_id) sog.*
  from public.session_outputs_generated sog
  join public.participant_sessions ps on ps.id = sog.session_id
  where ps.project_id = target_project_id
  order by sog.session_id, sog.created_at desc;
$$;

revoke all on function public.append_session_events(uuid, jsonb, jsonb, timestamptz)
from public, anon, authenticated;
revoke all on function public.get_latest_session_outputs_for_project(uuid)
from public, anon, authenticated;

grant execute on function public.append_session_events(uuid, jsonb, jsonb, timestamptz)
to service_role;
grant execute on function public.get_latest_session_outputs_for_project(uuid)
to service_role;
