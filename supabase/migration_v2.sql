-- PDI Workspace V2
-- Checklist de execução + comentários/insights por trilha.
-- Execute este arquivo uma única vez no Supabase SQL Editor.

create table if not exists public.pdi_checklist_items (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.pdi_tracks(id) on delete cascade,
  content text not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.pdi_notes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.pdi_tracks(id) on delete cascade,
  author_label text,
  section text not null default 'general' check (section in ('action', 'general')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.pdi_checklist_items enable row level security;
alter table public.pdi_notes enable row level security;

create index if not exists pdi_checklist_items_track_id_idx
  on public.pdi_checklist_items(track_id);

create index if not exists pdi_notes_track_id_idx
  on public.pdi_notes(track_id);
