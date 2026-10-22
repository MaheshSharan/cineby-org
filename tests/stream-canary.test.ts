import type { NextApiRequest, NextApiResponse } from "next";
import { describe, expect, it } from "vitest";

import canaryScriptHandler from "@/pages/api/stream/canary-script";
import { createProxyDescriptor, readProxyDescriptor } from "@/lib/providers/signedProxy";
import { flagSid, isSidFlagged } from "@/lib/security/canaryStore";
import { isValidSid } from "@/lib/security/sid";

const SID = "0123456789abcdef0123456789abcdef";

function callCanaryScript(sid: string): { status: number; body: string } {
  const result = { status: 0, body: "" };
  const res = {
    setHeader: () => res,
    status: (code: number) => {
      result.status = code;
      return res;
    },
    send: (body: string) => {
      result.body = body;
    },
  } as unknown as NextApiResponse;

  canaryScriptHandler({ query: { sid } } as unknown as NextApiRequest, res);

  return result;
}

describe("sid", () => {
  it("accepts only 32 lowercase hex characters", () => {
    expect(isValidSid(SID)).toBe(true);
    expect(isValidSid("short")).toBe(false);
    expect(isValidSid(`${SID}\nalert(1)`)).toBe(false);
    expect(isValidSid(undefined)).toBe(false);
  });
});

describe("signed descriptor sid", () => {
  it("round-trips the sid and the upstream headers", () => {
    const token = createProxyDescriptor("https://cdn.example/v/720.m3u8", { Referer: "https://r.example/" }, "1.2.3.4", SID);
    const descriptor = readProxyDescriptor(token);

    expect(descriptor?.sid).toBe(SID);
    expect(descriptor?.url).toBe("https://cdn.example/v/720.m3u8");
    expect(descriptor?.headers.Referer).toBe("https://r.example/");
  });

  it("rejects a token whose payload was edited to change the sid", () => {
    const token = createProxyDescriptor("https://cdn.example/a.m3u8", {}, undefined, SID);
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ url: "https://cdn.example/a.m3u8", headers: {}, expiresAt: Date.now() + 1e6 })).toString("base64url");

    expect(readProxyDescriptor(`${forged}.${signature}`)).toBeNull();
  });
});

describe("canary store", () => {
  it("flags a sid without touching others", async () => {
    const other = "fedcba9876543210fedcba9876543210";

    expect(await isSidFlagged(SID)).toBe(false);
    await flagSid(SID);

    expect(await isSidFlagged(SID)).toBe(true);
    expect(await isSidFlagged(other)).toBe(false);
  });
});

describe("canary script endpoint", () => {
  it("points the source map at the canary with the tab's sid", () => {
    expect(callCanaryScript(SID)).toEqual({ status: 200, body: `//# sourceMappingURL=/api/stream/canary?sid=${SID}\n` });
  });

  it("refuses a sid that could inject script content", () => {
    expect(callCanaryScript("x\nfetch('//evil')").status).toBe(400);
  });
});
