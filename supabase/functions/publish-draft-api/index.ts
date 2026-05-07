import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, htmlResponse, jsonResponse } from '../_shared/cors.ts'
// publish_token is the HMAC-signed value stored at draft creation/edit.
// We don't recompute it here — direct timing-safe compare against the stored
// value. Status flip ('published') is the single-use guard; editing a draft
// rotates publish_token via update-draft-api, invalidating older email links.
function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
import { ensureUniqueSlug } from '../_shared/slug.ts'

const ALLOWED_PUBLISH_STATUSES = ['pending', 'edited']

function confirmPage(opts: {
  id: string
  token: string
  title: string
  description: string
  postUrl: string
}): string {
  const fnUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-draft-api`
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Confirmar publicación · OnSeguros</title>
<link rel="icon" type="image/png" href="${opts.postUrl.replace(/\/blog\/post\.html.*$/, '')}/assets/icons/favicon.png">
<style>
body{margin:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fbfbfe;color:#101016;}
.wrap{max-width:560px;margin:48px auto;padding:0 20px;}
.card{background:#fff;border:1px solid rgba(16,16,22,.1);border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(16,16,22,.06);}
h1{font-family:'Space Grotesk','Inter',sans-serif;font-size:22px;margin:0 0 8px;letter-spacing:-0.02em;}
h2{font-size:18px;margin:24px 0 8px;}
p{line-height:1.6;color:#5a5a64;margin:0 0 12px;font-size:15px;}
button,.btn{display:inline-block;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;cursor:pointer;border:none;font-family:inherit;}
.btn-primary{background:#2e7ef6;color:#fff;}
.btn-primary:hover{background:#1f6ae0;}
.btn-secondary{background:#fff;color:#101016;border:1px solid rgba(16,16,22,.2);}
.spinner{display:inline-block;width:16px;height:16px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin .8s linear infinite;vertical-align:middle;margin-right:8px;}
@keyframes spin{to{transform:rotate(360deg);}}
.actions{display:flex;gap:12px;margin-top:24px;}
.error{color:#b3261e;background:#fde7e7;border:1px solid #f5c2c2;padding:12px 16px;border-radius:8px;margin-top:16px;display:none;}
.success{color:#0f7b3a;background:#e6f7ec;border:1px solid #b7e4c7;padding:12px 16px;border-radius:8px;margin-top:16px;display:none;}
</style></head><body><div class="wrap"><div class="card">
<h1>Confirmar publicación</h1>
<p>Estás por publicar este borrador en el blog y enviar el newsletter a todos los suscriptores. Es una sola vez — confirmá solo si revisaste el contenido.</p>
<h2>${opts.title.replace(/</g, '&lt;')}</h2>
<p>${opts.description.replace(/</g, '&lt;')}</p>
<div class="actions">
  <button id="cancel" class="btn-secondary" type="button" onclick="window.close();history.back();">Cancelar</button>
  <button id="confirm" class="btn-primary" type="button">Publicar y enviar newsletter</button>
</div>
<div id="err" class="error"></div>
<div id="ok" class="success"></div>
</div></div>
<script>
(function(){
  var btn=document.getElementById('confirm');
  var err=document.getElementById('err');
  var ok=document.getElementById('ok');
  btn.addEventListener('click', async function(){
    btn.disabled=true; err.style.display='none';
    btn.innerHTML='<span class="spinner"></span>Publicando…';
    try{
      var res=await fetch(${JSON.stringify(fnUrl)},{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({id:${JSON.stringify(opts.id)},token:${JSON.stringify(opts.token)}})
      });
      var data=await res.json().catch(function(){return{};});
      if(!res.ok){throw new Error(data.error||('HTTP '+res.status));}
      ok.style.display='block';
      ok.innerHTML='Publicado. <a href="'+data.post_url+'" style="color:#0f7b3a;text-decoration:underline;">Ver artículo</a>';
      btn.style.display='none';
    }catch(e){
      err.style.display='block';
      err.textContent=e.message||'Error desconocido';
      btn.disabled=false; btn.textContent='Reintentar';
    }
  });
})();
</script></body></html>`
}

function errorPage(title: string, message: string, status = 400): Response {
  return htmlResponse(
    `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family:sans-serif;background:#fbfbfe;color:#101016;padding:48px 20px;text-align:center;}
.card{max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid rgba(16,16,22,.1);}
h1{margin:0 0 12px;color:#b3261e;}p{color:#5a5a64;line-height:1.6;}</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`,
    status,
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  const apiBaseUrl = Deno.env.get('SUPABASE_URL')
  const blogBaseUrl = Deno.env.get('BLOG_BASE_URL') || 'https://www.onseguros.net/blog/post.html'

  const url = new URL(req.url)
  let id: string | null
  let token: string | null

  if (req.method === 'GET') {
    id = url.searchParams.get('id')
    token = url.searchParams.get('token')
    if (!id || !token) return errorPage('Falta información', 'El enlace está incompleto.', 400)
    const { data: draft, error } = await supabaseAdmin
      .from('post_drafts')
      .select('id, title, description, status, slug, publish_token')
      .eq('id', id)
      .single()
    if (error || !draft) return errorPage('No encontrado', 'No se encontró el borrador.', 404)
    if (!ALLOWED_PUBLISH_STATUSES.includes(draft.status)) {
      return errorPage(
        'Borrador no publicable',
        `Este borrador está en estado "${draft.status}". Si ya lo editaste, abrí el panel y publicalo desde ahí.`,
        409,
      )
    }
    if (!timingSafeEqualString(draft.publish_token, token)) {
      return errorPage(
        'Enlace vencido',
        'Este enlace ya no es válido (probablemente porque editaste el borrador). Publicalo desde el panel.',
        401,
      )
    }
    return htmlResponse(
      confirmPage({
        id: draft.id,
        token,
        title: draft.title,
        description: draft.description,
        postUrl: blogBaseUrl,
      }),
    )
  }

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json().catch(() => ({}))
    id = body?.id ?? null
    token = body?.token ?? null

    const authHeader = req.headers.get('authorization') || ''
    const adminBearer = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null
    let isAdminAuthenticated = false
    if (adminBearer) {
      const { data: userData } = await supabaseAdmin.auth.getUser(adminBearer)
      if (userData?.user) isAdminAuthenticated = true
    }

    if (!id) return jsonResponse({ error: 'id is required' }, 400)
    if (!token && !isAdminAuthenticated) return jsonResponse({ error: 'token is required' }, 400)

    const { data: draft, error: fetchErr } = await supabaseAdmin
      .from('post_drafts')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr || !draft) return jsonResponse({ error: 'Draft not found' }, 404)
    if (!ALLOWED_PUBLISH_STATUSES.includes(draft.status)) {
      return jsonResponse({ error: `Draft status is ${draft.status}, cannot publish` }, 409)
    }

    if (!isAdminAuthenticated) {
      if (!timingSafeEqualString(draft.publish_token, token!)) {
        return jsonResponse({ error: 'Invalid or expired token' }, 401)
      }
    }

    const finalSlug = await ensureUniqueSlug(draft.slug, async (candidate) => {
      if (candidate === draft.slug) {
        const { data: hit } = await supabaseAdmin
          .from('posts')
          .select('id')
          .eq('slug', candidate)
          .maybeSingle()
        return Boolean(hit)
      }
      const { data: hit } = await supabaseAdmin
        .from('posts')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle()
      return Boolean(hit)
    })

    const today = new Date().toISOString().split('T')[0]
    const { data: newPost, error: insertErr } = await supabaseAdmin
      .from('posts')
      .insert([{
        title: draft.title,
        description: draft.description,
        content: draft.content,
        slug: finalSlug,
        publish_date: today,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single()
    if (insertErr) throw insertErr

    const { error: markErr } = await supabaseAdmin
      .from('post_drafts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_post_id: newPost.id,
        slug: finalSlug,
      })
      .eq('id', draft.id)
    if (markErr) console.error('Failed to mark draft published:', markErr)

    if (webhookSecret) {
      try {
        await fetch(`${apiBaseUrl}/functions/v1/send-newsletter-api`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-secret': webhookSecret,
          },
          body: JSON.stringify({
            title: newPost.title,
            description: newPost.description,
            slug: newPost.slug,
          }),
        })
      } catch (newsletterErr) {
        console.error('Newsletter trigger failed:', newsletterErr)
      }
    }

    // Trigger sitemap regeneration via GitHub Actions workflow_dispatch.
    // Best-effort: failure here doesn't block publish.
    const ghToken = Deno.env.get('GITHUB_DISPATCH_TOKEN')
    const ghRepo = Deno.env.get('GITHUB_REPO')
    const ghWorkflow = Deno.env.get('SITEMAP_WORKFLOW_FILE') || 'update-sitemap.yml'
    if (ghToken && ghRepo) {
      try {
        const dispatchRes = await fetch(
          `https://api.github.com/repos/${ghRepo}/actions/workflows/${ghWorkflow}/dispatches`,
          {
            method: 'POST',
            headers: {
              'Accept': 'application/vnd.github+json',
              'Authorization': `Bearer ${ghToken}`,
              'X-GitHub-Api-Version': '2022-11-28',
              'Content-Type': 'application/json',
              'User-Agent': 'onseguros-publish-draft-api',
            },
            body: JSON.stringify({ ref: 'master' }),
          },
        )
        if (!dispatchRes.ok) {
          const body = await dispatchRes.text()
          console.error(`Sitemap dispatch ${dispatchRes.status}: ${body.substring(0, 200)}`)
        }
      } catch (dispatchErr) {
        console.error('Sitemap dispatch failed:', dispatchErr)
      }
    }

    return jsonResponse({
      success: true,
      post_id: newPost.id,
      slug: newPost.slug,
      post_url: `${blogBaseUrl}?slug=${newPost.slug}`,
      message: 'Draft published and newsletter dispatched',
    })
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500)
  }
})
