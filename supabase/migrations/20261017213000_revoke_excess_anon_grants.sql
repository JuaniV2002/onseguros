-- anon (the public key in config.json) still held Supabase's default
-- ALL-privileges grant on every content table. RLS blocked the writes, but the
-- grants were one bad policy away from an open table, and TRUNCATE ignores RLS.
--
-- What anon actually needs:
--   * SELECT on posts and faqs: get-posts-api, get-post-api, faq-api
--     (get-faqs-api) and get-faq-api query with SUPABASE_ANON_KEY.
--   * INSERT on subscribers: the landing newsletter POSTs to /rest/v1/subscribers
--     with `Prefer: return=minimal` (script.js).
-- Everything else (drafts, hints, the *_with_hint views, all writes) goes
-- through edge functions that use the service role.
--
-- Note: Supabase's default privileges grant ALL to anon on new public tables,
-- so a future table needs its own revoke.

revoke insert, update, delete, truncate, references, trigger
  on public.posts, public.faqs
  from anon;

revoke all
  on public.post_drafts, public.faq_drafts,
     public.topic_hints, public.faq_topic_hints,
     public.post_drafts_with_hint, public.faq_drafts_with_hint
  from anon;

revoke references, trigger on public.subscribers from anon;
