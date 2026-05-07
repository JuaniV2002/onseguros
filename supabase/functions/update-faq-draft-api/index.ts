import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { signDraftToken } from '../_shared/draft-token.ts'

const VALID_CATEGORIES = ['general', 'cobertura', 'cotizacion', 'art', 'siniestro', 'vehiculos']

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

    const { id, question, answer, category } = await req.json()
    if (!id) return jsonResponse({ error: 'id is required' }, 400)

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('faq_drafts')
      .select('id, status')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr
    if (!existing) return jsonResponse({ error: 'Draft not found' }, 404)
    if (!['pending', 'edited', 'failed'].includes(existing.status)) {
      return jsonResponse({ error: `Cannot edit draft in status ${existing.status}` }, 409)
    }

    const updates: Record<string, unknown> = { status: 'edited' }
    if (question !== undefined) {
      const q = String(question).trim()
      if (q.length < 12 || q.length > 200) {
        return jsonResponse({ error: 'question length must be between 12 and 200 chars' }, 400)
      }
      updates.question = q
    }
    if (answer !== undefined) {
      const a = String(answer).trim()
      if (a.length < 50) {
        return jsonResponse({ error: 'answer too short (min 50 chars)' }, 400)
      }
      updates.answer = a
    }
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(String(category))) {
        return jsonResponse({ error: 'invalid category' }, 400)
      }
      updates.category = category
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('faq_drafts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (updErr) throw updErr

    const newToken = await signDraftToken(
      { draftId: updated.id, rotationStamp: updated.updated_at, kind: 'faq' },
      draftSecret,
    )
    const { error: tokenErr } = await supabaseAdmin
      .from('faq_drafts')
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
