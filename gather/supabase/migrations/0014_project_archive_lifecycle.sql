alter table public.projects
add column if not exists archived_at timestamptz,
add column if not exists archived_by_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_projects_workspace_archived
on public.projects (workspace_id, archived_at, updated_at desc);
