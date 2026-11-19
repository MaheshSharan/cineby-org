export type MediaType = 'movie' | 'tv';

export interface DecryptedMediaToken {
  id: number;
  mediaType: MediaType;
}

const MAGIC = 0xcb710000;
const TYPE_MOVIE = 0x0001;
const TYPE_TV = 0x0002;

const SEED1 = 0x9747b28c;
const SEED2 = 0x1b873593;

const ROUND_KEYS: readonly (readonly [number, number])[] = [
  [0x85ebca6b, 0xc2b2ae35],
  [0x7feb352d, 0x846ca68b],
  [0x9e3779b9, 0x517cc1b7],
  [0x27d4eb2f, 0x165667b1],
];

// Precomputed 2-hex-char table for fast byte serialization
const HEX_BYTE: string[] = new Array<string>(256);
for (let i = 0; i < 256; i++) {
  HEX_BYTE[i] = (i < 16 ? '0' : '') + i.toString(16);
}

// Precomputed 256-entry lookup table for hex decoding & validation (lowercase only)
const HEX_VAL = new Int8Array(256).fill(-1);
for (let i = 0; i < 10; i++) {
  HEX_VAL[48 + i] = i; // '0'-'9'
}
for (let i = 0; i < 6; i++) {
  HEX_VAL[97 + i] = 10 + i; // 'a'-'f'
}

function fmix32(h: number): number {
  let v = (h ^ (h >>> 16)) >>> 0;
  v = Math.imul(v, 0x85ebca6b) >>> 0;
  v = (v ^ (v >>> 13)) >>> 0;
  v = Math.imul(v, 0xc2b2ae35) >>> 0;
  return (v ^ (v >>> 16)) >>> 0;
}

function roundF0(r0: number, r1: number, k0: number): number {
  const m0 = (r0 ^ k0) >>> 0;
  return fmix32((fmix32(m0) + r1) >>> 0);
}

function roundF1(r0: number, r1: number, k1: number, f0: number): number {
  const m1 = (r1 ^ k1) >>> 0;
  return fmix32((fmix32((m1 ^ f0) >>> 0) + r0) >>> 0);
}

function computeChecksum0(w0: number, w1: number): number {
  let h = (w0 ^ SEED1) >>> 0;
  h = Math.imul(h ^ (w1 >>> 0), 0xcc9e2d51) >>> 0;
  h = ((h << 15) | (h >>> 17)) >>> 0;
  h = Math.imul(h, 0x1b873593) >>> 0;
  return fmix32(h);
}

function computeChecksum1(w0: number, w1: number, c0: number): number {
  let h = (w1 ^ SEED2) >>> 0;
  h = Math.imul(h ^ (w0 >>> 0), 0x85ebca6b) >>> 0;
  h = ((h << 13) | (h >>> 19)) >>> 0;
  h = Math.imul(h ^ (c0 >>> 0), 0xc2b2ae35) >>> 0;
  return fmix32(h);
}

function wordToHex(w: number): string {
  return (
    HEX_BYTE[(w >>> 24) & 0xff] +
    HEX_BYTE[(w >>> 16) & 0xff] +
    HEX_BYTE[(w >>> 8) & 0xff] +
    HEX_BYTE[w & 0xff]
  );
}

/**
 * Encrypts a media ID and mediaType into a 32-character lowercase hex token.
 * Uses a zero-dependency, pure bitwise 4-round Feistel-Murmur cipher permutation.
 */
export function encryptMediaToken(id: number, mediaType: 'movie' | 'tv'): string {
  if (!Number.isInteger(id) || id < 0 || id > 0xffffffff) {
    throw new TypeError('id must be an unsigned 32-bit integer');
  }
  if (mediaType !== 'movie' && mediaType !== 'tv') {
    throw new TypeError("mediaType must be 'movie' or 'tv'");
  }

  let l0 = id >>> 0;
  let l1 = (MAGIC | (mediaType === 'movie' ? TYPE_MOVIE : TYPE_TV)) >>> 0;
  let r0 = computeChecksum0(l0, l1);
  let r1 = computeChecksum1(l0, l1, r0);

  for (let i = 0; i < 4; i++) {
    const k0 = ROUND_KEYS[i][0];
    const k1 = ROUND_KEYS[i][1];
    const f0 = roundF0(r0, r1, k0);
    const f1 = roundF1(r0, r1, k1, f0);

    const nextL0 = r0;
    const nextL1 = r1;
    const nextR0 = (l0 ^ f0) >>> 0;
    const nextR1 = (l1 ^ f1) >>> 0;

    l0 = nextL0;
    l1 = nextL1;
    r0 = nextR0;
    r1 = nextR1;
  }

  return wordToHex(l0) + wordToHex(l1) + wordToHex(r0) + wordToHex(r1);
}

/**
 * Decrypts a 32-character hex token back into { id, mediaType }.
 * Validates format and internal checksum; returns null on invalid or tampered tokens.
 */
export function decryptMediaToken(token: string): DecryptedMediaToken | null {
  if (typeof token !== 'string' || token.length !== 32) {
    return null;
  }

  let l0 = 0;
  for (let i = 0; i < 8; i++) {
    const v = HEX_VAL[token.charCodeAt(i)];
    if (v < 0) return null;
    l0 = (l0 << 4) | v;
  }
  l0 = l0 >>> 0;

  let l1 = 0;
  for (let i = 8; i < 16; i++) {
    const v = HEX_VAL[token.charCodeAt(i)];
    if (v < 0) return null;
    l1 = (l1 << 4) | v;
  }
  l1 = l1 >>> 0;

  let r0 = 0;
  for (let i = 16; i < 24; i++) {
    const v = HEX_VAL[token.charCodeAt(i)];
    if (v < 0) return null;
    r0 = (r0 << 4) | v;
  }
  r0 = r0 >>> 0;

  let r1 = 0;
  for (let i = 24; i < 32; i++) {
    const v = HEX_VAL[token.charCodeAt(i)];
    if (v < 0) return null;
    r1 = (r1 << 4) | v;
  }
  r1 = r1 >>> 0;

  for (let i = 3; i >= 0; i--) {
    const k0 = ROUND_KEYS[i][0];
    const k1 = ROUND_KEYS[i][1];
    const f0 = roundF0(l0, l1, k0);
    const f1 = roundF1(l0, l1, k1, f0);

    const prevR0 = l0;
    const prevR1 = l1;
    const prevL0 = (r0 ^ f0) >>> 0;
    const prevL1 = (r1 ^ f1) >>> 0;

    l0 = prevL0;
    l1 = prevL1;
    r0 = prevR0;
    r1 = prevR1;
  }

  const magic = (l1 & 0xffff0000) >>> 0;
  if (magic !== MAGIC) {
    return null;
  }

  const typeCode = l1 & 0x0000ffff;
  if (typeCode !== TYPE_MOVIE && typeCode !== TYPE_TV) {
    return null;
  }

  const expectedC0 = computeChecksum0(l0, l1);
  if (r0 !== expectedC0) {
    return null;
  }

  const expectedC1 = computeChecksum1(l0, l1, r0);
  if (r1 !== expectedC1) {
    return null;
  }

  return {
    id: l0 >>> 0,
    mediaType: typeCode === TYPE_MOVIE ? 'movie' : 'tv',
  };
}
