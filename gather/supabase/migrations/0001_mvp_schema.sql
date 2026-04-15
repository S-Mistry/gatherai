create extension if not exists pgcrypto;

create schema if not exists app;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'interview_mode'
  ) then
    create type public.interview_mode as enum ('strict', 'adaptive');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'anonymity_mode'
  ) then
    create type public.anonymity_mode as enum ('named', 'pseudonymous', 'anonymous');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'session_status'
  ) then
    create type public.session_status as enum (
      'pre_start',
      'in_progress',
      'paused',
      'complete',
      'abandoned'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'analysis_job_type'
  ) then
    create type public.analysis_job_type as enum (
      'transcript_cleaning',
      'session_extraction',
      'quality_scoring',
      'project_synthesis'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'analysis_job_status'
  ) then
    create type public.analysis_job_status as enum (
      'queued',
      'processing',
      'completed',
      'failed'
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'transcript_speaker'
  ) then
    create type public.transcript_speaker as enum ('participant', 'agent', 'system');
  end if;
end;
$$;

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, user_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  client_name text not null,
  status text not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, slug)
);

create table if not exists public.project_config_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number integer not null,
  objective text not null,
  areas_of_interest jsonb not null default '[]'::jsonb,
  required_questions jsonb not null default '[]'::jsonb,
  background_context text,
  duration_cap_minutes integer not null check (duration_cap_minutes between 5 and 30),
  interview_mode public.interview_mode not null default 'strict',
  anonymity_mode public.anonymity_mode not null default 'pseudonymous',
  tone_style text not null default 'Warm, neutral, researcher-like.',
  metadata_prompts jsonb not null default '[]'::jsonb,
  prohibited_topics jsonb not null default '[]'::jsonb,
  follow_up_limit integer not null default 2,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, version_number)
);

create table if not exists public.project_public_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_config_version_id uuid not null references public.project_config_versions(id) on delete cascade,
  link_token text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  version text not null,
  prompt_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, key, version)
);

create table if not exists public.model_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  provider text not null,
  model_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, key, model_name)
);

create table if not exists public.participant_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  project_config_version_id uuid not null references public.project_config_versions(id) on delete cascade,
  public_link_id uuid not null references public.project_public_links(id) on delete cascade,
  respondent_label text not null,
  status public.session_status not null default 'pre_start',
  metadata jsonb not null default '{}'::jsonb,
  quality_flag boolean not null default false,
  excluded_from_synthesis boolean not null default false,
  runtime_state jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default timezone('utc', now()),
  last_activity_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  resume_expires_at timestamptz not null
);

create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.participant_sessions(id) on delete cascade,
  speaker public.transcript_speaker not null,
  content text not null,
  order_index integer not null,
  start_offset_ms integer,
  end_offset_ms integer,
  created_at timestamptz not null default timezone('utc', now()),
  unique (session_id, order_index)
);

create table if not exists public.session_outputs_generated (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.participant_sessions(id) on delete cascade,
  cleaned_transcript text not null,
  payload jsonb not null,
  prompt_version_id uuid references public.prompt_versions(id),
  model_version_id uuid references public.model_versions(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.session_output_overrides (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.participant_sessions(id) on delete cascade,
  edited_summary text not null default '',
  consultant_notes text not null default '',
  suppressed_claim_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_syntheses_generated (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  included_session_ids uuid[] not null default '{}',
  payload jsonb not null,
  prompt_version_id uuid references public.prompt_versions(id),
  model_version_id uuid references public.model_versions(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.project_synthesis_overrides (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  edited_narrative text not null default '',
  consultant_notes text not null default '',
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quality_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.participant_sessions(id) on delete cascade,
  overall numeric(5,4) not null check (overall >= 0 and overall <= 1),
  low_quality boolean not null default false,
  scorer_source text not null,
  dimensions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type public.analysis_job_type not null,
  status public.analysis_job_status not null default 'queued',
  project_id uuid references public.projects(id) on delete cascade,
  session_id uuid references public.participant_sessions(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz not null default timezone('utc', now()),
  claimed_by text,
  claimed_at timestamptz,
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_projects_workspace on public.projects (workspace_id);
create index if not exists idx_project_config_versions_project on public.project_config_versions (project_id, version_number desc);
create index if not exists idx_project_public_links_project on public.project_public_links (project_id);
create index if not exists idx_participant_sessions_project on public.participant_sessions (project_id, status);
create index if not exists idx_participant_sessions_resume on public.participant_sessions (resume_expires_at);
create index if not exists idx_transcript_segments_session on public.transcript_segments (session_id, order_index);
create index if not exists idx_project_syntheses_project on public.project_syntheses_generated (project_id, created_at desc);
create index if not exists idx_analysis_jobs_status_next_attempt on public.analysis_jobs (status, next_attempt_at);
create index if not exists idx_analysis_jobs_project on public.analysis_jobs (project_id);
create index if not exists idx_analysis_jobs_session on public.analysis_jobs (session_id);
create index if not exists idx_audit_logs_workspace on public.audit_logs (workspace_id, created_at desc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function app.set_updated_at();

create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function app.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function app.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_name text;
  new_workspace_id uuid;
begin
  workspace_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'workspace_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    split_part(new.email, '@', 1),
    'Consultant workspace'
  );

  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  insert into public.workspaces (name, owner_user_id)
  values (workspace_name, new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function app.has_workspace_access(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function app.has_project_access(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = target_project_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function app.has_session_access(target_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.participant_sessions ps
    join public.projects p on p.id = ps.project_id
    join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where ps.id = target_session_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function app.claim_analysis_jobs(worker_name text default 'worker', max_jobs integer default 4)
returns setof public.analysis_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select j.id
    from public.analysis_jobs j
    where j.status = 'queued'
      and j.next_attempt_at <= timezone('utc', now())
    order by j.next_attempt_at asc, j.created_at asc
    for update skip locked
    limit max_jobs
  )
  update public.analysis_jobs jobs
  set status = 'processing',
      claimed_by = worker_name,
      claimed_at = timezone('utc', now())
  where jobs.id in (select id from claimed)
  returning jobs.*;
end;
$$;

create or replace function app.release_stale_analysis_jobs(lock_timeout_minutes integer default 15)
returns setof public.analysis_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.analysis_jobs jobs
  set status = case
        when jobs.attempts + 1 >= jobs.max_attempts then 'failed'
        else 'queued'
      end,
      attempts = jobs.attempts + 1,
      next_attempt_at = timezone('utc', now()) + interval '5 minutes',
      claimed_by = null,
      claimed_at = null,
      last_error = coalesce(jobs.last_error, 'Recovered by cron sweep after stale processing lock')
  where jobs.status = 'processing'
    and jobs.claimed_at is not null
    and jobs.claimed_at < timezone('utc', now()) - make_interval(mins => lock_timeout_minutes)
  returning jobs.*;
end;
$$;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_config_versions enable row level security;
alter table public.project_public_links enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.model_versions enable row level security;
alter table public.participant_sessions enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.session_outputs_generated enable row level security;
alter table public.session_output_overrides enable row level security;
alter table public.project_syntheses_generated enable row level security;
alter table public.project_synthesis_overrides enable row level security;
alter table public.quality_scores enable row level security;
alter table public.analysis_jobs enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
using (auth.uid() = user_id);

create policy "profiles_update_self"
on public.profiles
for update
using (auth.uid() = user_id);

create policy "workspaces_member_access"
on public.workspaces
for select
using (app.has_workspace_access(id));

create policy "workspace_members_member_access"
on public.workspace_members
for select
using (app.has_workspace_access(workspace_id));

create policy "projects_member_access"
on public.projects
for all
using (app.has_workspace_access(workspace_id))
with check (app.has_workspace_access(workspace_id));

create policy "project_config_versions_member_access"
on public.project_config_versions
for all
using (app.has_project_access(project_id))
with check (app.has_project_access(project_id));

create policy "project_public_links_member_access"
on public.project_public_links
for all
using (app.has_project_access(project_id))
with check (app.has_project_access(project_id));

create policy "prompt_versions_member_access"
on public.prompt_versions
for all
using (app.has_workspace_access(workspace_id))
with check (app.has_workspace_access(workspace_id));

create policy "model_versions_member_access"
on public.model_versions
for all
using (app.has_workspace_access(workspace_id))
with check (app.has_workspace_access(workspace_id));

create policy "participant_sessions_member_access"
on public.participant_sessions
for all
using (app.has_project_access(project_id))
with check (app.has_project_access(project_id));

create policy "transcript_segments_member_access"
on public.transcript_segments
for all
using (app.has_session_access(session_id))
with check (app.has_session_access(session_id));

create policy "session_outputs_generated_member_access"
on public.session_outputs_generated
for all
using (app.has_session_access(session_id))
with check (app.has_session_access(session_id));

create policy "session_output_overrides_member_access"
on public.session_output_overrides
for all
using (app.has_session_access(session_id))
with check (app.has_session_access(session_id));

create policy "project_syntheses_generated_member_access"
on public.project_syntheses_generated
for all
using (app.has_project_access(project_id))
with check (app.has_project_access(project_id));

create policy "project_synthesis_overrides_member_access"
on public.project_synthesis_overrides
for all
using (app.has_project_access(project_id))
with check (app.has_project_access(project_id));

create policy "quality_scores_member_access"
on public.quality_scores
for all
using (app.has_session_access(session_id))
with check (app.has_session_access(session_id));

create policy "analysis_jobs_member_access"
on public.analysis_jobs
for all
using (
  (project_id is not null and app.has_project_access(project_id))
  or (session_id is not null and app.has_session_access(session_id))
)
with check (
  (project_id is not null and app.has_project_access(project_id))
  or (session_id is not null and app.has_session_access(session_id))
);

create policy "audit_logs_member_access"
on public.audit_logs
for select
using (app.has_workspace_access(workspace_id));
