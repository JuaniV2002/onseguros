import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'

// Admin-only: deletes one newsletter subscriber by id.
const cors = { ...corsHeaders, 'Access-Control-Allow-Methods': 'DELETE, OPTIONS' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'DELETE') return jsonResponse({ error: 'Method not allowed' }, 405)

  const denied = await requireUser(req)
  if (denied) return denied

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

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
