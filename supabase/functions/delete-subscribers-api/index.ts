import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Admin-only: deletes one newsletter subscriber by id.
// The gateway's verify_jwt also accepts the public anon key (it is a JWT),
// so we require a real logged-in user before touching the table.
const cors = { ...corsHeaders, 'Access-Control-Allow-Methods': 'DELETE, OPTIONS' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'DELETE') return jsonResponse({ error: 'Method not allowed' }, 405)

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
    const { id } = await req.json().catch(() => ({}))
    if (!id) return jsonResponse({ error: 'Subscriber ID is required' }, 400)

    const { data, error } = await supabaseAdmin
      .from('subscribers')
      .delete()
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data || data.length === 0) {
      return jsonResponse({ error: 'Subscriber not found' }, 404)
    }

    return jsonResponse({ success: true, message: 'Subscriber deleted successfully' })
  } catch (error) {
    console.error('delete-subscribers-api:', (error as Error).message)
    return jsonResponse({ error: 'Failed to delete subscriber' }, 400)
  }
})
