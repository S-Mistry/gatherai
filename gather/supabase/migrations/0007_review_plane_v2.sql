do $$
declare
  session_output_constraint text;
begin
  select conname
  into session_output_constraint
  from pg_constraint
  where conrelid = 'public.session_outputs_generated'::regclass
    and contype = 'u'
    and conkey = array[
      (
        select attnum
        from pg_attribute
        where attrelid = 'public.session_outputs_generated'::regclass
          and attname = 'session_id'
      )
    ]::smallint[];

  if session_output_constraint is not null then
    execute format(
      'alter table public.session_outputs_generated drop constraint %I',
      session_output_constraint
    );
  end if;
end;
$$;

create index if not exists idx_session_outputs_generated_session_created
on public.session_outputs_generated (session_id, created_at desc);

alter table public.participant_sessions
  add column if not exists manual_quality_flag boolean,
  add column if not exists quality_override_note text not null default '',
  add column if not exists quality_override_updated_at timestamptz;
