-- Newsletter emails are PII. The anon SELECT policy let anyone holding the
-- public anon key dump every subscriber via PostgREST. Admin reads/deletes now
-- go through get-subscribers-api / delete-subscribers-api (logged-in user check
-- + service role), and send-newsletter-api / unsubscribe-api already use the
-- service role, so anon only needs INSERT for the public signup forms.
--
-- The signup forms POST with `Prefer: return=minimal`, which needs INSERT only
-- (no SELECT privilege, no SELECT policy) — verified against prod in a
-- rolled-back transaction before applying.

drop policy if exists "Allow anon to read subscribers" on public.subscribers;

revoke select, update, delete, truncate on public.subscribers from anon;
