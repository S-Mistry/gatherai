update public.participant_sessions as session
set quality_flag = coalesce(score.low_quality, false)
from (
  select
    participant_sessions.id,
    quality_scores.low_quality
  from public.participant_sessions
  left join public.quality_scores
    on quality_scores.session_id = participant_sessions.id
) as score
where session.id = score.id;

drop table if exists public.session_output_overrides cascade;
drop table if exists public.project_synthesis_overrides cascade;

alter table public.participant_sessions
  drop column if exists manual_quality_flag,
  drop column if exists quality_override_note,
  drop column if exists quality_override_updated_at;
