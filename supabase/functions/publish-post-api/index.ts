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

    const { title, content, description, slug, publish_date } = await req.json()

    if (!title || !content || !description || !slug) {
      return jsonResponse({ error: 'Missing required fields: title, content, description, slug' }, 400)
    }

    // Check for duplicate slugs
    const { data: existingPost } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingPost) {
      return jsonResponse({ error: 'A post with this slug already exists' }, 409)
    }

    // Create new post
    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert([{
        title,
        content,
        description,
        slug,
        publish_date: publish_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw error

    // Trigger newsletter
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
    const apiBaseUrl = Deno.env.get('SUPABASE_URL')

    try {
      const newsletterUrl = `${apiBaseUrl}/functions/v1/send-newsletter-api`
      await fetch(newsletterUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': webhookSecret || '',
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          slug: data.slug,
        }),
      })
    } catch (newsletterError) {
      console.error('Newsletter trigger error:', newsletterError)
    }

    return jsonResponse({ post: data, message: 'Post published and newsletter triggered successfully' })
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400)
  }
})
