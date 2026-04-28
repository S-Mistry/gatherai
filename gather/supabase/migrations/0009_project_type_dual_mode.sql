alter table public.projects
add column if not exists project_type text;

update public.projects
set project_type = 'discovery'
where project_type is null;

alter table public.projects
alter column project_type set default 'discovery';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'projects_project_type_check'
  ) then
    alter table public.projects
    add constraint projects_project_type_check
    check (project_type in ('discovery', 'feedback'));
  end if;
end;
$$;

alter table public.projects
alter column project_type set not null;

drop function if exists public.create_project_with_defaults(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  integer,
  public.anonymity_mode
);

create or replace function public.create_project_with_defaults(
  target_workspace_id uuid,
  project_project_type text,
  project_name text,
  project_slug text,
  project_client_name text,
  project_objective text,
  project_areas_of_interest jsonb,
  project_required_questions jsonb,
  project_duration_cap_minutes integer,
  project_anonymity_mode public.anonymity_mode,
  project_tone_style text,
  project_follow_up_limit integer
)
returns table (
  project_id uuid,
  project_config_version_id uuid,
  public_link_id uuid,
  public_link_token text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  normalized_project_type text := case
    when project_project_type = 'feedback' then 'feedback'
    else 'discovery'
  end;
  normalized_project_name text := coalesce(nullif(trim(project_name), ''), 'Untitled project');
  normalized_project_slug text := nullif(trim(project_slug), '');
  normalized_client_name text := coalesce(nullif(trim(project_client_name), ''), 'Client');
  normalized_objective text := coalesce(
    nullif(trim(project_objective), ''),
    case
      when normalized_project_type = 'feedback'
        then 'Capture what landed, what missed, and what should change after the experience.'
      else 'Understand the friction, contradictions, and decisions the team should address next.'
    end
  );
  normalized_duration_cap_minutes integer := coalesce(
    project_duration_cap_minutes,
    case
      when normalized_project_type = 'feedback' then 6
      else 15
    end
  );
  normalized_anonymity_mode public.anonymity_mode := coalesce(
    project_anonymity_mode,
    case
      when normalized_project_type = 'feedback'
        then 'anonymous'::public.anonymity_mode
      else 'pseudonymous'::public.anonymity_mode
    end
  );
  normalized_tone_style text := coalesce(
    nullif(trim(project_tone_style), ''),
    case
      when normalized_project_type = 'feedback'
        then 'Warm, concise, reflective, researcher-like.'
      else 'Warm, neutral, researcher-like.'
    end
  );
  normalized_follow_up_limit integer := greatest(
    1,
    least(
      coalesce(
        project_follow_up_limit,
        case
          when normalized_project_type = 'feedback' then 1
          else 2
        end
      ),
      2
    )
  );
  normalized_areas_of_interest jsonb := case
    when jsonb_typeof(project_areas_of_interest) = 'array'
      and jsonb_array_length(project_areas_of_interest) > 0
      then project_areas_of_interest
    when normalized_project_type = 'feedback'
      then jsonb_build_array(
        'What worked well',
        'What felt unclear or missing',
        'What changed afterwards',
        'What to improve next time'
      )
    else jsonb_build_array(
      'Current blockers',
      'Decision ownership',
      'Where teams feel aligned or misaligned',
      'What a useful outcome would look like'
    )
  end;
  normalized_required_questions jsonb := case
    when jsonb_typeof(project_required_questions) = 'array'
      and jsonb_array_length(project_required_questions) > 0
      then project_required_questions
    when normalized_project_type = 'feedback'
      then jsonb_build_array(
        jsonb_build_object(
          'id', 'q-default-1',
          'prompt', 'What part of the experience felt most useful or positive to you?',
          'goal', 'Mode starter question.'
        ),
        jsonb_build_object(
          'id', 'q-default-2',
          'prompt', 'What felt unclear, missing, or less useful?',
          'goal', 'Mode starter question.'
        ),
        jsonb_build_object(
          'id', 'q-default-3',
          'prompt', 'What changed for you afterwards, if anything?',
          'goal', 'Mode starter question.'
        ),
        jsonb_build_object(
          'id', 'q-default-4',
          'prompt', 'If we ran this again, what should we do differently?',
          'goal', 'Mode starter question.'
        )
      )
    else jsonb_build_array(
      jsonb_build_object(
        'id', 'q-default-1',
        'prompt', 'What outcome would make this useful for you?',
        'goal', 'Mode starter question.'
      ),
      jsonb_build_object(
        'id', 'q-default-2',
        'prompt', 'Where is the biggest friction today?',
        'goal', 'Mode starter question.'
      ),
      jsonb_build_object(
        'id', 'q-default-3',
        'prompt', 'What tension, contradiction, or tradeoff should we surface?',
        'goal', 'Mode starter question.'
      ),
      jsonb_build_object(
        'id', 'q-default-4',
        'prompt', 'What risk should we account for while planning this session?',
        'goal', 'Mode starter question.'
      )
    )
  end;
begin
  if auth.uid() is null then
    raise exception 'Consultant authentication is required.';
  end if;

  if normalized_project_slug is null then
    raise exception 'Project slug is required.';
  end if;

  if not app.has_workspace_access(target_workspace_id) then
    raise exception 'You do not have access to this workspace.';
  end if;

  insert into public.projects (
    workspace_id,
    project_type,
    name,
    slug,
    client_name,
    status
  )
  values (
    target_workspace_id,
    normalized_project_type,
    normalized_project_name,
    normalized_project_slug,
    normalized_client_name,
    'draft'
  )
  returning id into project_id;

  insert into public.project_config_versions (
    project_id,
    version_number,
    objective,
    areas_of_interest,
    required_questions,
    duration_cap_minutes,
    interview_mode,
    anonymity_mode,
    tone_style,
    metadata_prompts,
    prohibited_topics,
    follow_up_limit
  )
  values (
    project_id,
    1,
    normalized_objective,
    normalized_areas_of_interest,
    normalized_required_questions,
    normalized_duration_cap_minutes,
    'strict',
    normalized_anonymity_mode,
    normalized_tone_style,
    '[]'::jsonb,
    '[]'::jsonb,
    normalized_follow_up_limit
  )
  returning id into project_config_version_id;

  public_link_token := 'link-' || gen_random_uuid()::text;

  insert into public.project_public_links (
    project_id,
    project_config_version_id,
    link_token
  )
  values (
    project_id,
    project_config_version_id,
    public_link_token
  )
  returning id into public_link_id;

  return query
  select
    project_id,
    project_config_version_id,
    public_link_id,
    public_link_token;
end;
$$;

revoke all on function public.create_project_with_defaults(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  integer,
  public.anonymity_mode,
  text,
  integer
) from public, anon, authenticated;

grant execute on function public.create_project_with_defaults(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  integer,
  public.anonymity_mode,
  text,
  integer
) to authenticated;
