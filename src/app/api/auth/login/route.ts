import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken, SESSION_COOKIE } from '@/lib/auth'

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export async function POST(req: NextRequest) {
  const validId = process.env.DASHBOARD_LOGIN_ID?.trim()
  const validPassword = process.env.DASHBOARD_LOGIN_PASSWORD?.trim()
  const secret = process.env.AUTH_SECRET?.trim()

  if (!validId || !validPassword || !secret) {
    return NextResponse.json({ error: 'Login is not configured on the server' }, { status: 500 })
  }

  let body: { id?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (body.id?.trim() !== validId || body.password?.trim() !== validPassword) {
    return NextResponse.json({ error: 'Invalid ID or password' }, { status: 401 })
  }

  const token = await createSessionToken(secret, MAX_AGE_SECONDS)

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  return res
}
