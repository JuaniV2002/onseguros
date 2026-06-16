-- Enable RLS on quote_requests (was left without it when table was created via dashboard).
-- All public-facing inserts go through submit/send-quote edge functions (service role bypasses RLS).
-- Admin reads/updates go through get-quotes-api and update-quote-status-api (service role).
-- Authenticated policy is belt-and-suspenders for any future direct admin access.

alter table quote_requests enable row level security;

create policy "Authenticated users can manage quote_requests"
  on quote_requests
  for all
  using (auth.role() = 'authenticated');
