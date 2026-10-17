import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'

// Admin-only: lists confirmed newsletter subscribers (PII).
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const denied = await requireUser(req)
  if (denied) return denied

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const { data, error } = await supabaseAdmin
      .from('subscribers')
      .select('id, email, subscribed_at, confirmed')
      .eq('confirmed', true)
      .order('subscribed_at', { ascending: false })
    if (error) throw error
    return jsonResponse(data ?? [])
  } catch (error) {
    console.error('get-subscribers-api:', (error as Error).message)
    return jsonResponse({ error: 'Failed to load subscribers' }, 400)
  }
})
