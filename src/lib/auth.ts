/**
 * Session admin : jeton `expiration.signature` signé en HMAC-SHA256 avec une
 * clé dérivée de ADMIN_PASSWORD (Web Crypto : utilisable dans le middleware
 * Edge comme côté serveur Node). Changer le mot de passe invalide toutes les
 * sessions.
 */

export const ADMIN_COOKIE = "catalogues_admin";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours, en secondes

const enc = new TextEncoder();

function hmacKey(secret: string, usage: "session" | "compare") {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(`catalogues-admin:${usage}:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]{64}$/.test(hex)) return null;
  const out = new Uint8Array(new ArrayBuffer(32));
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function createSessionToken(secret: string): Promise<string> {
  const exp = String(Date.now() + SESSION_MAX_AGE * 1000);
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "session"), enc.encode(exp));
  return `${exp}.${toHex(sig)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret) return false;
  const [exp, sigHex] = token.split(".");
  if (!exp || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const sig = sigHex ? fromHex(sigHex) : null;
  if (!sig) return false;
  // verify() compare en temps constant.
  return crypto.subtle.verify("HMAC", await hmacKey(secret, "session"), sig, enc.encode(exp));
}

/** Compare un mot de passe saisi au mot de passe attendu, en temps constant. */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const key = await hmacKey(expected, "compare");
  const expectedSig = await crypto.subtle.sign("HMAC", key, enc.encode(expected));
  return crypto.subtle.verify("HMAC", key, expectedSig, enc.encode(input));
}
