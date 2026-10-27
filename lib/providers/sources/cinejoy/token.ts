import crypto from "node:crypto";

function getCipherKey() {
  const secret = process.env.STREAM_PROXY_SECRET || "";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts an upstream stream request descriptor using AES-256-GCM.
 * Resulting token is compact, URL-safe base64url, and hides all URLs and headers.
 */
export function encryptStreamToken(
  url: string,
  origin = "https://cinejoy.pk",
  referer = "https://cinejoy.pk/",
  ttlMs = 6 * 3600 * 1000
): string {
  const key = getCipherKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const payload = JSON.stringify({
    u: url,
    o: origin,
    r: referer,
    e: Date.now() + ttlMs,
  });

  const enc = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

/**
 * Decrypts and validates an AES-256-GCM stream token.
 */
export function decryptStreamToken(token: string): { url: string; origin: string; referer: string } | null {
  try {
    const key = getCipherKey();
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 28) return null;

    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
    const data = JSON.parse(decrypted) as { u?: string; o?: string; r?: string; e?: number };

    if (!data.u || typeof data.e !== "number" || data.e < Date.now()) {
      return null;
    }

    return {
      url: data.u,
      origin: data.o || "https://cinejoy.pk",
      referer: data.r || "https://cinejoy.pk/",
    };
  } catch {
    return null;
  }
}
