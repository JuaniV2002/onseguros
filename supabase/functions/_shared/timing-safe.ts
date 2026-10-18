// Constant-time string compare for shared secrets and tokens, so response
// timing doesn't reveal how many leading characters matched. Only the length
// can leak (secrets here have a fixed length).
export function timingSafeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}
