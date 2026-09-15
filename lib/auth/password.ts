import { compare } from "bcryptjs";

const PBKDF2_ITERATIONS = 100_000;
const KEY_LEN_BYTES = 32; // 256 bits
const SALT_LEN_BYTES = 16; // 128 bits

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Hash password using Web Crypto PBKDF2-HMAC-SHA256.
 * Format: "pbkdf2:sha256:100000:<salt-base64>:<hash-base64>"
 * Native C++ execution in Cloudflare Workers / Node.js isolates (zero CPU limit issues).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN_BYTES));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LEN_BYTES * 8
  );

  const saltB64 = toBase64(salt);
  const hashB64 = toBase64(derivedBits);

  return `pbkdf2:sha256:${PBKDF2_ITERATIONS}:${saltB64}:${hashB64}`;
}

/**
 * Verifies password against hash.
 * Backward compatible: automatically checks existing bcrypt hashes ($2a$, $2b$, $2y$)
 * as well as modern PBKDF2 hashes.
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (!password || !passwordHash) {
    return false;
  }

  // Modern Web Crypto PBKDF2 hash
  if (passwordHash.startsWith("pbkdf2:sha256:")) {
    const parts = passwordHash.split(":");
    if (parts.length !== 5) {
      return false;
    }

    const iterations = parseInt(parts[2], 10);
    const salt = fromBase64(parts[3]);
    const expectedHash = fromBase64(parts[4]);

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      expectedHash.byteLength * 8
    );

    const derivedBytes = new Uint8Array(derivedBits);
    if (derivedBytes.byteLength !== expectedHash.byteLength) {
      return false;
    }

    // Constant-time comparison
    let mismatch = 0;
    for (let i = 0; i < derivedBytes.byteLength; i++) {
      mismatch |= derivedBytes[i] ^ expectedHash[i];
    }
    return mismatch === 0;
  }

  // Backward compatibility: existing legacy bcrypt hashes ($2a$, $2b$, $2y$)
  if (passwordHash.startsWith("$2a$") || passwordHash.startsWith("$2b$") || passwordHash.startsWith("$2y$")) {
    try {
      return await compare(password, passwordHash);
    } catch {
      return false;
    }
  }

  return false;
}