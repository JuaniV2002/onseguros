-- The admin panel only talks to edge functions (service role) and Supabase
-- Auth; it never queries tables with the user's JWT. Any account that can sign
-- up gets the `authenticated` role, so it must not be able to read or write
-- tables through PostgREST.
revoke all on all tables in schema public from authenticated;

-- New tables start closed: Supabase's default privileges grant ALL to anon and
-- authenticated on every new table. From now on a table that needs public
-- access (e.g. anon SELECT on posts/faqs) must grant it explicitly in its
-- migration. Only covers objects created by `postgres` (migrations, SQL
-- editor); `supabase_admin`'s defaults can't be changed from this role.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
