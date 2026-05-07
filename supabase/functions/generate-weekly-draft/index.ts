import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { signDraftToken } from '../_shared/draft-token.ts'
import { ensureUniqueSlug, slugify } from '../_shared/slug.ts'
import { renderMarkdown } from '../_shared/markdown.ts'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', minLength: 10, maxLength: 90 },
    description: { type: 'string', minLength: 60, maxLength: 160 },
    slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
    content: { type: 'string', minLength: 1500 },
  },
  required: ['title', 'description', 'slug', 'content'],
}

const SYSTEM_INSTRUCTION =
  "Sos editor del blog de OnSeguros, un broker de seguros en Argentina. Escribís en español rioplatense, tono cercano y claro, sin tecnicismos innecesarios. Tu audiencia son clientes finales (no productores ni abogados). Citás fuentes oficiales argentinas cuando corresponda: SSN (ssn.gob.ar), Boletín Oficial, BCRA, AFIP, infoleg.gob.ar."

interface DraftJson {
  title: string
  description: string
  slug: string
  content: string
}

function buildUserPrompt(hint: string | null): string {
  const base = hint
    ? `Tema sugerido por el editor: "${hint}". Buscá novedades reales y verificables de las últimas 4 semanas en fuentes argentinas oficiales sobre este tema y desarrollalo en un artículo informativo.`
    : 'Buscá una novedad real y verificable de las últimas 2 semanas relevante para usuarios de seguros en Argentina (cambios regulatorios SSN, alertas de fraude, paritarias del sector, nuevas coberturas, accidentes mediáticos con implicancias para seguros). Si no encontrás nada relevante, escribí un artículo educativo sobre algún seguro habitual (auto, hogar, ART, vida) con foco en datos prácticos para el cliente.'
  return [
    base,
    '',
    'Devolvé EXCLUSIVAMENTE un objeto JSON con las claves: title, description, slug, content.',
    '- title: 30-90 caracteres, sin emojis, sin comillas.',
    '- description: 80-160 caracteres, una sola frase atractiva para SEO.',
    '- slug: solo minúsculas, números y guiones, máximo 60 caracteres, sin tildes.',
    '- content: Markdown 600-1000 palabras. Usá H2 (##) y H3 (###). Listas si ayudan. Sin tablas, sin bloques de código.',
    '',
    'Cerrá el content con esta línea exacta como último párrafo:',
    '_Este artículo es informativo y no constituye asesoramiento. Consultá con tu productor de seguros._',
    '',
    'Antes del disclaimer agregá una sección final "## Fuentes" con bullet list de los enlaces consultados (formato Markdown [texto](url)).',
  ].join('\n')
}

function extractJson(rawText: string): DraftJson {
  let s = rawText.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in Gemini response')
  const sliced = s.substring(start, end + 1)
  const parsed = JSON.parse(sliced) as DraftJson
  if (!parsed.title || !parsed.description || !parsed.slug || !parsed.content) {
    throw new Error('Gemini JSON missing required fields')
  }
  return parsed
}

interface GeminiCallResult {
  draft: DraftJson
  groundingSources: Array<{ uri: string; title?: string }>
  rawResponse: unknown
}

async function callGemini(apiKey: string, prompt: string, useGrounding: boolean): Promise<GeminiCallResult> {
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 8192,
    },
  }
  if (useGrounding) {
    body.tools = [{ google_search: {} }]
  } else {
    ;(body.generationConfig as Record<string, unknown>).responseMimeType = 'application/json'
    ;(body.generationConfig as Record<string, unknown>).responseSchema = RESPONSE_SCHEMA
  }

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini API ${res.status}: ${text.substring(0, 500)}`)
  }
  const json = await res.json()
  const candidate = json?.candidates?.[0]
  const partsText = candidate?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? '')
    .filter(Boolean)
    .join('\n')
  if (!partsText) throw new Error('Empty Gemini response')

  const draft = extractJson(partsText)

  const groundingChunks = candidate?.groundingMetadata?.groundingChunks ?? []
  const groundingSources = groundingChunks
    .map((c: { web?: { uri?: string; title?: string } }) => c.web)
    .filter((w: unknown): w is { uri: string; title?: string } =>
      Boolean(w && typeof (w as { uri?: string }).uri === 'string'),
    )
    .map((w: { uri: string; title?: string }) => ({ uri: w.uri, title: w.title }))

  return { draft, groundingSources, rawResponse: json }
}

function buildDraftEmail(opts: {
  draft: DraftJson
  draftId: string
  publishToken: string
  hintText: string | null
  groundingSources: Array<{ uri: string; title?: string }>
}): { html: string; text: string; subject: string } {
  const { draft, draftId, publishToken, hintText, groundingSources } = opts
  const editUrl = `https://www.onseguros.net/admin/?draft=${draftId}`
  const fnBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-draft-api`
  const publishUrl = `${fnBase}?id=${draftId}&token=${encodeURIComponent(publishToken)}`
  const previewBody = renderMarkdown(draft.content)
  const subject = `[OnSeguros] Borrador semanal listo: ${draft.title}`

  const sourcesHtml = groundingSources.length
    ? `<p style="margin:0 0 8px;color:#5a5a64;font-size:13px;font-weight:600;">Fuentes consultadas por la IA:</p><ul style="margin:0 0 24px 24px;padding:0;color:#5a5a64;font-size:13px;line-height:1.5;">${groundingSources.map((s) => `<li><a href="${s.uri}" style="color:#2e7ef6;">${(s.title || s.uri).substring(0, 120)}</a></li>`).join('')}</ul>`
    : ''
  const hintHtml = hintText
    ? `<div style="background:#fff7e6;border:1px solid #f5d99a;border-radius:8px;padding:12px 16px;margin-bottom:24px;color:#8a5a00;font-size:14px;"><strong>Tema sugerido por vos:</strong> ${hintText}</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fbfbfe;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fbfbfe;padding:32px 16px;">
<tr><td align="center">
<table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(16,16,22,.08);overflow:hidden;">
  <tr><td style="padding:24px 32px;border-bottom:1px solid rgba(16,16,22,.1);text-align:center;">
    <img src="https://www.onseguros.net/assets/slogan.svg" alt="OnSeguros" style="max-width:200px;height:auto;" />
    <p style="margin:8px 0 0;color:#b8b8b8;font-size:13px;font-weight:500;">Borrador semanal generado por IA · revisión humana requerida</p>
  </td></tr>
  <tr><td style="padding:32px;">
    ${hintHtml}
    <p style="margin:0 0 16px;color:#101016;font-size:15px;line-height:1.6;">Hola Mariano,</p>
    <p style="margin:0 0 24px;color:#101016;font-size:15px;line-height:1.6;">Este es el borrador para esta semana. Revisalo abajo y publicalo si te parece bien, o entrá al panel para editarlo antes.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;"><tr>
      <td align="center" style="padding-right:8px;">
        <a href="${editUrl}" style="display:block;background:#fff;color:#2e7ef6;text-decoration:none;padding:14px 24px;border:2px solid #2e7ef6;border-radius:8px;font-weight:600;font-size:15px;text-align:center;">Editar en panel</a>
      </td>
      <td align="center" style="padding-left:8px;">
        <a href="${publishUrl}" style="display:block;background:#2e7ef6;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;text-align:center;">Publicar ahora →</a>
      </td>
    </tr></table>

    <p style="margin:0 0 4px;color:#b8b8b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Vista previa del artículo</p>
    <h1 style="margin:0 0 8px;font-family:'Space Grotesk','Inter',sans-serif;color:#101016;font-size:26px;line-height:1.25;letter-spacing:-0.02em;">${draft.title}</h1>
    <p style="margin:0 0 24px;color:#5a5a64;font-size:15px;line-height:1.5;">${draft.description}</p>
    <hr style="border:none;border-top:1px solid rgba(16,16,22,.1);margin:0 0 24px;" />
    ${previewBody}
    <hr style="border:none;border-top:1px solid rgba(16,16,22,.1);margin:24px 0;" />
    ${sourcesHtml}
    <p style="margin:0;color:#b8b8b8;font-size:12px;line-height:1.5;">El botón "Publicar ahora" funciona una sola vez. Si editás el borrador en el panel, este enlace deja de servir y vas a tener que publicar desde el panel.</p>
  </td></tr>
  <tr><td style="background:#fbfbfe;padding:16px 32px;border-top:1px solid rgba(16,16,22,.1);text-align:center;">
    <p style="margin:0;color:#b8b8b8;font-size:11px;">OnSeguros · automatización de blog</p>
  </td></tr>
</table>
</td></tr></table></body></html>`

  const text = [
    `Borrador semanal — ${draft.title}`,
    '',
    draft.description,
    '',
    hintText ? `Tema sugerido: ${hintText}` : '',
    '',
    `Editar en panel: ${editUrl}`,
    `Publicar ahora (un solo uso): ${publishUrl}`,
    '',
    '— OnSeguros',
  ].filter(Boolean).join('\n')

  return { html, text, subject }
}

function buildFailureEmail(message: string): { html: string; text: string; subject: string } {
  const subject = '[OnSeguros] Falló la generación del borrador semanal'
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#fbfbfe;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid rgba(16,16,22,.1);border-radius:12px;padding:24px;">
<h2 style="margin:0 0 12px;color:#101016;">Falló la generación del borrador</h2>
<p style="color:#5a5a64;line-height:1.5;">El cron del viernes corrió pero la IA no pudo armar un borrador esta vez. Detalles abajo. Lo podés intentar de nuevo manualmente desde el panel.</p>
<pre style="background:#fbfbfe;border:1px solid rgba(16,16,22,.1);border-radius:8px;padding:12px;font-size:12px;color:#8b3a3a;white-space:pre-wrap;word-break:break-word;">${message}</pre>
<p style="color:#b8b8b8;font-size:12px;margin-top:16px;">OnSeguros · automatización de blog</p>
</div></body></html>`
  const text = `Falló la generación del borrador semanal.\n\n${message}`
  return { html, text, subject }
}

async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  text: string
  resendApiKey: string
}): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${opts.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'OnSeguros Blog <newsletter@onseguros.net>',
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Resend API ${res.status}: ${text.substring(0, 300)}`)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
  const provided = req.headers.get('x-webhook-secret')
  let authorized = Boolean(webhookSecret && provided && provided === webhookSecret)
  if (!authorized) {
    const auth = req.headers.get('authorization') || ''
    const bearer = auth.startsWith('Bearer ') ? auth.substring(7) : null
    if (bearer) {
      const { data } = await supabaseAdmin.auth.getUser(bearer)
      if (data?.user) authorized = true
    }
  }
  if (!authorized) return jsonResponse({ error: 'Unauthorized' }, 401)
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const draftSecret = Deno.env.get('DRAFT_PUBLISH_SECRET')
  const adminEmail = Deno.env.get('ADMIN_NOTIFY_EMAIL') || 'mariano.pas@onseguros.net'

  if (!geminiKey) return jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 500)
  if (!resendKey) return jsonResponse({ error: 'RESEND_API_KEY not configured' }, 500)
  if (!draftSecret) return jsonResponse({ error: 'DRAFT_PUBLISH_SECRET not configured' }, 500)

  const force = (() => {
    try {
      const url = new URL(req.url)
      return url.searchParams.get('force') === '1'
    } catch {
      return false
    }
  })()

  try {
    if (!force) {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      const { data: pending } = await supabaseAdmin
        .from('post_drafts')
        .select('id, generated_at')
        .in('status', ['pending', 'edited'])
        .gte('generated_at', sixDaysAgo)
        .order('generated_at', { ascending: false })
        .limit(1)
      if (pending && pending.length > 0) {
        return jsonResponse({
          skipped: true,
          reason: 'Open draft from this week still pending review',
          existing_draft_id: pending[0].id,
        })
      }
    }

    const { data: hintRow } = await supabaseAdmin
      .from('topic_hints')
      .select('id, hint')
      .is('used_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    const hintId: string | null = hintRow?.id ?? null
    const hintText: string | null = hintRow?.hint ?? null
    const draftId = crypto.randomUUID()

    let draft: DraftJson
    let groundingSources: Array<{ uri: string; title?: string }> = []
    let model = `${GEMINI_MODEL}+google_search`
    try {
      const result = await callGemini(geminiKey, buildUserPrompt(hintText), true)
      draft = result.draft
      groundingSources = result.groundingSources
    } catch (err) {
      console.warn('Grounded call failed, retrying without grounding:', err)
      const result = await callGemini(geminiKey, buildUserPrompt(hintText), false)
      draft = result.draft
      model = `${GEMINI_MODEL}+strict-json`
    }

    const desiredSlug = slugify(draft.slug || draft.title)
    const finalSlug = await ensureUniqueSlug(desiredSlug, async (candidate) => {
      const [{ data: postHit }, { data: draftHit }] = await Promise.all([
        supabaseAdmin.from('posts').select('id').eq('slug', candidate).maybeSingle(),
        supabaseAdmin.from('post_drafts').select('id').eq('slug', candidate).maybeSingle(),
      ])
      return Boolean(postHit) || Boolean(draftHit)
    })

    const generatedAt = new Date().toISOString()
    const publishToken = await signDraftToken(
      { draftId, rotationStamp: generatedAt },
      draftSecret,
    )

    const { error: insertErr } = await supabaseAdmin
      .from('post_drafts')
      .insert([{
        id: draftId,
        title: draft.title,
        slug: finalSlug,
        description: draft.description,
        content: draft.content,
        hint_id: hintId,
        status: 'pending',
        publish_token: publishToken,
        generated_at: generatedAt,
        updated_at: generatedAt,
        generation_metadata: {
          model,
          grounding_sources: groundingSources,
          had_hint: Boolean(hintText),
        },
      }])
    if (insertErr) throw insertErr

    if (hintId) {
      await supabaseAdmin
        .from('topic_hints')
        .update({ used_at: new Date().toISOString(), used_by_draft_id: draftId })
        .eq('id', hintId)
    }

    const email = buildDraftEmail({
      draft: { ...draft, slug: finalSlug },
      draftId,
      publishToken,
      hintText,
      groundingSources,
    })
    try {
      await sendEmail({
        to: adminEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
        resendApiKey: resendKey,
      })
      await supabaseAdmin
        .from('post_drafts')
        .update({ sent_to_admin_at: new Date().toISOString() })
        .eq('id', draftId)
    } catch (mailErr) {
      console.error('Email send failed:', mailErr)
      await supabaseAdmin
        .from('post_drafts')
        .update({ error_message: `email_send_failed: ${(mailErr as Error).message}` })
        .eq('id', draftId)
    }

    return jsonResponse({
      success: true,
      draft_id: draftId,
      slug: finalSlug,
      had_hint: Boolean(hintText),
      grounding_count: groundingSources.length,
    })
  } catch (error) {
    const message = (error as Error).message || String(error)
    console.error('generate-weekly-draft failed:', message)

    try {
      await supabaseAdmin
        .from('post_drafts')
        .insert([{
          id: crypto.randomUUID(),
          title: '[Falla en generación]',
          slug: `error-${Date.now()}`,
          description: 'No se pudo generar el borrador semanal.',
          content: message,
          status: 'failed',
          publish_token: 'n/a',
          error_message: message,
        }])
      const fail = buildFailureEmail(message)
      await sendEmail({
        to: adminEmail,
        subject: fail.subject,
        html: fail.html,
        text: fail.text,
        resendApiKey: resendKey,
      })
    } catch (logErr) {
      console.error('Failed to record failure:', logErr)
    }

    return jsonResponse({ error: message }, 500)
  }
})
