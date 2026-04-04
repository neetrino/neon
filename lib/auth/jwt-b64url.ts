export function base64UrlEncode(data: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < data.length; i += 1) {
    bin += String.fromCharCode(data[i]!);
  }
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecodeToBytes(segment: string): Uint8Array {
  const pad = 4 - (segment.length % 4);
  const padded = segment + (pad < 4 ? "=".repeat(pad) : "");
  const b64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}
