-- ============================================================
-- Dead Air: Documents + Hint unlock system
-- Run this in your Supabase SQL editor AFTER schema.sql
-- ============================================================

-- 1. Documents catalogue (case files + hint files)
create table if not exists public.documents (
  id          text primary key,                 -- e.g. "case-01", "hint-01"
  type        text not null check (type in ('case', 'hint')),
  title       text not null,
  description text not null default '',
  storage_path text not null,                   -- path inside 'game-resources' bucket
  passcode    text not null,                    -- passcode required to unlock (hints only)
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

-- Admins (authenticated) can read/write; team access goes through server routes.
alter table public.documents enable row level security;
create policy "Admins can manage documents" on public.documents
  for all to authenticated using (true) with check (true);

-- 2. Team unlock records (which team has unlocked which document)
create table if not exists public.team_unlocks (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  document_id text not null references public.documents(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique(team_id, document_id)
);

alter table public.team_unlocks enable row level security;
create policy "Admins can read unlocks" on public.team_unlocks
  for select to authenticated using (true);

-- ============================================================
-- 3. Seed the 4 case files and 4 hint slots
--    Replace storage_path values after you upload actual files.
--    Case files have NO passcode (always visible); set passcode='' or any placeholder.
--    Hint files require a passcode to unlock.
-- ============================================================

insert into public.documents (id, type, title, description, storage_path, passcode, sort_order) values
  -- CASE FILES (passcode is unused for case files; teams always see them)
  ('case-01', 'case', 'The Last Minute',        'Off-air transcript of the final broadcast.',        'case-files/case-01.pdf', '', 1),
  ('case-02', 'case', 'The Ghost Carrier',       'Signal lab analysis of the anomalous frequency.',   'case-files/case-02.pdf', '', 2),
  ('case-03', 'case', 'Room Zero',               'Facilities access audit and CCTV anomaly report.',  'case-files/case-03.pdf', '', 3),
  ('case-04', 'case', 'The Final Transmission',  'Isolated archive — Adrian''s last log.',            'case-files/case-04.pdf', '', 4),
  -- HINT FILES (teams must enter the correct passcode to unlock)
  ('hint-01', 'hint', 'The Red Ledger',          'Personnel sign-out log — something is wrong.',      'hint-files/hint-01.pdf', 'REDINK',    1),
  ('hint-02', 'hint', 'The Silent Room',         'True facility schematic with the hidden route.',    'hint-files/hint-02.pdf', 'ZERODOOR',  2),
  ('hint-03', 'hint', 'The Vanishing Voice',     'Audio recovery — what did Adrian actually say?',    'hint-files/hint-03.pdf', 'CARRIER',   3),
  ('hint-04', 'hint', 'The Meridian Vector',     'Distribution routing map — the viral path.',        'hint-files/hint-04.pdf', 'VECTOR47',  4)
on conflict (id) do nothing;
