export const SESSION_COOKIE = 'fc_session'

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmac(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return toHex(signature)
}

export async function createSessionToken(secret: string, maxAgeSeconds: number): Promise<string> {
  const expires = Date.now() + maxAgeSeconds * 1000
  const signature = await hmac(secret, `${expires}`)
  return `${expires}.${signature}`
}

export async function verifySessionToken(
  token: string | undefined | null,
  secret: string,
): Promise<boolean> {
  if (!token) return false

  const [expiresRaw, signature] = token.split('.')
  if (!expiresRaw || !signature) return false

  const expected = await hmac(secret, expiresRaw)
  if (expected !== signature) return false

  const expires = Number(expiresRaw)
  if (!Number.isFinite(expires) || Date.now() > expires) return false

  return true
}
