import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { timingSafeEqual } from '../_shared/timing-safe.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
}

async function generateUnsubscribeToken(email: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(email.toLowerCase())

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function generateEmailHTML(
  title: string,
  description: string,
  slug: string,
  publishDate: string,
  unsubscribeUrl: string,
  blogBaseUrl: string
): string {
  const postUrl = `${blogBaseUrl}?slug=${encodeURIComponent(slug)}`
  
  // Format date in Spanish
  const date = new Date(publishDate)
  const formattedDate = date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fbfbfe;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fbfbfe; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(16, 16, 22, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 40px; text-align: center; border-bottom: 1px solid rgba(16, 16, 22, 0.1);">
              <img src="https://www.onseguros.net/assets/slogan.svg" alt="OnSeguros" style="max-width: 240px; height: auto; margin: 0 auto;" />
              <p style="margin: 12px 0 0; color: #b8b8b8; font-size: 14px; font-weight: 500;">Nuevo artículo en el blog</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 24px; color: #101016; font-size: 16px; line-height: 1.6;">
                ¡Hola! 👋
              </p>
              <p style="margin: 0 0 24px; color: #101016; font-size: 16px; line-height: 1.6;">
                Acabamos de publicar un nuevo artículo que puede interesarte:
              </p>
              
              <!-- Post Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fbfbfe; border-radius: 8px; border: 1px solid rgba(16, 16, 22, 0.1); margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="margin: 0 0 12px; color: #101016; font-size: 20px; font-weight: 600; font-family: 'Space Grotesk', 'Inter', sans-serif; letter-spacing: -0.02em;">
                      ${escapeHtml(title)}
                    </h2>
                    <p style="margin: 0 0 16px; color: #101016; font-size: 14px; line-height: 1.5; opacity: 0.8;">
                      ${escapeHtml(description)}
                    </p>
                    <p style="margin: 0; color: #b8b8b8; font-size: 12px;">
                      📅 ${formattedDate}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${postUrl}" style="display: inline-block; background-color: #2e7ef6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Leer artículo →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fbfbfe; padding: 24px 40px; border-top: 1px solid rgba(16, 16, 22, 0.1);">
              <p style="margin: 0 0 8px; color: #b8b8b8; font-size: 14px; text-align: center;">
                Recibís este email porque te suscribiste al newsletter de OnSeguros.
              </p>
              <p style="margin: 0 0 8px; color: #b8b8b8; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} OnSeguros · Río Cuarto, Córdoba, Argentina
              </p>
              <p style="margin: 0; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #b8b8b8; font-size: 12px; text-decoration: underline;">Cancelar suscripción</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
    const providedSecret = req.headers.get('x-webhook-secret')

    if (!timingSafeEqual(providedSecret, webhookSecret)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid webhook secret' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { title, description, slug } = await req.json()

    if (!title || !description || !slug) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, description, slug' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all confirmed subscribers
    const { data: subscribers, error } = await supabaseAdmin
      .from('subscribers')
      .select('email')
      .eq('confirmed', true)

    if (error) throw error

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No confirmed subscribers found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const unsubscribeSecret = Deno.env.get('UNSUBSCRIBE_SECRET')
    const apiBaseUrl = Deno.env.get('SUPABASE_URL')
    const blogBaseUrl = Deno.env.get('BLOG_BASE_URL') || 'https://www.onseguros.net/blog/post.html'
    
    // Get current date for publish date
    const publishDate = new Date().toISOString()

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Resend API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // No fallback to the webhook secret: unsubscribe links would leak a token
    // derived from it.
    if (!unsubscribeSecret) {
      return new Response(
        JSON.stringify({ error: 'Unsubscribe secret not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const batchSize = 100
    const emailPromises = []

    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize)
      
      const batchEmails = await Promise.all(
        batch.map(async (subscriber) => {
          const token = await generateUnsubscribeToken(subscriber.email, unsubscribeSecret!)
          const unsubscribeUrl = `${apiBaseUrl}/functions/v1/unsubscribe-api?email=${encodeURIComponent(subscriber.email)}&token=${token}`
          
          return {
            from: 'OnSeguros Newsletter <newsletter@onseguros.net>',
            to: subscriber.email,
            subject: `📰 Nuevo artículo: ${title}`,
            html: generateEmailHTML(title, description, slug, publishDate, unsubscribeUrl, blogBaseUrl),
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }
        })
      )

      const batchPromise = fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batchEmails),
      })

      emailPromises.push(batchPromise)
    }

    await Promise.all(emailPromises)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Newsletter sent to ${subscribers.length} subscribers`,
        sent: subscribers.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-newsletter-api:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send newsletter' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})