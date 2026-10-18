import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse } from './cors.ts'

// Admin endpoints: require a real logged-in user's access token.
// The gateway's verify_jwt also accepts the public anon key (it is a JWT with
// no user), so it is not enough on its own. Sign-ups are open, so the user's
// email must also be in the ADMIN_EMAILS secret (comma-separated). Returns a
// 401/403 Response to send back, or null when the caller is an admin.
//   const denied = await requireUser(req)
//   if (denied) return denied
export async function requireUser(req: Request): Promise<Response | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return jsonResponse({ error: 'Unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return jsonResponse({ error: 'Unauthorized' }, 401)
  if (!isAdminEmail(data.user.email, Deno.env.get('ADMIN_EMAILS'))) {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }
  return null
}

// Unset or empty ADMIN_EMAILS → nobody is an admin (fail closed).
export function isAdminEmail(email: string | null | undefined, allowlist: string | null | undefined): boolean {
  if (!email || !allowlist) return false
  const allowed = allowlist.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return allowed.includes(email.trim().toLowerCase())
}
