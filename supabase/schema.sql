-- Schema de referência para a próxima etapa.
-- NÃO é necessário executar para a V1 local.

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
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pdi_history (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.pdi_tracks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  label text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
