-- PDI Workspace · schema inicial
-- Execute no SQL Editor do Supabase.
-- As tabelas ficam com RLS habilitado desde o início.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'owner' check (role in ('owner', 'manager')),
  created_at timestamptz not null default now()
);

create table if not exists public.pdi_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  development_point text not null,
  objective text not null,
  action text not null,
  how text not null,
  expected_result text not null,
  deadline text,
  observation text,
  progress integer not null default 0 check (progress between 0 and 100),
  status text not null default 'Não iniciado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pdi_updates (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.pdi_tracks(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_label text,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pdi_history (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.pdi_tracks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_label text,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.pdi_tracks enable row level security;
alter table public.pdi_updates enable row level security;
alter table public.pdi_history enable row level security;

-- V1: nenhuma policy anônima é criada.
-- Isso evita que a Publishable Key permita editar o PDI diretamente.
-- A sincronização da V1 será feita server-side pela aplicação.
-- Quando migrarmos para Supabase Auth, adicionaremos policies para owner/manager.
