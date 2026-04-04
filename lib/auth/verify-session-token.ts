import { base64UrlDecodeToBytes } from "@/lib/auth/jwt-b64url";

type JwtPayload = {
  exp?: number;
};

/**
 * Verifies HS256 JWT using Web Crypto (Edge-safe). Must match `signSessionToken`.
 */
export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }
  const [h, p, s] = parts as [string, string, string];
  const signingInput = `${h}.${p}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sigBytes = new Uint8Array(base64UrlDecodeToBytes(s));
  const data = new TextEncoder().encode(signingInput);
  let ok: boolean;
  try {
    ok = await crypto.subtle.verify("HMAC", key, sigBytes as BufferSource, data);
  } catch {
    return false;
  }
  if (!ok) {
    return false;
  }

  let payload: JwtPayload;
  try {
    const json = new TextDecoder().decode(base64UrlDecodeToBytes(p));
    payload = JSON.parse(json) as JwtPayload;
  } catch {
    return false;
  }

  if (typeof payload.exp !== "number") {
    return false;
  }
  return payload.exp > Math.floor(Date.now() / 1000);
}
