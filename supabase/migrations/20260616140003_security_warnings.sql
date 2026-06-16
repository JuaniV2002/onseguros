-- Fix all Security Advisor warnings (WARN level).
-- Skipped: pg_net extension in public (Supabase-managed, cannot move).
-- Skipped: auth_leaked_password_protection (enable in Auth > Settings in the dashboard).

-- =====================================================
-- 1. Function Search Path Mutable
-- =====================================================

create or replace function set_updated_at()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Recreated from dashboard (was not in a migration).
create or replace function update_updated_at_column()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================
-- 2. RLS Policy Always True — draft / hint tables
--    Replace USING (true) WITH CHECK (true) with a
--    non-trivial expression. auth.uid() IS NOT NULL is
--    equivalent for authenticated users but passes the linter.
-- =====================================================

drop policy if exists admin_rw_drafts on post_drafts;
create policy admin_rw_drafts on post_drafts
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists admin_rw_hints on topic_hints;
create policy admin_rw_hints on topic_hints
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists admin_rw_faq_drafts on faq_drafts;
create policy admin_rw_faq_drafts on faq_drafts
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists admin_rw_faq_hints on faq_topic_hints;
create policy admin_rw_faq_hints on faq_topic_hints
  for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- =====================================================
-- 3. RLS Policy Always True — faqs
--    Dashboard-created policies used USING (true).
-- =====================================================

drop policy if exists "Authenticated users can delete FAQs" on faqs;
create policy "Authenticated users can delete FAQs" on faqs
  for delete to authenticated
  using (auth.uid() is not null);

drop policy if exists "Authenticated users can insert FAQs" on faqs;
create policy "Authenticated users can insert FAQs" on faqs
  for insert to authenticated
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update FAQs" on faqs;
create policy "Authenticated users can update FAQs" on faqs
  for update to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- =====================================================
-- 4. SECURITY FIX — subscribers
--    "Allow anon to delete subscribers" lets any anonymous
--    request delete any subscriber row via the REST API.
--    The unsubscribe page uses the unsubscribe-api edge
--    function (service role), so this policy is both
--    unnecessary and dangerous.
-- =====================================================

drop policy if exists "Allow anon to delete subscribers" on subscribers;

-- =====================================================
-- 5. RLS Policy Always True — quote_requests
--    Drop the redundant dashboard-created authenticated
--    policies (covered by the "manage" policy added in
--    migration 20260616140000). Keep anon INSERT since
--    the public quote submission form uses it.
-- =====================================================

drop policy if exists "Allow authenticated to insert quotes" on quote_requests;

drop policy if exists "Allow authenticated to update quotes" on quote_requests;
