-- Recreate draft views with SECURITY INVOKER so they respect the querying
-- user's RLS policies instead of running as the view creator (SECURITY DEFINER).

create or replace view post_drafts_with_hint
  with (security_invoker = true)
as
select
  d.*,
  h.hint as hint_text,
  h.created_at as hint_created_at
from post_drafts d
left join topic_hints h on h.id = d.hint_id;

create or replace view faq_drafts_with_hint
  with (security_invoker = true)
as
select
  d.*,
  h.hint as hint_text,
  h.created_at as hint_created_at
from faq_drafts d
left join faq_topic_hints h on h.id = d.hint_id;
