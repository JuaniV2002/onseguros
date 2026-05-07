# Weekly AI Draft Pipeline — Deploy Guide

Pipeline: every Friday 08:00 ART, Supabase pg_cron triggers `generate-weekly-draft`. The function pulls the oldest unused topic hint, calls Gemini 2.5 Pro (with Google Search grounding), writes to `post_drafts`, and emails Mariano with Edit / Publish buttons. Mariano either edits in the admin panel or one-clicks Publish from the email — the latter routes through `publish-draft-api`, which inserts into `posts` and triggers `send-newsletter-api`.

Project ref: `tgokvwuiiglioegxgcpu`

## 1. Apply the SQL migration

The migration creates `topic_hints`, `post_drafts`, the `post_draft_status` enum, RLS policies, an `updated_at` trigger, and the `post_drafts_with_hint` view. It also tries to enable `pg_cron` and `pg_net` (no-op if already enabled).

```bash
supabase db push --linked
```

If `db push` is not your usual flow, run the file in Studio SQL Editor:

```
supabase/migrations/20260507033232_weekly_drafts.sql
```

Verify in Studio:

```sql
select count(*) from post_drafts;       -- 0
select count(*) from topic_hints;       -- 0
select * from pg_extension where extname in ('pg_cron','pg_net');
```

## 2. Add the new Supabase secrets

```bash
# 32-byte random hex used to sign one-click publish tokens
openssl rand -hex 32 | xargs -I {} supabase secrets set DRAFT_PUBLISH_SECRET={} --project-ref tgokvwuiiglioegxgcpu

# Where the weekly preview goes
supabase secrets set ADMIN_NOTIFY_EMAIL=mariano.pas@onseguros.net --project-ref tgokvwuiiglioegxgcpu
```

Existing secrets that must already be present (verify with `supabase secrets list --project-ref tgokvwuiiglioegxgcpu`):

- `GEMINI_API_KEY` — Gemini 2.5 Pro
- `RESEND_API_KEY` — outbound email
- `WEBHOOK_SECRET` — pg_cron → edge fn auth + newsletter trigger
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — auto-provided

## 3. Deploy the edge functions

```bash
supabase functions deploy submit-topic-hint-api --project-ref tgokvwuiiglioegxgcpu
supabase functions deploy get-hints-api         --project-ref tgokvwuiiglioegxgcpu
supabase functions deploy get-drafts-api        --project-ref tgokvwuiiglioegxgcpu
supabase functions deploy update-draft-api      --project-ref tgokvwuiiglioegxgcpu
supabase functions deploy discard-draft-api     --project-ref tgokvwuiiglioegxgcpu
supabase functions deploy generate-weekly-draft --project-ref tgokvwuiiglioegxgcpu
supabase functions deploy publish-draft-api     --project-ref tgokvwuiiglioegxgcpu
```

Two functions are reached without a Supabase JWT and must skip the platform's JWT gate:

- `publish-draft-api` — opened from email by a logged-out browser; HMAC token gates access.
- `generate-weekly-draft` — invoked by `pg_net` from pg_cron, which has no JWT; `x-webhook-secret` gates access.

Re-deploy both with the flag:

```bash
supabase functions deploy publish-draft-api     --no-verify-jwt --project-ref tgokvwuiiglioegxgcpu
supabase functions deploy generate-weekly-draft --no-verify-jwt --project-ref tgokvwuiiglioegxgcpu
```

Both functions still validate their own auth (HMAC for publish, `x-webhook-secret` for generate), so this is safe.

## 4. Manual smoke test (do this before scheduling cron)

Force a draft generation right now:

```bash
WEBHOOK_SECRET="$(supabase secrets list --project-ref tgokvwuiiglioegxgcpu | awk '/WEBHOOK_SECRET/ {print $2}')"
# (or paste the value from the dashboard — secrets list does not expose values)

curl -i -X POST \
  "https://tgokvwuiiglioegxgcpu.supabase.co/functions/v1/generate-weekly-draft?force=1" \
  -H "x-webhook-secret: $WEBHOOK_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{}'
```

You should:

1. Get a 200 with `{success: true, draft_id, slug, grounding_count}`.
2. See a row in `post_drafts` with `status='pending'`.
3. Receive an email at `mariano.pas@onseguros.net` with an "Editar en panel" button (`https://www.onseguros.net/admin/?draft=<id>`) and a "Publicar ahora" button (`/functions/v1/publish-draft-api?id=...&token=...`).
4. Clicking the publish link opens a confirmation page; clicking "Publicar y enviar newsletter" creates a row in `posts`, marks the draft `status='published'`, and dispatches `send-newsletter-api`.

If the grounded call fails, the function automatically retries without grounding using strict JSON schema mode. If both fail, a `failed` row is recorded and a failure-notification email is sent.

## 5. Schedule the Friday cron

Once the smoke test passes, run this in Studio SQL Editor (one-time; run as project owner so `alter database` is permitted):

```sql
-- Stash the webhook secret so cron jobs can read it
alter database postgres set app.webhook_secret = '<paste WEBHOOK_SECRET value here>';

select cron.schedule(
  'weekly-blog-draft',
  '0 11 * * 5',  -- Friday 11:00 UTC = 08:00 ART
  $cron$
    select net.http_post(
      url := 'https://tgokvwuiiglioegxgcpu.supabase.co/functions/v1/generate-weekly-draft',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', current_setting('app.webhook_secret', true)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 120000
    );
  $cron$
);
```

If `alter database ... set` is blocked on the managed instance, embed the secret literal in the cron job's `headers` jsonb instead (still acceptable — single-tenant DB, secret never leaves Postgres).

Verify:

```sql
select * from cron.job where jobname = 'weekly-blog-draft';
select * from cron.job_run_details order by start_time desc limit 5;
```

## 6. Update the live frontend

Push the modified files to the static host:

- `config.json` (added 7 new endpoint URLs)
- `admin/index.html` (drafts section + nav button)
- `admin/admin-core.js` (new config keys + DOM handles + deep-link handler)
- `admin/admin-drafts.js` (new module)

## 7. Rollback

If anything goes wrong, disable the cron and the email loop dies:

```sql
select cron.unschedule('weekly-blog-draft');
```

Drafts already in the table are inert — they only get published when someone hits the publish endpoint. To clear all drafts:

```sql
update post_drafts set status = 'discarded' where status in ('pending','edited','failed');
```

## 8. Operational notes

- **Idempotency**: re-firing the cron in the same week skips generation if a draft from the last 6 days is still `pending` or `edited`. Override with `?force=1`.
- **Editing rotates the publish token**: when Mariano saves an edit in the panel, `update-draft-api` re-derives the HMAC token from the new `updated_at`, so the original email's "Publicar" link is invalidated. He must publish from the panel after editing.
- **Discarding reopens the hint**: if a draft used a topic hint, discarding it sets `topic_hints.used_at = NULL` so the next run picks the same hint up.
- **Newsletter side-effect**: `publish-draft-api` triggers `send-newsletter-api` after the post is inserted. If subscribers list is empty, that endpoint returns `sent: 0` — publishing still succeeds.
- **Cost**: Gemini 2.5 Pro grounded ~ \$0.05–0.15 per run × 52/yr → trivial.
- **Cron observability**: tail `cron.job_run_details`. For function logs, `supabase functions logs generate-weekly-draft --project-ref tgokvwuiiglioegxgcpu`.
