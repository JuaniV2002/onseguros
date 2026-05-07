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
    const idParam = url.searchParams.get('id')
    const includeAll = url.searchParams.get('all') === '1'

    if (idParam) {
      const { data, error } = await supabaseAdmin
        .from('post_drafts_with_hint')
        .select('*')
        .eq('id', idParam)
        .single()
      if (error) throw error
      return jsonResponse({ draft: data })
    }

    let query = supabaseAdmin
      .from('post_drafts_with_hint')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(50)
    if (!includeAll) {
      query = query.in('status', ['pending', 'edited', 'failed'])
    }

    const { data, error } = await query
    if (error) throw error
    return jsonResponse({ drafts: data ?? [] })
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400)
  }
})
