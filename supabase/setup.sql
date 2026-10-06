-- ─────────────────────────────────────────────────────────────
-- Road to Shipping: database setup
-- Already applied to the project (migrations init_progress_sync +
-- harden_functions). Kept here as the readable reference. Safe to
-- re-run in Supabase → SQL Editor if you ever rebuild the project.
--
-- Every table is private to its owner: Row Level Security is on,
-- and each policy only allows rows where user_id is the signed-in
-- user. Nothing is granted to signed-out visitors.
-- ─────────────────────────────────────────────────────────────

-- Who someone is. Public sharing comes later (is_public).
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text unique,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- One row per task or checkpoint (the data-id in the content files).
create table if not exists public.progress (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id     text not null,
  done        boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- One row per task note.
create table if not exists public.notes (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id     text not null,
  body        text not null default '',
  updated_at  timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- Everything else that follows you between devices:
-- scratchpad, session log, close times. key = the app's state key.
create table if not exists public.user_state (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key         text not null,
  value       jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, key)
);

-- ─── Newest change wins ───
-- A device that was offline may send an older change after a newer
-- one already arrived from another device. Keep the newer row.
create or replace function public.keep_newest()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;
  return new;
end $$;

drop trigger if exists progress_keep_newest on public.progress;
create trigger progress_keep_newest before update on public.progress
  for each row execute function public.keep_newest();
drop trigger if exists notes_keep_newest on public.notes;
create trigger notes_keep_newest before update on public.notes
  for each row execute function public.keep_newest();
drop trigger if exists user_state_keep_newest on public.user_state;
create trigger user_state_keep_newest before update on public.user_state
  for each row execute function public.keep_newest();

-- ─── Privacy rules ───
alter table public.profiles   enable row level security;
alter table public.progress   enable row level security;
alter table public.notes      enable row level security;
alter table public.user_state enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Tables aren't exposed automatically in this project, so grant
-- exactly what the app uses, to signed-in users only.
revoke all on public.profiles, public.progress, public.notes, public.user_state from anon;
grant select, insert, update, delete on public.profiles, public.progress, public.notes, public.user_state to authenticated;

-- ─── Delete my account ───
-- Removes the sign-in and, through "on delete cascade", every row
-- above that belongs to it. Runs only for the signed-in user.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- rls_auto_enable() comes from the project's "automatic RLS" option.
-- It runs as an event trigger, which doesn't need EXECUTE, so nobody
-- should be able to call it through the API.
do $$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'rls_auto_enable') then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
