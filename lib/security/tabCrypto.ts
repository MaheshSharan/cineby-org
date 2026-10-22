/**
 * Browser-tab bound WebCrypto ECDSA (P-256) identity.
 *
 * Generates an in-memory, non-extractable private key per browser tab session.
 * Used for Just-In-Time (JIT) signing of media segment requests without
 * custom HTTP headers (avoiding CORS preflight requests).
 */

export interface ClientPublicKeyJwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
}

let keyPairPromise: Promise<CryptoKeyPair> | null = null;
let cachedPublicKeyJwk: ClientPublicKeyJwk | null = null;

/**
 * Gets or initializes the tab's non-extractable ECDSA key pair.
 */
export async function getTabKeyPair(): Promise<CryptoKeyPair | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return null;
  }

  if (!keyPairPromise) {
    keyPairPromise = subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false, // non-extractable private key
      ["sign"]
    ).catch((err) => {
      keyPairPromise = null;
      throw err;
    });
  }

  return keyPairPromise;
}

/**
 * Obtains the public key JWK representation for sending to /api/stream/resolve.
 */
export async function getTabPublicKeyJwk(): Promise<ClientPublicKeyJwk | null> {
  if (cachedPublicKeyJwk) {
    return cachedPublicKeyJwk;
  }

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return null;
  }

  const keyPair = await getTabKeyPair();
  if (!keyPair) {
    return null;
  }

  const exported = await subtle.exportKey("jwk", keyPair.publicKey);
  if (
    exported.kty === "EC" &&
    exported.crv === "P-256" &&
    typeof exported.x === "string" &&
    typeof exported.y === "string"
  ) {
    cachedPublicKeyJwk = {
      kty: "EC",
      crv: "P-256",
      x: exported.x,
      y: exported.y,
    };
    return cachedPublicKeyJwk;
  }

  return null;
}

/**
 * Normalizes a URL to a canonical path + query string for signing and verification.
 * Strips existing 'ts' and 'sig' parameters.
 */
export function buildCanonicalTarget(urlStr: string): string {
  try {
    const parsed = new URL(urlStr, "https://cineby.internal");
    parsed.searchParams.delete("sig");
    parsed.searchParams.delete("ts");
    return `${parsed.pathname}${parsed.search ? parsed.search : ""}`;
  } catch {
    const withoutQuery = urlStr.split("?")[0] || "/";
    return withoutQuery;
  }
}

/**
 * Encodes Uint8Array bytes to RFC 7515 base64url string.
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Converts RFC 7515 base64url string to Uint8Array.
 */
export function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Constructs the canonical text payload to sign for a segment request.
 */
export function buildSignaturePayload(canonicalTarget: string, timestamp: number): string {
  return `GET\n${canonicalTarget}\n${timestamp}`;
}

/**
 * Signs a media segment URL Just-In-Time by appending &ts=...&sig=... to the query string.
 * Uses ECDSA P-256 (SHA-256).
 */
export async function signSegmentUrl(rawUrl: string, forcedTime?: number): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return rawUrl;
  }

  const keyPair = await getTabKeyPair();
  if (!keyPair) {
    return rawUrl;
  }

  const timestamp = forcedTime ?? Date.now();
  const canonicalTarget = buildCanonicalTarget(rawUrl);
  const payload = buildSignaturePayload(canonicalTarget, timestamp);

  const encoder = new TextEncoder();
  const signatureBuffer = await subtle.sign(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    keyPair.privateKey,
    encoder.encode(payload)
  );

  const sigBase64Url = bytesToBase64Url(new Uint8Array(signatureBuffer));

  const separator = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${separator}ts=${timestamp}&sig=${sigBase64Url}`;
}

/**
 * Clears in-memory keys (used for unit tests).
 */
export function resetTabCryptoStateForTests(): void {
  keyPairPromise = null;
  cachedPublicKeyJwk = null;
}
