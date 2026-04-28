create or replace function public.create_project_with_defaults(
  target_workspace_id uuid,
  project_name text,
  project_slug text,
  project_client_name text,
  project_objective text,
  project_areas_of_interest jsonb,
  project_required_questions jsonb,
  project_duration_cap_minutes integer,
  project_anonymity_mode public.anonymity_mode
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
  normalized_project_name text := coalesce(nullif(trim(project_name), ''), 'Untitled discovery project');
  normalized_project_slug text := nullif(trim(project_slug), '');
  normalized_client_name text := coalesce(nullif(trim(project_client_name), ''), 'Client');
  normalized_objective text := coalesce(nullif(trim(project_objective), ''), 'Capture discovery inputs.');
  normalized_duration_cap_minutes integer := coalesce(project_duration_cap_minutes, 15);
  normalized_anonymity_mode public.anonymity_mode := coalesce(
    project_anonymity_mode,
    'pseudonymous'::public.anonymity_mode
  );
  normalized_areas_of_interest jsonb := case
    when jsonb_typeof(project_areas_of_interest) = 'array'
      and jsonb_array_length(project_areas_of_interest) > 0
      then project_areas_of_interest
    else jsonb_build_array('alignment')
  end;
  normalized_required_questions jsonb := case
    when jsonb_typeof(project_required_questions) = 'array'
      and jsonb_array_length(project_required_questions) > 0
      then project_required_questions
    else jsonb_build_array(
      jsonb_build_object(
        'id', 'q-default-1',
        'prompt', 'What outcome would make this useful for you?',
        'goal', 'Fallback success criteria question.'
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
    name,
    slug,
    client_name,
    status
  )
  values (
    target_workspace_id,
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
    'Warm, neutral, researcher-like.',
    '[]'::jsonb,
    '[]'::jsonb,
    2
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
  jsonb,
  jsonb,
  integer,
  public.anonymity_mode
) from public, anon, authenticated;

grant execute on function public.create_project_with_defaults(
  uuid,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  integer,
  public.anonymity_mode
) to authenticated;
