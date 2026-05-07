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

    const { hint } = await req.json()
    if (typeof hint !== 'string') return jsonResponse({ error: 'hint must be a string' }, 400)
    const trimmed = hint.trim()
    if (trimmed.length < 3 || trimmed.length > 500) {
      return jsonResponse({ error: 'hint length must be between 3 and 500 chars' }, 400)
    }

    const { data, error } = await supabaseAdmin
      .from('topic_hints')
      .insert([{ hint: trimmed, source: 'admin' }])
      .select()
      .single()

    if (error) throw error
    return jsonResponse({ hint: data, message: 'Hint stored' })
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400)
  }
})
