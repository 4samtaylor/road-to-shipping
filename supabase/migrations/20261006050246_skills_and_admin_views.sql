-- Applied through the Supabase connector on 2026-10-06 (version 20261006050246).
-- Earlier migrations init_progress_sync + harden_functions are summarised in ../setup.sql.

-- Skill levels per cheat-sheet concept (content/glossary.json ids):
-- 0 = not started, 1 = practiced, 2 = solid.
create table if not exists public.skills (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  skill_id    text not null,
  level       smallint not null default 0 check (level between 0 and 2),
  updated_at  timestamptz not null default now(),
  primary key (user_id, skill_id)
);

drop trigger if exists skills_keep_newest on public.skills;
create trigger skills_keep_newest before update on public.skills
  for each row execute function public.keep_newest();

alter table public.skills enable row level security;
drop policy if exists "own skills" on public.skills;
create policy "own skills" on public.skills for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.skills from anon;
grant select, insert, update, delete on public.skills to authenticated;

-- Admin views: Supabase dashboard only. The admin schema isn't exposed
-- through the API and only the database owner can read it.
create schema if not exists admin;
revoke all on schema admin from public, anon, authenticated;

create or replace view admin.user_overview as
select
  u.email,
  u.created_at::date                                                    as joined,
  u.last_sign_in_at                                                     as last_sign_in,
  (select count(*) from public.progress p
     where p.user_id = u.id and p.done and p.item_id not like 'cp-%')   as tasks_done,
  (select count(*) from public.progress p
     where p.user_id = u.id and p.done and p.item_id like 'cp-%')       as checkpoints_done,
  (select count(*) from public.notes n
     where n.user_id = u.id and n.body <> '')                           as notes,
  (select count(*) from public.skills k where k.user_id = u.id and k.level = 1) as skills_practiced,
  (select count(*) from public.skills k where k.user_id = u.id and k.level = 2) as skills_solid,
  (select make_interval(secs => coalesce(sum((s.value #>> '{}')::numeric), 0))
     from public.user_state s
     where s.user_id = u.id and s.key like '\_time:%'
       and jsonb_typeof(s.value) = 'number')                            as time_spent,
  (select count(*) from public.user_state s, jsonb_object_keys(
       case when jsonb_typeof(s.value) = 'object' then s.value else '{}'::jsonb end)
     where s.user_id = u.id and s.key = '_log')                         as days_logged,
  greatest(
    (select max(updated_at) from public.progress   where user_id = u.id),
    (select max(updated_at) from public.notes      where user_id = u.id),
    (select max(updated_at) from public.skills     where user_id = u.id),
    (select max(updated_at) from public.user_state where user_id = u.id)) as last_activity,
  u.id                                                                  as user_id
from auth.users u
order by u.created_at;

create or replace view admin.user_activity as
select u.email, a.kind, a.item, a.value, a.updated_at
from (
  select user_id, 'progress'::text as kind, item_id as item,
         case when done then 'done' else 'not done' end as value, updated_at
    from public.progress
  union all
  select user_id, 'note', item_id, left(body, 200), updated_at from public.notes
  union all
  select user_id, 'skill', skill_id,
         case level when 2 then 'solid' when 1 then 'practiced' else 'not started' end, updated_at
    from public.skills
  union all
  select user_id, 'state', key, left(value::text, 200), updated_at from public.user_state
) a
join auth.users u on u.id = a.user_id
order by a.updated_at desc;

revoke all on all tables in schema admin from public, anon, authenticated;
