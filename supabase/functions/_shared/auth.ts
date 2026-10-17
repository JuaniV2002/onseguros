import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsonResponse } from './cors.ts'

// Admin endpoints: require a real logged-in user's access token.
// The gateway's verify_jwt also accepts the public anon key (it is a JWT with
// no user), so it is not enough on its own. Returns a 401 Response to send
// back, or null when the caller is a logged-in user.
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
  return null
}
