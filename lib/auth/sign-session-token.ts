import { createHmac, timingSafeEqual } from 'node:crypto';
import { base64UrlEncode } from '@/lib/auth/jwt-b64url';

function encodeJson(obj: unknown): string {
  const json = JSON.stringify(obj);
  return base64UrlEncode(new TextEncoder().encode(json));
}

/**
 * Creates a compact HS256 JWT (Node-only). Used by the login route.
 */
export function signSessionToken(secret: string, ttlSeconds: number): string {
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = encodeJson({
    role: 'viewer',
    iat: now,
    exp: now + ttlSeconds,
  });
  const signingInput = `${header}.${payload}`;
  const sig = createHmac('sha256', secret).update(signingInput).digest();
  const sigPart = base64UrlEncode(sig);
  return `${signingInput}.${sigPart}`;
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}
