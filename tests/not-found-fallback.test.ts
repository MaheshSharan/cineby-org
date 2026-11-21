import { describe, expect, it } from "vitest";

import { withStyledNotFound } from "@/lib/http/notFoundFallback";

const request = new Request("https://cineby.group/movie/603");
const styledPage = () => Promise.resolve(new Response("<html>styled</html>", { headers: { "content-type": "text/html" } }));

describe("withStyledNotFound", () => {
  it("replaces a bare 404 with the styled page, keeping status 404", async () => {
    const result = await withStyledNotFound(request, new Response(new TextEncoder().encode("This page could not be found"), { status: 404 }), styledPage);
    expect(result.status).toBe(404);
    expect(result.headers.get("content-type")).toBe("text/html");
    expect(await result.text()).toBe("<html>styled</html>");
  });

  it("leaves a 404 that already has a content type alone", async () => {
    const original = new Response("x", { status: 404, headers: { "content-type": "text/html" } });
    expect(await withStyledNotFound(request, original, styledPage)).toBe(original);
  });

  it("keeps the original 404 when the styled page cannot be loaded", async () => {
    const original = new Response(new TextEncoder().encode("bare"), { status: 404 });
    const result = await withStyledNotFound(request, original, () => Promise.resolve(new Response("", { status: 500 })));
    expect(result).toBe(original);
  });

  it("ignores non-404 responses", async () => {
    const ok = new Response("ok");
    expect(await withStyledNotFound(request, ok, styledPage)).toBe(ok);
  });
});
