export interface GoogleTokenPayload {
  iss: string;
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  aud: string;
  exp: number;
}

/**
 * Validates Google ID token via Google's tokeninfo API.
 * Runs in both Cloudflare Workers edge and Node.js environments.
 */
export async function verifyGoogleIdToken(
  credential: string,
  expectedClientId?: string
): Promise<GoogleTokenPayload | null> {
  if (!credential || typeof credential !== "string") {
    return null;
  }

  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`
    );

    if (!res.ok) {
      return null;
    }

    const payload = (await res.json()) as Record<string, unknown>;

    const iss = typeof payload.iss === "string" ? payload.iss : "";
    if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
      return null;
    }

    const aud = typeof payload.aud === "string" ? payload.aud : "";
    if (expectedClientId && aud !== expectedClientId) {
      return null;
    }

    const exp = typeof payload.exp === "string" ? parseInt(payload.exp, 10) : typeof payload.exp === "number" ? payload.exp : 0;
    const nowSec = Math.floor(Date.now() / 1000);
    if (exp <= nowSec) {
      return null;
    }

    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    if (!email) {
      return null;
    }

    const emailVerified =
      payload.email_verified === "true" || payload.email_verified === true;

    return {
      iss,
      sub: typeof payload.sub === "string" ? payload.sub : "",
      email,
      email_verified: emailVerified,
      name: typeof payload.name === "string" ? payload.name : undefined,
      picture: typeof payload.picture === "string" ? payload.picture : undefined,
      given_name: typeof payload.given_name === "string" ? payload.given_name : undefined,
      family_name: typeof payload.family_name === "string" ? payload.family_name : undefined,
      aud,
      exp,
    };
  } catch {
    return null;
  }
}
