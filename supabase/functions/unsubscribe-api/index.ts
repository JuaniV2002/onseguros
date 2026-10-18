import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { timingSafeEqual } from '../_shared/timing-safe.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const email = url.searchParams.get('email')
  const token = url.searchParams.get('token')

  // For GET requests, redirect to static confirmation page
  if (req.method === 'GET') {
    if (!email || !token) {
      return Response.redirect('https://www.onseguros.net/unsubscribe/error.html?message=Link%20inv%C3%A1lido', 302)
    }

    // Verify the token
    const isValid = await verifyToken(email, token)
    if (!isValid) {
      return Response.redirect('https://www.onseguros.net/unsubscribe/error.html?message=Link%20inv%C3%A1lido%20o%20expirado', 302)
    }

    // Redirect to confirmation page with email and token
    return Response.redirect(`https://www.onseguros.net/unsubscribe/index.html?email=${encodeURIComponent(email)}&token=${token}`, 302)
  }

  // For POST requests, process the unsubscription
  if (req.method === 'POST') {
    if (!email || !token) {
      return new Response(JSON.stringify({ error: 'Faltan parámetros' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify the token
    const isValid = await verifyToken(email, token)
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Delete from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('email', email.toLowerCase())

    if (error) {
      console.error('Delete error:', error)
      return new Response(JSON.stringify({ error: 'Error al cancelar suscripción' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response('Method not allowed', { status: 405 })
})

async function verifyToken(email: string, token: string): Promise<boolean> {
  try {
    const secret = Deno.env.get('UNSUBSCRIBE_SECRET')
    if (!secret) {
      console.error('UNSUBSCRIBE_SECRET not set')
      return false
    }

    const normalizedEmail = email.toLowerCase()
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(normalizedEmail)
    )

    const expectedToken = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return timingSafeEqual(expectedToken, token)
  } catch (error) {
    console.error('Token verification error:', error)
    return false
  }
}
