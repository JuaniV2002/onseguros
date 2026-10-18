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

    const { id, title, content, description, slug, publish_date } = await req.json()

    if (!id) return jsonResponse({ error: 'Post ID is required' }, 400)

    // deno-lint-ignore no-explicit-any
    const updateData: any = { updated_at: new Date().toISOString() }
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (description !== undefined) updateData.description = description
    if (slug !== undefined) updateData.slug = slug
    if (publish_date !== undefined) updateData.publish_date = publish_date

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return jsonResponse({ post: data, message: 'Post updated successfully' })
  } catch (error) {
    console.error('update-post-api:', error)
    // posts.slug is UNIQUE (posts_slug_key)
    if ((error as { code?: string })?.code === '23505') {
      return jsonResponse({ error: 'Ya existe un artículo con ese slug' }, 400)
    }
    return jsonResponse({ error: 'No se pudo actualizar el artículo' }, 400)
  }
})
