import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const url = new URL(req.url)
    const onlyUnused = url.searchParams.get('unused') === '1'

    let query = supabaseAdmin
      .from('topic_hints')
      .select('id, hint, created_at, used_at, used_by_draft_id')
      .order('created_at', { ascending: false })
      .limit(20)
    if (onlyUnused) query = query.is('used_at', null)

    const { data, error } = await query
    if (error) throw error
    return jsonResponse({ hints: data ?? [] })
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400)
  }
})
