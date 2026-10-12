import { describe, expect, it } from "vitest";
import { parseVttThumbnails, findVttThumbnailCue } from "@/components/player/utils/vttThumbnails";

describe("vttThumbnails", () => {
  const sampleVtt = `WEBVTT

1
00:00:00.000 --> 00:00:05.000
thumbnails_sprite.jpg#xywh=0,0,160,90

2
00:00:05.000 --> 00:00:10.000
thumbnails_sprite.jpg#xywh=160,0,160,90

3
00:00:10.000 --> 00:00:15.000
thumbnails_sprite.jpg#xywh=0,90,160,90
`;

  it("parses VTT cues and extracts sprite coordinates and resolved URLs", () => {
    const cues = parseVttThumbnails(sampleVtt, "https://example.com/media/thumbs.vtt");
    expect(cues).toHaveLength(3);

    expect(cues[0]).toEqual({
      start: 0,
      end: 5,
      url: "https://example.com/media/thumbnails_sprite.jpg",
      x: 0,
      y: 0,
      w: 160,
      h: 90,
    });

    expect(cues[1]).toEqual({
      start: 5,
      end: 10,
      url: "https://example.com/media/thumbnails_sprite.jpg",
      x: 160,
      y: 0,
      w: 160,
      h: 90,
    });

    expect(cues[2]).toEqual({
      start: 10,
      end: 15,
      url: "https://example.com/media/thumbnails_sprite.jpg",
      x: 0,
      y: 90,
      w: 160,
      h: 90,
    });
  });

  it("finds correct cue using binary search lookup", () => {
    const cues = parseVttThumbnails(sampleVtt, "https://example.com/thumbs.vtt");

    const cueAt2 = findVttThumbnailCue(cues, 2);
    expect(cueAt2?.start).toBe(0);

    const cueAt7 = findVttThumbnailCue(cues, 7);
    expect(cueAt7?.start).toBe(5);

    const cueAt12 = findVttThumbnailCue(cues, 12);
    expect(cueAt12?.start).toBe(10);
  });

  it("handles edge times gracefully (before start, after end, empty cues)", () => {
    expect(findVttThumbnailCue([], 10)).toBeNull();

    const cues = parseVttThumbnails(sampleVtt, "https://example.com/thumbs.vtt");
    const cuePastEnd = findVttThumbnailCue(cues, 9999);
    expect(cuePastEnd).not.toBeNull();
    expect(cuePastEnd?.start).toBe(10);
  });

  it("parses individual image cues without #xywh coordinates", () => {
    const individualVtt = `WEBVTT

00:00:00.000 --> 00:00:10.000
thumb_1.jpg

00:00:10.000 --> 00:00:20.000
thumb_2.jpg
`;
    const cues = parseVttThumbnails(individualVtt, "https://cdn.example.com/assets/");
    expect(cues).toHaveLength(2);
    expect(cues[0].url).toBe("https://cdn.example.com/assets/thumb_1.jpg");
    expect(cues[0].w).toBe(0);
    expect(cues[1].url).toBe("https://cdn.example.com/assets/thumb_2.jpg");
  });

  it("supports mm:ss timestamps and comma milliseconds", () => {
    const vtt = `WEBVTT

00:00,000 --> 01:30,500
thumb_start.jpg#xywh=0,0,160,90
`;
    const cues = parseVttThumbnails(vtt, "https://cdn.example.com/thumbs/");
    expect(cues).toHaveLength(1);
    expect(cues[0].start).toBe(0);
    expect(cues[0].end).toBeCloseTo(90.5);
  });
});
