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
    const [pathPart, queryPart] = urlStr.split("?");
    const path = pathPart.includes("://") ? new URL(pathPart).pathname : pathPart;
    if (!queryPart) {
      return path;
    }
    const params = new URLSearchParams(queryPart);
    params.delete("sig");
    params.delete("ts");
    const remaining = params.toString();
    return remaining ? `${path}?${remaining}` : path;
  } catch {
    return urlStr.split("?")[0] || "/";
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

export type ClientEcdhKeyJwk = ClientPublicKeyJwk;

export function isEcP256Jwk(v: unknown): v is ClientPublicKeyJwk {
  return (
    typeof v === "object" &&
    v !== null &&
    (v as ClientPublicKeyJwk).kty === "EC" &&
    (v as ClientPublicKeyJwk).crv === "P-256" &&
    typeof (v as ClientPublicKeyJwk).x === "string" &&
    typeof (v as ClientPublicKeyJwk).y === "string"
  );
}


export interface EncryptedStreamEnvelope {
  encrypted: true;
  serverKey: ClientEcdhKeyJwk;
  iv: string;
  data: string;
}

let ecdhKeyPairPromise: Promise<CryptoKeyPair> | null = null;
let cachedEcdhPublicKeyJwk: ClientEcdhKeyJwk | null = null;

export async function getTabEcdhKeyPair(): Promise<CryptoKeyPair | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  if (!ecdhKeyPairPromise) {
    ecdhKeyPairPromise = subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveKey"]
    ).catch((err) => {
      ecdhKeyPairPromise = null;
      throw err;
    });
  }
  return ecdhKeyPairPromise;
}

export async function getTabEcdhPublicKeyJwk(): Promise<ClientEcdhKeyJwk | null> {
  if (cachedEcdhPublicKeyJwk) return cachedEcdhPublicKeyJwk;

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  const keyPair = await getTabEcdhKeyPair();
  if (!keyPair) return null;

  const exported = await subtle.exportKey("jwk", keyPair.publicKey);
  if (
    exported.kty === "EC" &&
    exported.crv === "P-256" &&
    typeof exported.x === "string" &&
    typeof exported.y === "string"
  ) {
    cachedEcdhPublicKeyJwk = {
      kty: "EC",
      crv: "P-256",
      x: exported.x,
      y: exported.y,
    };
    return cachedEcdhPublicKeyJwk;
  }
  return null;
}

function uint8ToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptStreamResponse(
  payload: unknown,
  clientKey: ClientEcdhKeyJwk
): Promise<EncryptedStreamEnvelope> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto subtle not available for encryption");
  }

  const serverKeyPair = await subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  const importedClientKey = await subtle.importKey(
    "jwk",
    clientKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const aesKey = await subtle.deriveKey(
    { name: "ECDH", public: importedClientKey },
    serverKeyPair.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const cipherBuffer = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    aesKey,
    encoded
  );

  const serverJwk = (await subtle.exportKey("jwk", serverKeyPair.publicKey)) as ClientEcdhKeyJwk;

  return {
    encrypted: true,
    serverKey: {
      kty: "EC",
      crv: "P-256",
      x: serverJwk.x,
      y: serverJwk.y,
    },
    iv: uint8ToBase64(iv),
    data: uint8ToBase64(new Uint8Array(cipherBuffer)),
  };
}

export async function decryptStreamResponse<T>(
  envelope: EncryptedStreamEnvelope
): Promise<T> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("WebCrypto subtle not available for decryption");
  }

  const keyPair = await getTabEcdhKeyPair();
  if (!keyPair) {
    throw new Error("Tab ECDH key pair unavailable");
  }

  const importedServerKey = await subtle.importKey(
    "jwk",
    envelope.serverKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const aesKey = await subtle.deriveKey(
    { name: "ECDH", public: importedServerKey },
    keyPair.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const iv = base64ToUint8(envelope.iv);
  const cipherBytes = base64ToUint8(envelope.data);

  const decryptedBuffer = await subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    aesKey,
    cipherBytes as unknown as BufferSource
  );

  const decodedText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(decodedText) as T;
}

export function resetTabCryptoStateForTests(): void {
  keyPairPromise = null;
  cachedPublicKeyJwk = null;
  ecdhKeyPairPromise = null;
  cachedEcdhPublicKeyJwk = null;
}
