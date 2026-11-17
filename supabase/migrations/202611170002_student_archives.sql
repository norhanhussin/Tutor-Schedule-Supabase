alter table public.students
    add column if not exists archived_periods jsonb not null default '[]'::jsonb;
