import { logger } from "@/lib/logger";

const WASM_URL = "https://api.wing.st/crush.wasm";

interface CrushExports {
  memory: WebAssembly.Memory;
  alloc: (size: number) => number;
  dealloc: (ptr: number, size: number) => void;
  seal_request: (
    pPayload: number,
    lenPayload: number,
    pSeed: number,
    lenSeed: number,
    pOut: number,
    maxOut: number
  ) => number;
}

let compiledModulePromise: Promise<WebAssembly.Module> | null = null;

async function getOrCompileWasmModule(): Promise<WebAssembly.Module> {
  if (!compiledModulePromise) {
    compiledModulePromise = (async () => {
      logger.debug("[cinejoy:wasm] Fetching and compiling crush.wasm...");
      const res = await fetch(WASM_URL);
      if (!res.ok) {
        throw new Error(`Failed to load crush.wasm from ${WASM_URL}: status ${res.status}`);
      }
      const buffer = await res.arrayBuffer();
      return WebAssembly.compile(buffer);
    })().catch((err) => {
      compiledModulePromise = null;
      throw err;
    });
  }
  return compiledModulePromise;
}

export interface HandshakeContext {
  body: Uint8Array;
  responseKey: Uint8Array;
  additionalData: Uint8Array;
}

const SEED_LENGTH = 44;
const KEY_ID_OFFSET = 32;
const EPHEMERAL_PUB_OFFSET = 33;
const EPHEMERAL_PUB_LEN = 65;
const BODY_OFFSET = 98;
const ADDITIONAL_DATA_PREFIX = new TextEncoder().encode("lumen-gate-v2");

/**
 * Executes the WebAssembly cryptographic key-exchange challenge and derives
 * the request body, response key, and AES-GCM additional authenticated data.
 */
export async function createHandshake(path: string, payload: Record<string, string>): Promise<HandshakeContext> {
  const wasmModule = await getOrCompileWasmModule();
  const instance = await WebAssembly.instantiate(wasmModule, {});
  const exports = instance.exports as unknown as CrushExports;

  const jsonStr = JSON.stringify({ path, payload });
  const payloadBytes = new TextEncoder().encode(jsonStr);

  const seed = new Uint8Array(SEED_LENGTH);
  crypto.getRandomValues(seed);

  const maxOut = payloadBytes.length + 512;
  const pPayload = exports.alloc(payloadBytes.length);
  const pSeed = exports.alloc(seed.length);
  const pOut = exports.alloc(maxOut);

  let mem = new Uint8Array(exports.memory.buffer);
  mem.set(payloadBytes, pPayload);
  mem.set(seed, pSeed);

  const sealedLen = exports.seal_request(pPayload, payloadBytes.length, pSeed, seed.length, pOut, maxOut);
  mem = new Uint8Array(exports.memory.buffer);
  const sealed = mem.slice(pOut, pOut + sealedLen);

  exports.dealloc(pPayload, payloadBytes.length);
  exports.dealloc(pSeed, seed.length);
  exports.dealloc(pOut, maxOut);

  const responseKey = sealed.slice(0, 32);
  const keyId = sealed[KEY_ID_OFFSET];
  const ephemeralPublic = sealed.slice(EPHEMERAL_PUB_OFFSET, EPHEMERAL_PUB_OFFSET + EPHEMERAL_PUB_LEN);
  const body = sealed.slice(BODY_OFFSET);

  // Additional Data for AES-GCM: "lumen-gate-v2" + [0, 2, keyId] + ephemeralPublic
  const additionalData = new Uint8Array(ADDITIONAL_DATA_PREFIX.length + 3 + ephemeralPublic.length);
  additionalData.set(ADDITIONAL_DATA_PREFIX, 0);
  additionalData.set([0, 2, keyId], ADDITIONAL_DATA_PREFIX.length);
  additionalData.set(ephemeralPublic, ADDITIONAL_DATA_PREFIX.length + 3);

  return {
    body,
    responseKey,
    additionalData,
  };
}
