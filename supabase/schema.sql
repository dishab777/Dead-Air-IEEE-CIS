-- Minimal Echo game schema. Admin identities use Supabase Auth; no password table.
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  password_code text not null unique,
  progress_status jsonb not null default '"Not started"'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.teams alter column progress_status set default '{"status":"Registered","winner":false}'::jsonb;

alter table public.teams enable row level security;
-- Authenticated users are event admins. Team access and mutations go through server routes.
create policy "Admins can read teams" on public.teams
  for select to authenticated using (true);
-- Browser realtime subscriptions require SELECT permission. Server writes use service role.
grant select on public.teams to authenticated;

-- Add teams to Realtime only once.
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'teams') then
    alter publication supabase_realtime add table public.teams;
  end if;
end $$;

-- Private object storage lets admins upload supplemental case files without adding app tables.
insert into storage.buckets (id, name, public, file_size_limit)
values ('game-resources', 'game-resources', false, 15728640)
on conflict (id) do update set public = false, file_size_limit = 15728640;
