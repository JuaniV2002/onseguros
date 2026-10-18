-- Newsletter signup: anon may insert only the email column. subscribed_at and
-- confirmed come from column defaults (confirmed already defaults to true, so
-- behavior is unchanged until double opt-in exists).
-- Apply only after the script.js that sends just {email} is live; the old one
-- also sends subscribed_at/confirmed and would get 401/42501.
revoke insert on public.subscribers from anon;
grant insert (email) on public.subscribers to anon;

-- Two permissive INSERT policies did the same job: "Allow anon insert for
-- newsletter signup" (anon, with check true) and "Allow public inserts"
-- (role public, with check true). Keep the anon one; anon is the only client
-- role with an INSERT grant here, and service_role bypasses RLS.
drop policy if exists "Allow public inserts" on public.subscribers;
