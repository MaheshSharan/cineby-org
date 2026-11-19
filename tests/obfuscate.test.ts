import { describe, expect, it } from 'vitest';
import { decryptMediaToken, encryptMediaToken } from '@/lib/seo/obfuscate';

describe('Feistel-Murmur Media Token Obfuscation', () => {
  it('outputs exactly 32 lowercase hex characters', () => {
    const tokenMovie = encryptMediaToken(550, 'movie');
    const tokenTv = encryptMediaToken(1399, 'tv');

    expect(tokenMovie).toMatch(/^[0-9a-f]{32}$/);
    expect(tokenTv).toMatch(/^[0-9a-f]{32}$/);
    expect(tokenMovie.length).toBe(32);
    expect(tokenTv.length).toBe(32);
  });

  it('correctly round-trips 1,000+ sequential and edge-case IDs', () => {
    // Sequential 1 to 1000 for both movie and tv
    for (let id = 1; id <= 1000; id++) {
      const type = id % 2 === 0 ? 'movie' : 'tv';
      const token = encryptMediaToken(id, type);
      const decrypted = decryptMediaToken(token);

      expect(decrypted).toEqual({ id, mediaType: type });
    }

    // Boundary and edge case IDs
    const edgeIds = [0, 1, 42, 550, 1399, 999999, 10000000, 2147483647, 4294967295];
    for (const id of edgeIds) {
      for (const mediaType of ['movie', 'tv'] as const) {
        const token = encryptMediaToken(id, mediaType);
        const decrypted = decryptMediaToken(token);
        expect(decrypted).toEqual({ id, mediaType });
      }
    }
  });

  it('generates distinct tokens for different media types with the same ID', () => {
    const movieToken = encryptMediaToken(100, 'movie');
    const tvToken = encryptMediaToken(100, 'tv');
    expect(movieToken).not.toBe(tvToken);
  });

  it('generates distinct tokens for different IDs', () => {
    const token1 = encryptMediaToken(100, 'movie');
    const token2 = encryptMediaToken(101, 'movie');
    expect(token1).not.toBe(token2);
  });

  it('rejects tampered tokens with single-character mutations', () => {
    const validToken = encryptMediaToken(12345, 'movie');

    // Mutate each of the 32 positions
    for (let i = 0; i < 32; i++) {
      const origChar = validToken[i];
      const replacementChar = origChar === 'a' ? 'b' : 'a';
      const tampered =
        validToken.slice(0, i) + replacementChar + validToken.slice(i + 1);

      expect(decryptMediaToken(tampered)).toBeNull();
    }
  });

  it('rejects invalid lengths and malformed tokens', () => {
    const validToken = encryptMediaToken(12345, 'movie');

    // Truncated / extended
    expect(decryptMediaToken(validToken.slice(0, 31))).toBeNull();
    expect(decryptMediaToken(validToken + 'a')).toBeNull();
    expect(decryptMediaToken('')).toBeNull();

    // Uppercase hex must be rejected
    expect(decryptMediaToken(validToken.toUpperCase())).toBeNull();

    // Non-hex characters
    const nonHex = validToken.slice(0, 31) + 'g';
    expect(decryptMediaToken(nonHex)).toBeNull();

    const withSpecial = validToken.slice(0, 31) + '-';
    expect(decryptMediaToken(withSpecial)).toBeNull();

    // Non-string inputs
    expect(decryptMediaToken(null as unknown as string)).toBeNull();
    expect(decryptMediaToken(undefined as unknown as string)).toBeNull();
    expect(decryptMediaToken(12345 as unknown as string)).toBeNull();
  });

  it('rejects random hex tokens that lack valid internal checksum and magic', () => {
    // Generate deterministic pseudo-random 32 hex chars
    let seed = 0x12345678;
    for (let test = 0; test < 100; test++) {
      let hex = '';
      for (let j = 0; j < 8; j++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        hex += seed.toString(16).padStart(8, '0').slice(0, 4);
      }
      expect(decryptMediaToken(hex)).toBeNull();
    }
  });

  it('validates bad input arguments to encryptMediaToken', () => {
    expect(() => encryptMediaToken(-1, 'movie')).toThrow(TypeError);
    expect(() => encryptMediaToken(1.5, 'movie')).toThrow(TypeError);
    expect(() => encryptMediaToken(NaN, 'movie')).toThrow(TypeError);
    expect(() => encryptMediaToken(5000000000, 'movie')).toThrow(TypeError);
    expect(() => encryptMediaToken(100, 'anime' as unknown as 'movie')).toThrow(TypeError);
  });

  it('meets performance benchmark (<0.005 ms per op)', () => {
    const iterations = 10_000;

    // Warm up JIT
    for (let i = 0; i < 1_000; i++) {
      const t = encryptMediaToken(i, 'movie');
      decryptMediaToken(t);
    }

    // Benchmark encryption
    const startEncrypt = performance.now();
    for (let i = 0; i < iterations; i++) {
      encryptMediaToken(i, 'movie');
    }
    const endEncrypt = performance.now();
    const msPerEncrypt = (endEncrypt - startEncrypt) / iterations;

    // Benchmark decryption
    const tokens: string[] = [];
    for (let i = 0; i < iterations; i++) {
      tokens.push(encryptMediaToken(i, i % 2 === 0 ? 'movie' : 'tv'));
    }

    const startDecrypt = performance.now();
    for (let i = 0; i < iterations; i++) {
      decryptMediaToken(tokens[i]);
    }
    const endDecrypt = performance.now();
    const msPerDecrypt = (endDecrypt - startDecrypt) / iterations;

    // Must be strictly less than 0.005 ms (5 microseconds) per operation
    expect(msPerEncrypt).toBeLessThan(0.005);
    expect(msPerDecrypt).toBeLessThan(0.005);
  });
});
