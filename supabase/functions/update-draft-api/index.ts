import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { signDraftToken } from '../_shared/draft-token.ts'
import { ensureUniqueSlug, slugify } from '../_shared/slug.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const draftSecret = Deno.env.get('DRAFT_PUBLISH_SECRET')
    if (!draftSecret) return jsonResponse({ error: 'DRAFT_PUBLISH_SECRET not configured' }, 500)

    const { id, title, description, content, slug } = await req.json()
    if (!id) return jsonResponse({ error: 'id is required' }, 400)

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('post_drafts')
      .select('id, status, slug')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr
    if (!existing) return jsonResponse({ error: 'Draft not found' }, 404)
    if (!['pending', 'edited', 'failed'].includes(existing.status)) {
      return jsonResponse({ error: `Cannot edit draft in status ${existing.status}` }, 409)
    }

    const updates: Record<string, unknown> = { status: 'edited' }
    if (title !== undefined) updates.title = String(title).trim()
    if (description !== undefined) updates.description = String(description).trim()
    if (content !== undefined) updates.content = String(content)

    if (slug !== undefined && slug !== existing.slug) {
      const desired = slugify(String(slug))
      if (!desired) return jsonResponse({ error: 'Slug invalid after normalization' }, 400)
      updates.slug = await ensureUniqueSlug(desired, async (candidate) => {
        if (candidate === existing.slug) return false
        const [{ data: postHit }, { data: draftHit }] = await Promise.all([
          supabaseAdmin.from('posts').select('id').eq('slug', candidate).maybeSingle(),
          supabaseAdmin.from('post_drafts').select('id').eq('slug', candidate).neq('id', id).maybeSingle(),
        ])
        return Boolean(postHit) || Boolean(draftHit)
      })
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('post_drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (updErr) throw updErr

    const newToken = await signDraftToken(
      { draftId: updated.id, rotationStamp: updated.updated_at },
      draftSecret,
    )
    const { error: tokenErr } = await supabaseAdmin
      .from('post_drafts')
      .update({ publish_token: newToken })
      .eq('id', id)
    if (tokenErr) throw tokenErr

    return jsonResponse({
      draft: { ...updated, publish_token: newToken },
      message: 'Draft updated and token rotated',
    })
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400)
  }
})
