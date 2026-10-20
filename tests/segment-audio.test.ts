import { describe, expect, it } from "vitest";
import { findBestSubPlaylist, parseHlsManifest } from "@/lib/subtitles/sync/segmentAudio";

describe("segmentAudio HLS Manifest Parsing", () => {
  it("resolves the audio-only playlist from a master playlist when available", () => {
    const master = `
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-a1",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="audio.m3u8"
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360,AUDIO="audio-a1"
video-360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480,AUDIO="audio-a1"
video-480p.m3u8
`;
    const selected = findBestSubPlaylist(master, "https://cdn.example.com/stream/master.m3u8");
    expect(selected).toBe("https://cdn.example.com/stream/audio.m3u8");
  });

  it("selects the lowest bandwidth video stream when no separate audio playlist is declared", () => {
    const master = `
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080
1080p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
720p.m3u8
`;
    const selected = findBestSubPlaylist(master, "https://cdn.example.com/stream/master.m3u8");
    expect(selected).toBe("https://cdn.example.com/stream/360p.m3u8");
  });

  it("returns null when text is already a media playlist", () => {
    const media = `
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:6
#EXTINF:6.000,
seg-0.m4s
`;
    const selected = findBestSubPlaylist(media, "https://cdn.example.com/stream/index.m3u8");
    expect(selected).toBeNull();
  });

  it("parses fMP4 media playlist with init map and segment durations", () => {
    const media = `
#EXTM3U
#EXT-X-VERSION:6
#EXT-X-TARGETDURATION:6
#EXT-X-MAP:URI="init.mp4"
#EXTINF:5.000,
seg-0.m4s
#EXTINF:5.000,
seg-1.m4s
#EXTINF:6.000,
seg-2.m4s
#EXT-X-ENDLIST
`;
    const { initUrl, segments } = parseHlsManifest(media, "https://cdn.example.com/stream/index.m3u8");

    expect(initUrl).toBe("https://cdn.example.com/stream/init.mp4");
    expect(segments.length).toBe(3);

    expect(segments[0]).toEqual({
      start: 0,
      end: 5,
      duration: 5,
      url: "https://cdn.example.com/stream/seg-0.m4s",
    });

    expect(segments[1]).toEqual({
      start: 5,
      end: 10,
      duration: 5,
      url: "https://cdn.example.com/stream/seg-1.m4s",
    });

    expect(segments[2]).toEqual({
      start: 10,
      end: 16,
      duration: 6,
      url: "https://cdn.example.com/stream/seg-2.m4s",
    });
  });
});
