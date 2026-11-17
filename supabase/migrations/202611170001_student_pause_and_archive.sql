alter table public.students
    add column if not exists is_paused boolean not null default false,
    add column if not exists paused_periods jsonb not null default '[]'::jsonb,
    add column if not exists archived_periods jsonb not null default '[]'::jsonb,
    add column if not exists deleted_at date;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'students_paused_periods_is_array'
          and conrelid = 'public.students'::regclass
    ) then
        alter table public.students
            add constraint students_paused_periods_is_array
            check (jsonb_typeof(paused_periods) = 'array');
    end if;
end
$$;
