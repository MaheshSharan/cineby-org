import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchTrailerUrlServer } from "@/lib/services/trailer.server";
import { getTrailerUrl } from "@/lib/services/trailer";
import trailerApiHandler from "@/pages/api/trailer/[id]";
import type { NextApiRequest, NextApiResponse } from "next";

describe("fetchTrailerUrlServer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for invalid or missing IMDb IDs", async () => {
    expect(await fetchTrailerUrlServer(null)).toBeNull();
    expect(await fetchTrailerUrlServer("")).toBeNull();
    expect(await fetchTrailerUrlServer("invalid-id")).toBeNull();
    expect(await fetchTrailerUrlServer("12345")).toBeNull();
  });

  it("selects highest quality MP4 stream from upstream response", async () => {
    const mockResponse = {
      id: "tt1111111",
      trailer: {
        id: "tr1",
        name: "Official Trailer",
        runtime: 120,
        thumbnail: "https://thumb.test/img.jpg",
        streams: [
          { quality: "480p", url: "https://cdn.test/480p.mp4", mimeType: "video/mp4" },
          { quality: "1080p", url: "https://cdn.test/1080p.mp4", mimeType: "video/mp4" },
          { quality: "720p", url: "https://cdn.test/720p.mp4", mimeType: "video/mp4" },
        ],
      },
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 })
    );

    const result = await fetchTrailerUrlServer("tt1111111");
    expect(result).toBe("https://cdn.test/1080p.mp4");
  });

  it("gracefully returns null when upstream returns error status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Failed to fetch trailer" }), { status: 500 })
    );

    const result = await fetchTrailerUrlServer("tt2222222");
    expect(result).toBeNull();
  });
});

describe("getTrailerUrl (client)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for invalid inputs without fetching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await getTrailerUrl(null)).toBeNull();
    expect(await getTrailerUrl("")).toBeNull();
    expect(await getTrailerUrl("not-an-imdb-id")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("calls internal /api/trailer/[id] route", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ url: "https://cdn.test/trailer.mp4" }), { status: 200 })
    );

    const result = await getTrailerUrl("tt9288030");
    expect(result).toBe("https://cdn.test/trailer.mp4");
  });
});

describe("pages/api/trailer/[id]", () => {
  it("rejects non-GET methods with 405", async () => {
    const req = {
      method: "POST",
      headers: {},
      query: { id: "tt9288030" },
    } as unknown as NextApiRequest;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as NextApiResponse;

    await trailerApiHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("rejects invalid IMDb id with 400", async () => {
    const req = {
      method: "GET",
      headers: {},
      query: { id: "invalid" },
    } as unknown as NextApiRequest;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as NextApiResponse;

    await trailerApiHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
