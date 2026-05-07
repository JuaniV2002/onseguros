import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { id } = await req.json()
    if (!id) return jsonResponse({ error: 'id is required' }, 400)

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('faq_drafts')
      .select('id, status, hint_id')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr
    if (!existing) return jsonResponse({ error: 'Draft not found' }, 404)
    if (existing.status === 'published') {
      return jsonResponse({ error: 'Cannot discard a published draft' }, 409)
    }

    const { error: updErr } = await supabaseAdmin
      .from('faq_drafts')
      .update({ status: 'discarded' })
      .eq('id', id)
    if (updErr) throw updErr

    if (existing.hint_id) {
      await supabaseAdmin
        .from('faq_topic_hints')
        .update({ used_at: null, used_by_draft_id: null })
        .eq('id', existing.hint_id)
    }

    return jsonResponse({ message: 'Draft discarded; hint reopened if any' })
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400)
  }
})
