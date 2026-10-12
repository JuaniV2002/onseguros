-- Quotes and claims moved to WhatsApp (see supabase/RETIRE_QUOTES_SINIESTROS.md).
-- Rows backed up to ~/onseguros-backups/2026-10-12/ before dropping.
drop table if exists public.quote_requests;
drop table if exists public.siniestros;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') ilike '%siniestros-fotos%'
        or coalesce(with_check, '') ilike '%siniestros-fotos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;
