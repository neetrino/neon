import { NextResponse } from 'next/server';
import { COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/auth/dashboard-session';
import { signSessionToken, timingSafeStringEqual } from '@/lib/auth/sign-session-token';

type Body = { password?: string };

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const password = body.password ?? '';
  const expected = process.env.DASHBOARD_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!expected || !jwtSecret) {
    return NextResponse.json({ error: 'Dashboard auth not configured' }, { status: 503 });
  }

  if (!timingSafeStringEqual(password, expected)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = signSessionToken(jwtSecret, SESSION_TTL_SECONDS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
