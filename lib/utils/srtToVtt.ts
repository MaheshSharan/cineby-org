/**
 * Pure utility to convert SRT or plain text subtitles to standard WebVTT format.
 */
export function srtToVtt(srtContent: string): string {
  if (!srtContent) return "WEBVTT\n\n";

  let normalized = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // If already valid WebVTT, return as is
  if (normalized.startsWith("WEBVTT\n") || normalized === "WEBVTT\r\n" || normalized === "WEBVTT") {
    return normalized.endsWith("\n") ? normalized : `${normalized}\n\n`;
  }

  // Convert SRT comma millisecond separators (00:01:23,456) to WebVTT dot separators (00:01:23.456)
  normalized = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  // Handle cases where hours might be 1 digit: 0:01:23,456 -> 00:01:23.456
  normalized = normalized.replace(/(^|\n)(\d:\d{2}:\d{2})\.(\d{3})/g, "$10$2.$3");

  return `WEBVTT\n\n${normalized}\n`;
}
