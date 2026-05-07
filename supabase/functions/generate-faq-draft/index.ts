import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'
import { signDraftToken } from '../_shared/draft-token.ts'

const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const VALID_CATEGORIES = ['general', 'cobertura', 'cotizacion', 'art', 'siniestro', 'vehiculos'] as const
type Category = typeof VALID_CATEGORIES[number]

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string', minLength: 12, maxLength: 200 },
    answer: { type: 'string', minLength: 200 },
    category: { type: 'string', enum: VALID_CATEGORIES as unknown as string[] },
  },
  required: ['question', 'answer', 'category'],
}

const SYSTEM_INSTRUCTION =
  "Sos editor del centro de ayuda de OnSeguros, un broker de seguros en Argentina. Tu trabajo es responder preguntas frecuentes de consumidores finales con información fundada en la ley argentina. Escribís en español rioplatense, tono cercano y claro, sin tecnicismos innecesarios. Citás SIEMPRE fuentes oficiales argentinas relevantes: Ley 17.418 de Seguros, Ley 24.557 de ART, Ley 24.240 de Defensa del Consumidor, Resoluciones SSN (ssn.gob.ar), infoleg.gob.ar, Boletín Oficial. NUNCA inventes números de artículo o resoluciones — si no encontraste fuente sólida, decilo. Tu audiencia son clientes finales, no productores ni abogados."

interface DraftJson {
  question: string
  answer: string
  category: Category
}

function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:'"()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function jaccardTokens(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter((w) => w.length >= 3))
  const tb = new Set(b.split(' ').filter((w) => w.length >= 3))
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  const union = ta.size + tb.size - inter
  return union === 0 ? 0 : inter / union
}

function findNearDuplicate(
  newQuestion: string,
  existing: Array<{ id: string; question: string }>,
): { id: string; score: number } | null {
  const target = normalizeQuestion(newQuestion)
  let best: { id: string; score: number } | null = null
  for (const row of existing) {
    const score = jaccardTokens(target, normalizeQuestion(row.question))
    if (score >= 0.7 && (!best || score > best.score)) {
      best = { id: row.id, score }
    }
  }
  return best
}

function buildUserPrompt(opts: {
  hint: string | null
  existingQuestions: string[]
}): string {
  const { hint, existingQuestions } = opts
  const base = hint
    ? `Tema sugerido por el editor: "${hint}". Buscá en fuentes oficiales argentinas y armá una pregunta frecuente realista (la que un consumidor argentino haría) sobre este tema, con su respuesta fundada en la ley.`
    : 'Buscá en foros, redes sociales argentinas y consultorios de defensa del consumidor (entre otros) cuáles son las dudas más comunes que tienen los consumidores argentinos sobre seguros (autos, hogar, ART, vida, motovehículos, robo, granizo, denuncias de siniestros, exclusiones de pólizas, plazos de pago de la aseguradora, etc.). Elegí UNA pregunta concreta que NO esté ya cubierta en la lista de existentes que te paso, y respondela con fundamento legal argentino.'
  const existingList = existingQuestions.length
    ? `\nPreguntas ya cubiertas (no dupliques ni reformules cercanamente ninguna de estas):\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
    : ''
  return [
    base,
    existingList,
    'Devolvé EXCLUSIVAMENTE un objeto JSON con las claves: question, answer, category.',
    '- question: 12-200 caracteres, terminada con signo de pregunta. Tono natural, como la haría un consumidor.',
    '- answer: HTML simple. Permitido SOLO: <p>, <strong>, <em>, <a href="...">, <ul>, <ol>, <li>, <h3>. Sin atributos style, sin scripts, sin clases. Largo razonable (4-8 párrafos cortos o equivalente).',
    `- category: una de [${VALID_CATEGORIES.join(', ')}]. Elegila según el tema central de la pregunta.`,
    '',
    'Reglas obligatorias para el answer:',
    '1. Citá al menos UNA fuente oficial argentina relevante (Ley 17.418, Ley 24.557, Ley 24.240, Resolución SSN concreta, etc.). Usá el número exacto del artículo/resolución que verificaste en la búsqueda; si no lo verificaste, no lo cites.',
    '2. Cerrá la respuesta con un párrafo final que linkee a las fuentes consultadas, formato: <p><strong>Fuentes:</strong> <a href="...">Texto</a>, <a href="...">Texto</a>.</p>',
    '3. Si la búsqueda no devolvió fuentes oficiales argentinas confiables sobre este tema, NO inventes — devolvé un answer que diga exactamente: "INSUFFICIENT_SOURCES" y nada más.',
  ].join('\n')
}

interface GeminiCallResult {
  draft: DraftJson
  groundingSources: Array<{ uri: string; title?: string }>
  rawResponse: unknown
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
  if (!parsed.question || !parsed.answer || !parsed.category) {
    throw new Error('Gemini JSON missing required fields')
  }
  if (!VALID_CATEGORIES.includes(parsed.category)) {
    throw new Error(`Invalid category from Gemini: ${parsed.category}`)
  }
  return parsed
}

async function callGemini(
  apiKey: string,
  prompt: string,
  useGrounding: boolean,
): Promise<GeminiCallResult> {
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      topP: 0.9,
      maxOutputTokens: 6144,
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

function categoryLabel(c: Category): string {
  const map: Record<Category, string> = {
    general: 'General',
    cobertura: 'Coberturas',
    cotizacion: 'Cotización',
    art: 'ART',
    siniestro: 'Siniestros',
    vehiculos: 'Vehículos',
  }
  return map[c]
}

function buildDraftEmail(opts: {
  draft: DraftJson
  draftId: string
  publishToken: string
  hintText: string | null
  groundingSources: Array<{ uri: string; title?: string }>
}): { html: string; text: string; subject: string } {
  const { draft, draftId, publishToken, hintText, groundingSources } = opts
  const editUrl = `https://www.onseguros.net/admin/?faqDraft=${draftId}`
  const fnBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/publish-faq-draft-api`
  const publishUrl = `${fnBase}?id=${draftId}&token=${encodeURIComponent(publishToken)}`
  const subject = `[OnSeguros] Nueva FAQ propuesta: ${draft.question.substring(0, 80)}`

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
    <p style="margin:8px 0 0;color:#b8b8b8;font-size:13px;font-weight:500;">FAQ propuesta por IA · revisión humana requerida</p>
  </td></tr>
  <tr><td style="padding:32px;">
    ${hintHtml}
    <p style="margin:0 0 16px;color:#101016;font-size:15px;line-height:1.6;">Hola Mariano,</p>
    <p style="margin:0 0 24px;color:#101016;font-size:15px;line-height:1.6;">La IA preparó esta nueva pregunta frecuente con respuesta fundada en ley argentina. Revisala y publicala si te parece, o entrá al panel para editarla antes.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;"><tr>
      <td align="center" style="padding-right:8px;">
        <a href="${editUrl}" style="display:block;background:#fff;color:#2e7ef6;text-decoration:none;padding:14px 24px;border:2px solid #2e7ef6;border-radius:8px;font-weight:600;font-size:15px;text-align:center;">Editar en panel</a>
      </td>
      <td align="center" style="padding-left:8px;">
        <a href="${publishUrl}" style="display:block;background:#2e7ef6;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600;font-size:15px;text-align:center;">Publicar ahora →</a>
      </td>
    </tr></table>

    <p style="margin:0 0 4px;color:#b8b8b8;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Vista previa</p>
    <h1 style="margin:0 0 8px;font-family:'Space Grotesk','Inter',sans-serif;color:#101016;font-size:22px;line-height:1.3;letter-spacing:-0.02em;">${draft.question}</h1>
    <p style="margin:0 0 16px;"><span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;background:#e0e7ff;color:#4338ca;text-transform:uppercase;letter-spacing:.04em;">${categoryLabel(draft.category)}</span></p>
    <hr style="border:none;border-top:1px solid rgba(16,16,22,.1);margin:0 0 24px;" />
    <div style="color:#101016;font-size:15px;line-height:1.7;">${draft.answer}</div>
    <hr style="border:none;border-top:1px solid rgba(16,16,22,.1);margin:24px 0;" />
    ${sourcesHtml}
    <p style="margin:0;color:#b8b8b8;font-size:12px;line-height:1.5;">El botón "Publicar ahora" funciona una sola vez. Si editás la respuesta en el panel, este enlace deja de servir y vas a tener que publicar desde el panel.</p>
  </td></tr>
  <tr><td style="background:#fbfbfe;padding:16px 32px;border-top:1px solid rgba(16,16,22,.1);text-align:center;">
    <p style="margin:0;color:#b8b8b8;font-size:11px;">OnSeguros · automatización de FAQs</p>
  </td></tr>
</table>
</td></tr></table></body></html>`

  const text = [
    `Nueva FAQ propuesta — ${draft.question}`,
    `Categoría: ${categoryLabel(draft.category)}`,
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
  const subject = '[OnSeguros] Falló la generación de la FAQ'
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#fbfbfe;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid rgba(16,16,22,.1);border-radius:12px;padding:24px;">
<h2 style="margin:0 0 12px;color:#101016;">Falló la generación de la FAQ</h2>
<p style="color:#5a5a64;line-height:1.5;">El cron quincenal corrió pero la IA no pudo armar una FAQ esta vez. Detalles abajo. Lo podés intentar de nuevo manualmente desde el panel.</p>
<pre style="background:#fbfbfe;border:1px solid rgba(16,16,22,.1);border-radius:8px;padding:12px;font-size:12px;color:#8b3a3a;white-space:pre-wrap;word-break:break-word;">${message}</pre>
<p style="color:#b8b8b8;font-size:12px;margin-top:16px;">OnSeguros · automatización de FAQs</p>
</div></body></html>`
  const text = `Falló la generación de la FAQ.\n\n${message}`
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
      from: 'OnSeguros FAQs <newsletter@onseguros.net>',
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
      // Bi-weekly cadence: skip if any open FAQ draft exists from the last 13 days.
      const thirteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString()
      const { data: pending } = await supabaseAdmin
        .from('faq_drafts')
        .select('id, generated_at')
        .in('status', ['pending', 'edited'])
        .gte('generated_at', thirteenDaysAgo)
        .order('generated_at', { ascending: false })
        .limit(1)
      if (pending && pending.length > 0) {
        return jsonResponse({
          skipped: true,
          reason: 'Open FAQ draft from the last 13 days still pending review',
          existing_draft_id: pending[0].id,
        })
      }
    }

    const { data: hintRow } = await supabaseAdmin
      .from('faq_topic_hints')
      .select('id, hint')
      .is('used_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    const hintId: string | null = hintRow?.id ?? null
    const hintText: string | null = hintRow?.hint ?? null

    const { data: existingFaqs } = await supabaseAdmin
      .from('faqs')
      .select('id, question')
      .order('order_number', { ascending: true })
    const existingRows: Array<{ id: string; question: string }> = (existingFaqs ?? []).map(
      (r: { id: string; question: string }) => ({ id: r.id, question: r.question }),
    )
    const existingQuestionTexts = existingRows.map((r) => r.question)

    const draftId = crypto.randomUUID()

    let draft: DraftJson
    let groundingSources: Array<{ uri: string; title?: string }> = []
    let model = `${GEMINI_MODEL}+google_search`
    try {
      const result = await callGemini(
        geminiKey,
        buildUserPrompt({ hint: hintText, existingQuestions: existingQuestionTexts }),
        true,
      )
      draft = result.draft
      groundingSources = result.groundingSources
    } catch (err) {
      console.warn('Grounded call failed, retrying without grounding:', err)
      const result = await callGemini(
        geminiKey,
        buildUserPrompt({ hint: hintText, existingQuestions: existingQuestionTexts }),
        false,
      )
      draft = result.draft
      model = `${GEMINI_MODEL}+strict-json`
    }

    if (draft.answer.trim() === 'INSUFFICIENT_SOURCES') {
      const errMsg = 'insufficient_sources: AI did not find authoritative Argentine sources for this topic'
      await supabaseAdmin
        .from('faq_drafts')
        .insert([{
          id: draftId,
          question: draft.question,
          answer: '(sin respuesta — fuentes insuficientes)',
          category: draft.category,
          hint_id: hintId,
          status: 'failed',
          publish_token: 'n/a',
          generation_metadata: {
            model,
            grounding_sources: groundingSources,
            had_hint: Boolean(hintText),
            existing_faq_count_at_gen: existingRows.length,
          },
          error_message: errMsg,
        }])
      return jsonResponse({ skipped: true, reason: errMsg, draft_id: draftId })
    }

    const dup = findNearDuplicate(draft.question, existingRows)
    if (dup) {
      const errMsg = `near_duplicate_of:${dup.id} (jaccard=${dup.score.toFixed(2)})`
      await supabaseAdmin
        .from('faq_drafts')
        .insert([{
          id: draftId,
          question: draft.question,
          answer: draft.answer,
          category: draft.category,
          hint_id: hintId,
          status: 'failed',
          publish_token: 'n/a',
          generation_metadata: {
            model,
            grounding_sources: groundingSources,
            had_hint: Boolean(hintText),
            existing_faq_count_at_gen: existingRows.length,
            dedup_check_passed: false,
          },
          error_message: errMsg,
        }])
      if (hintId) {
        // Don't burn the hint on a near-duplicate failure — leave it usable for next run.
      }
      return jsonResponse({ skipped: true, reason: errMsg, draft_id: draftId })
    }

    const generatedAt = new Date().toISOString()
    const publishToken = await signDraftToken(
      { draftId, rotationStamp: generatedAt, kind: 'faq' },
      draftSecret,
    )

    const { error: insertErr } = await supabaseAdmin
      .from('faq_drafts')
      .insert([{
        id: draftId,
        question: draft.question,
        answer: draft.answer,
        category: draft.category,
        hint_id: hintId,
        status: 'pending',
        publish_token: publishToken,
        generated_at: generatedAt,
        updated_at: generatedAt,
        generation_metadata: {
          model,
          grounding_sources: groundingSources,
          had_hint: Boolean(hintText),
          existing_faq_count_at_gen: existingRows.length,
          dedup_check_passed: true,
        },
      }])
    if (insertErr) throw insertErr

    if (hintId) {
      await supabaseAdmin
        .from('faq_topic_hints')
        .update({ used_at: new Date().toISOString(), used_by_draft_id: draftId })
        .eq('id', hintId)
    }

    const email = buildDraftEmail({
      draft,
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
        .from('faq_drafts')
        .update({ sent_to_admin_at: new Date().toISOString() })
        .eq('id', draftId)
    } catch (mailErr) {
      console.error('Email send failed:', mailErr)
      await supabaseAdmin
        .from('faq_drafts')
        .update({ error_message: `email_send_failed: ${(mailErr as Error).message}` })
        .eq('id', draftId)
    }

    return jsonResponse({
      success: true,
      draft_id: draftId,
      category: draft.category,
      had_hint: Boolean(hintText),
      grounding_count: groundingSources.length,
    })
  } catch (error) {
    const message = (error as Error).message || String(error)
    console.error('generate-faq-draft failed:', message)

    try {
      await supabaseAdmin
        .from('faq_drafts')
        .insert([{
          id: crypto.randomUUID(),
          question: '[Falla en generación]',
          answer: '(no answer)',
          category: 'general',
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
