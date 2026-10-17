import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Admin-only: lists confirmed newsletter subscribers (PII).
// The gateway's verify_jwt also accepts the public anon key (it is a JWT),
// so we require a real logged-in user before touching the table.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data: userData, error: userError } = token
    ? await supabaseAdmin.auth.getUser(token)
    : { data: { user: null }, error: null }
  if (userError || !userData?.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

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
