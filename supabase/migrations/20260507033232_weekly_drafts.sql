-- Weekly AI blog draft pipeline
-- Tables: topic_hints, post_drafts
-- Status enum, RLS, indexes
-- pg_cron + pg_net scheduling lives in a separate, runtime-only block at the bottom

-- =====================================================
-- Enums
-- =====================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'post_draft_status') then
    create type post_draft_status as enum ('pending','edited','published','discarded','failed');
  end if;
end $$;

-- =====================================================
-- Tables
-- =====================================================
create table if not exists topic_hints (
  id uuid primary key default gen_random_uuid(),
  hint text not null check (length(hint) between 3 and 500),
  source text not null default 'admin',
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by_draft_id uuid
);
create index if not exists topic_hints_unused_idx
  on topic_hints (created_at desc) where used_at is null;

create table if not exists post_drafts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null,
  description text not null,
  content text not null,
  hint_id uuid references topic_hints(id) on delete set null,
  status post_draft_status not null default 'pending',
  publish_token text not null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_to_admin_at timestamptz,
  published_at timestamptz,
  published_post_id uuid,
  generation_metadata jsonb,
  error_message text
);
create index if not exists post_drafts_status_idx on post_drafts (status, generated_at desc);
create unique index if not exists post_drafts_slug_idx on post_drafts (slug);

-- Backfill cross-reference now that both tables exist
do $$
begin
  if not exists (
    select 1 from information_schema.referential_constraints
    where constraint_name = 'topic_hints_used_by_draft_id_fkey'
  ) then
    alter table topic_hints
      add constraint topic_hints_used_by_draft_id_fkey
      foreign key (used_by_draft_id) references post_drafts(id) on delete set null;
  end if;
end $$;

-- =====================================================
-- updated_at trigger for post_drafts
-- =====================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists post_drafts_updated_at on post_drafts;
create trigger post_drafts_updated_at
  before update on post_drafts
  for each row execute function set_updated_at();

-- =====================================================
-- RLS
-- Service role bypasses RLS automatically.
-- Authenticated admin (only Mariano has a Supabase user) can read/write.
-- Anon has no access — edge functions use service-role key for all reads.
-- =====================================================
alter table post_drafts enable row level security;
alter table topic_hints enable row level security;

drop policy if exists admin_rw_drafts on post_drafts;
create policy admin_rw_drafts on post_drafts
  for all to authenticated
  using (true) with check (true);

drop policy if exists admin_rw_hints on topic_hints;
create policy admin_rw_hints on topic_hints
  for all to authenticated
  using (true) with check (true);

-- =====================================================
-- Helper view: drafts with their associated hint text
-- =====================================================
create or replace view post_drafts_with_hint as
select
  d.*,
  h.hint as hint_text,
  h.created_at as hint_created_at
from post_drafts d
left join topic_hints h on h.id = d.hint_id;

-- =====================================================
-- pg_cron + pg_net (run once, separately, in Studio SQL editor).
-- These statements need superuser-equivalent privilege on Supabase managed
-- Postgres. Wrap in DO block so the migration doesn't hard-fail if a fresh
-- environment can't enable extensions.
-- =====================================================
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron extension not enabled here: %', sqlerrm;
  end;

  begin
    create extension if not exists pg_net;
  exception when others then
    raise notice 'pg_net extension not enabled here: %', sqlerrm;
  end;
end $$;

-- NOTE — schedule the weekly Friday 11:00 UTC (08:00 ART) job manually:
--
-- select cron.schedule(
--   'weekly-blog-draft',
--   '0 11 * * 5',
--   $cron$
--     select net.http_post(
--       url := 'https://tgokvwuiiglioegxgcpu.supabase.co/functions/v1/generate-weekly-draft',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'x-webhook-secret', current_setting('app.webhook_secret', true)
--       ),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 120000
--     );
--   $cron$
-- );
--
-- Set the secret before scheduling (run once as superuser/Studio SQL):
--   alter database postgres set app.webhook_secret = '<value of WEBHOOK_SECRET edge fn secret>';
--
-- If `alter database ... set` is blocked, replace `current_setting(...)` in the
-- cron command with the literal secret string.
