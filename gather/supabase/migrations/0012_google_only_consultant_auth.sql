create or replace function app.current_user_has_google_provider()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() -> 'app_metadata' -> 'providers') ? 'google', false)
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'provider', '') = 'google';
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_email text;
begin
  profile_email := coalesce(nullif(new.email, ''), concat(new.id::text, '@unknown.local'));

  if exists (
    select 1
    from public.profiles p
    where p.email = profile_email
      and p.user_id <> new.id
  ) then
    profile_email := concat(new.id::text, '+', profile_email);
  end if;

  insert into public.profiles (user_id, email, full_name)
  values (new.id, profile_email, new.raw_user_meta_data ->> 'full_name')
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

create or replace function public.ensure_consultant_workspace(
  requested_workspace_name text default null,
  requested_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  profile_email text;
  workspace_name text;
  existing_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Consultant authentication is required.';
  end if;

  if not app.current_user_has_google_provider() then
    raise exception 'Google sign-in is required for consultant access.';
  end if;

  select email
    into current_email
    from auth.users
   where id = current_user_id;

  profile_email := coalesce(
    nullif(current_email, ''),
    concat(current_user_id::text, '@unknown.local')
  );

  if exists (
    select 1
    from public.profiles p
    where p.email = profile_email
      and p.user_id <> current_user_id
  ) then
    profile_email := concat(current_user_id::text, '+', profile_email);
  end if;

  workspace_name := coalesce(
    nullif(trim(requested_workspace_name), ''),
    nullif(trim(requested_full_name), ''),
    nullif(split_part(profile_email, '@', 1), ''),
    'Consultant workspace'
  );

  insert into public.profiles (user_id, email, full_name)
  values (current_user_id, profile_email, nullif(trim(requested_full_name), ''))
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  select id
    into existing_workspace_id
    from public.workspaces
   where owner_user_id = current_user_id
   order by created_at asc
   limit 1;

  if existing_workspace_id is null then
    insert into public.workspaces (name, owner_user_id)
    values (workspace_name, current_user_id)
    returning id into existing_workspace_id;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (existing_workspace_id, current_user_id, 'owner')
  on conflict (workspace_id, user_id) do update
    set role = excluded.role;

  return existing_workspace_id;
end;
$$;

grant execute on function public.ensure_consultant_workspace(text, text) to authenticated;

create or replace function app.has_workspace_access(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.current_user_has_google_provider()
    and exists (
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
  select app.current_user_has_google_provider()
    and exists (
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
  select app.current_user_has_google_provider()
    and exists (
      select 1
      from public.participant_sessions ps
      join public.projects p on p.id = ps.project_id
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
      where ps.id = target_session_id
        and wm.user_id = auth.uid()
    );
$$;
