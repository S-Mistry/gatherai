create or replace function public.claim_analysis_jobs(worker_name text default 'worker', max_jobs integer default 4)
returns setof public.analysis_jobs
language sql
security definer
set search_path = public
as $$
  select * from app.claim_analysis_jobs(worker_name, max_jobs);
$$;

create or replace function public.release_stale_analysis_jobs(lock_timeout_minutes integer default 15)
returns setof public.analysis_jobs
language sql
security definer
set search_path = public
as $$
  select * from app.release_stale_analysis_jobs(lock_timeout_minutes);
$$;

revoke all on function public.claim_analysis_jobs(text, integer) from public, anon, authenticated;
revoke all on function public.release_stale_analysis_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_analysis_jobs(text, integer) to service_role;
grant execute on function public.release_stale_analysis_jobs(integer) to service_role;
