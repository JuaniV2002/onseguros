-- FAQ AI draft pipeline (mirrors weekly_drafts migration shape).
-- Tables: faq_topic_hints, faq_drafts
-- Status enum, RLS, indexes, helper view, pg_cron note.

-- =====================================================
-- Enums
-- =====================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'faq_draft_status') then
    create type faq_draft_status as enum ('pending','edited','published','discarded','failed');
  end if;
end $$;

-- =====================================================
-- Tables
-- =====================================================
create table if not exists faq_topic_hints (
  id uuid primary key default gen_random_uuid(),
  hint text not null check (length(hint) between 3 and 500),
  source text not null default 'admin',
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by_draft_id uuid
);
create index if not exists faq_topic_hints_unused_idx
  on faq_topic_hints (created_at desc) where used_at is null;

create table if not exists faq_drafts (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null check (category in ('general','cobertura','cotizacion','art','siniestro','vehiculos')),
  hint_id uuid references faq_topic_hints(id) on delete set null,
  status faq_draft_status not null default 'pending',
  publish_token text not null,
  generated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_to_admin_at timestamptz,
  published_at timestamptz,
  published_faq_id uuid,
  generation_metadata jsonb,
  error_message text
);
create index if not exists faq_drafts_status_idx on faq_drafts (status, generated_at desc);

-- Backfill cross-reference now that both tables exist
do $$
begin
  if not exists (
    select 1 from information_schema.referential_constraints
    where constraint_name = 'faq_topic_hints_used_by_draft_id_fkey'
  ) then
    alter table faq_topic_hints
      add constraint faq_topic_hints_used_by_draft_id_fkey
      foreign key (used_by_draft_id) references faq_drafts(id) on delete set null;
  end if;
end $$;

-- =====================================================
-- updated_at trigger (reuses set_updated_at() from weekly_drafts migration).
-- The function is created with create-or-replace there; binding a new trigger
-- to it is safe even when run independently.
-- =====================================================
drop trigger if exists faq_drafts_updated_at on faq_drafts;
create trigger faq_drafts_updated_at
  before update on faq_drafts
  for each row execute function set_updated_at();

-- =====================================================
-- RLS — same shape as post_drafts/topic_hints.
-- =====================================================
alter table faq_drafts enable row level security;
alter table faq_topic_hints enable row level security;

drop policy if exists admin_rw_faq_drafts on faq_drafts;
create policy admin_rw_faq_drafts on faq_drafts
  for all to authenticated
  using (true) with check (true);

drop policy if exists admin_rw_faq_hints on faq_topic_hints;
create policy admin_rw_faq_hints on faq_topic_hints
  for all to authenticated
  using (true) with check (true);

-- =====================================================
-- Helper view: drafts joined with their hint text
-- =====================================================
create or replace view faq_drafts_with_hint as
select
  d.*,
  h.hint as hint_text,
  h.created_at as hint_created_at
from faq_drafts d
left join faq_topic_hints h on h.id = d.hint_id;

-- =====================================================
-- pg_cron / pg_net (run separately in Studio SQL editor; same caveats as
-- the weekly draft cron — these need superuser-equivalent privilege).
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

-- NOTE — schedule the bi-weekly job manually. Cron `0 11 */14 * *` drifts at
-- month boundaries (it fires on the 1st, 15th, 29th of each month, not every
-- 14 days). Acceptable for editorial cadence; the function's own 13-day open-
-- draft guard keeps duplicate generation in check.
--
-- select cron.schedule(
--   'biweekly-faq-draft',
--   '0 11 */14 * *',
--   $cron$
--     select net.http_post(
--       url := 'https://tgokvwuiiglioegxgcpu.supabase.co/functions/v1/generate-faq-draft',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'x-webhook-secret', current_setting('app.webhook_secret', true)
--       ),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 120000
--     );
--   $cron$
-- );
