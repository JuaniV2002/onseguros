import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { requireUser } from '../_shared/auth.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const denied = await requireUser(req)
  if (denied) return denied

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { id, question, answer, category, order_number } = await req.json()

    const { data, error } = await supabaseAdmin
      .from('faqs')
      .update({ question, answer, category, order_number })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return jsonResponse(data)
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400)
  }
})
