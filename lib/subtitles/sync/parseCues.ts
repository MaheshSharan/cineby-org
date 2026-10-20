import type { SubtitleCue } from "./types";

const TIMESTAMP = String.raw`(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{3})`;
const CUE_LINE = new RegExp(`^\\s*${TIMESTAMP}\\s*-->\\s*${TIMESTAMP}`);

function toSeconds(hours: string | undefined, minutes: string, seconds: string, millis: string): number {
  return Number(hours ?? 0) * 3600 + Number(minutes) * 60 + Number(seconds) + Number(millis) / 1000;
}

function stripMarkup(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\{\\[^}]*\}/g, "").trim();
}

/**
 * Parses SRT or WebVTT text into cues sorted by start time.
 * Cues that are empty or have a non-positive duration are dropped, because
 * they carry no speech information for matching.
 */
export function parseCues(content: string): SubtitleCue[] {
  const lines = content.replace(/\r\n?/g, "\n").split("\n");
  const cues: SubtitleCue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = CUE_LINE.exec(lines[i]);
    if (!match) continue;

    const start = toSeconds(match[1], match[2], match[3], match[4]);
    const end = toSeconds(match[5], match[6], match[7], match[8]);

    const textLines: string[] = [];
    while (i + 1 < lines.length && lines[i + 1].trim() !== "") {
      i++;
      textLines.push(lines[i]);
    }

    const text = stripMarkup(textLines.join(" "));
    if (text && end > start) cues.push({ start, end, text });
  }

  return cues.sort((a, b) => a.start - b.start);
}
