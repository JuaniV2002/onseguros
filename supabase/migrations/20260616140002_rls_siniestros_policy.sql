-- siniestros had RLS enabled but no policies (default deny for all non-service-role).
-- Public form inserts go through submit-siniestro-api (service role, bypasses RLS).
-- Admin panel reads and status updates hit the table directly with an authenticated JWT.

create policy "Authenticated users can manage siniestros"
  on siniestros
  for all
  using (auth.role() = 'authenticated');
