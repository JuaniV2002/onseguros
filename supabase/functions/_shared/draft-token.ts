// HMAC-SHA256 publish token. Inputs: draft_id + generated_at ISO string.
// Single-use enforcement is via post_drafts.status (rejected unless pending|edited).
// Editing rotates generated_at-equivalent input (we use updated_at for edited drafts)
// to invalidate stale tokens from the original email.

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return toBase64Url(new Uint8Array(sig))
}

export interface DraftTokenPayload {
  draftId: string
  // ISO timestamp that rotates whenever the draft mutates (use updated_at).
  rotationStamp: string
}

export async function signDraftToken(
  payload: DraftTokenPayload,
  secret: string,
): Promise<string> {
  return hmac(secret, `${payload.draftId}.${payload.rotationStamp}`)
}

export async function verifyDraftToken(
  payload: DraftTokenPayload,
  token: string,
  secret: string,
): Promise<boolean> {
  const expected = await signDraftToken(payload, secret)
  return timingSafeEqual(expected, token)
}
