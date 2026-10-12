# Retire the Supabase quote/claim backend

Quotes (Oni) and claims (/siniestros/) moved to WhatsApp in `landing-redesign`
(43e2c1c). The old backend stays live until that branch is in production,
because `master` still posts to it. Run these steps **only after** the
production site shows the WhatsApp flow:

- https://www.onseguros.net/siniestros/ has no photo upload.
- https://www.onseguros.net/agente/ loads `agente.js?v=3` or later.

Project ref: `tgokvwuiiglioegxgcpu`. Backup folder: `~/onseguros-backups/2026-10-12/`.
The 5 `siniestros-fotos` photos and the `ai-quote-api` v19 source are already
there.

## 1. Deploy Oni's new prompt

```sh
supabase functions deploy ai-quote-api --project-ref tgokvwuiiglioegxgcpu --no-verify-jwt
```

The deployed function had `verify_jwt: false`, so keep the `--no-verify-jwt` flag.
Smoke test: chat on /agente/ until the summary appears. Oni should say
"Tocá el botón de abajo…" instead of asking for contact details.

## 2. Back up the tables (blocked from the CLI: needs the DB password)

Dashboard → Table Editor → `quote_requests` and `siniestros` → Export CSV,
into the backup folder. Do not continue until both files exist and their row
counts match the tables.

## 3. Delete the edge functions

```sh
supabase functions delete send-quote-email-api  --project-ref tgokvwuiiglioegxgcpu
supabase functions delete submit-siniestro-api  --project-ref tgokvwuiiglioegxgcpu
supabase functions delete get-quotes-api        --project-ref tgokvwuiiglioegxgcpu
supabase functions delete get-siniestros-api    --project-ref tgokvwuiiglioegxgcpu
supabase functions delete update-quote-status-api --project-ref tgokvwuiiglioegxgcpu
```

## 4. Delete the `siniestros-fotos` bucket

```sh
supabase storage rm --linked --experimental -r ss:///siniestros-fotos
```

Then Dashboard → Storage → `siniestros-fotos` → Delete bucket. Policies on
`storage.objects` that mention the bucket are dropped in step 5.

## 5. Drop the tables (new migration, then `supabase db push --linked`)

Create `supabase/migrations/<YYYYMMDDHHMMSS>_retire_quotes_siniestros.sql`:

```sql
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
```

Run `supabase migration list --linked` first. It was in sync on 2026-10-12, so
the push should apply only this migration.

## 6. GitHub Secrets and local config

```sh
for s in QUOTE_API_URL GET_QUOTES_API_URL UPDATE_QUOTE_STATUS_API_URL SUBMIT_SINIESTRO_API_URL GET_SINIESTROS_API_URL; do
  gh secret delete "$s" -R JuaniV2002/onseguros
done
```

Remove the same keys from the local, gitignored `config.json`.
