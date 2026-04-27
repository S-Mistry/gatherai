alter table public.projects
drop constraint if exists projects_project_type_check;

alter table public.projects
add constraint projects_project_type_check
check (project_type in ('discovery', 'feedback', 'testimonial'));

create table if not exists public.testimonial_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  link_token text not null unique,
  business_name text not null,
  website_url text not null,
  brand_color text not null default '#b45f3a',
  headline text not null default 'Leave a review',
  prompt text not null default 'Tell us about your experience.',
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.testimonial_reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  testimonial_link_id uuid not null references public.testimonial_links(id) on delete cascade,
  transcript text not null,
  reviewer_name text,
  suggested_rating integer check (suggested_rating between 1 and 5),
  rating integer not null check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_testimonial_links_project
on public.testimonial_links (project_id, created_at desc);

create index if not exists idx_testimonial_reviews_project_status
on public.testimonial_reviews (project_id, status, created_at desc);

create index if not exists idx_testimonial_reviews_link
on public.testimonial_reviews (testimonial_link_id, created_at desc);

drop trigger if exists set_testimonial_links_updated_at on public.testimonial_links;

create trigger set_testimonial_links_updated_at
before update on public.testimonial_links
for each row execute function app.set_updated_at();

drop trigger if exists set_testimonial_reviews_updated_at on public.testimonial_reviews;

create trigger set_testimonial_reviews_updated_at
before update on public.testimonial_reviews
for each row execute function app.set_updated_at();

alter table public.testimonial_links enable row level security;
alter table public.testimonial_reviews enable row level security;

drop policy if exists "testimonial_links_member_access"
on public.testimonial_links;

create policy "testimonial_links_member_access"
on public.testimonial_links
for all
using (app.has_project_access(project_id))
with check (app.has_project_access(project_id));

drop policy if exists "testimonial_reviews_member_access"
on public.testimonial_reviews;

create policy "testimonial_reviews_member_access"
on public.testimonial_reviews
for all
using (app.has_project_access(project_id))
with check (app.has_project_access(project_id));

create or replace function public.create_project_with_defaults(
  target_workspace_id uuid,
  project_project_type text,
  project_name text,
  project_slug text,
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
    when project_project_type = 'discovery' then 'discovery'
    when project_project_type = 'testimonial' then 'testimonial'
    else 'feedback'
  end;
  normalized_project_name text := coalesce(nullif(trim(project_name), ''), 'Untitled project');
  normalized_project_slug text := nullif(trim(project_slug), '');
  normalized_objective text := coalesce(
    nullif(trim(project_objective), ''),
    case
      when normalized_project_type = 'testimonial'
        then 'Collect short voice testimonials that can be reviewed and embedded on a website.'
      when normalized_project_type = 'feedback'
        then 'Capture what landed, what missed, and what should change after the experience.'
      else 'Understand the friction, contradictions, and decisions the upcoming workshop or program needs to address.'
    end
  );
  normalized_duration_cap_minutes integer := coalesce(
    project_duration_cap_minutes,
    case
      when normalized_project_type = 'discovery' then 15
      else 6
    end
  );
  normalized_anonymity_mode public.anonymity_mode := coalesce(
    project_anonymity_mode,
    case
      when normalized_project_type = 'discovery'
        then 'pseudonymous'::public.anonymity_mode
      else 'anonymous'::public.anonymity_mode
    end
  );
  normalized_tone_style text := coalesce(
    nullif(trim(project_tone_style), ''),
    case
      when normalized_project_type = 'testimonial'
        then 'Warm, simple, direct.'
      when normalized_project_type = 'feedback'
        then 'Warm, concise, reflective, researcher-like.'
      else 'Warm, neutral, researcher-like.'
    end
  );
  normalized_follow_up_limit integer := greatest(
    1,
    least(coalesce(project_follow_up_limit, 1), 2)
  );
  normalized_areas_of_interest jsonb := case
    when jsonb_typeof(project_areas_of_interest) = 'array'
      and jsonb_array_length(project_areas_of_interest) > 0
      then project_areas_of_interest
    when normalized_project_type = 'testimonial'
      then jsonb_build_array('Customer experience', 'Proof points', 'Review quote')
    when normalized_project_type = 'feedback'
      then jsonb_build_array(
        'What worked well',
        'What felt unclear, frustrating, or missing',
        'What happened afterwards',
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
    when normalized_project_type = 'testimonial'
      then jsonb_build_array(
        jsonb_build_object(
          'id', 'q-default-1',
          'prompt', 'Tell us about your experience.',
          'goal', 'Collect a short testimonial.'
        )
      )
    when normalized_project_type = 'feedback'
      then jsonb_build_array(
        jsonb_build_object(
          'id', 'q-default-1',
          'prompt', 'What part of the experience felt most useful or positive to you?',
          'goal', 'Mode starter question.'
        ),
        jsonb_build_object(
          'id', 'q-default-2',
          'prompt', 'What felt unclear, frustrating, or less useful?',
          'goal', 'Mode starter question.'
        ),
        jsonb_build_object(
          'id', 'q-default-3',
          'prompt', 'What happened afterwards, if anything?',
          'goal', 'Mode starter question.'
        ),
        jsonb_build_object(
          'id', 'q-default-4',
          'prompt', 'If we improved this experience, what should we change?',
          'goal', 'Mode starter question.'
        )
      )
    else jsonb_build_array(
      jsonb_build_object(
        'id', 'q-default-1',
        'prompt', 'What would make this workshop or program useful for you?',
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
    status
  )
  values (
    target_workspace_id,
    normalized_project_type,
    normalized_project_name,
    normalized_project_slug,
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
    greatest(5, least(normalized_duration_cap_minutes, 30)),
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
  jsonb,
  jsonb,
  integer,
  public.anonymity_mode,
  text,
  integer
) to authenticated;
