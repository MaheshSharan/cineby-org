function shiftTimestamp(timestampStr: string, offsetMs: number): string {
  const parts = timestampStr.trim().split(":");
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    hours = Number.parseInt(parts[0], 10) || 0;
    minutes = Number.parseInt(parts[1], 10) || 0;
    seconds = Number.parseFloat(parts[2]) || 0;
  } else if (parts.length === 2) {
    minutes = Number.parseInt(parts[0], 10) || 0;
    seconds = Number.parseFloat(parts[1]) || 0;
  }

  const totalMs = Math.max(0, (hours * 3600 + minutes * 60 + seconds) * 1000 + offsetMs);
  const totalSeconds = totalMs / 1000;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const hStr = String(h).padStart(2, "0");
  const mStr = String(m).padStart(2, "0");
  const sStr = s.toFixed(3).padStart(6, "0");
  return `${hStr}:${mStr}:${sStr}`;
}

/**
 * Pure utility to convert SRT or plain text subtitles to standard WebVTT format,
 * with optional time offset (in seconds) and position lift (0-50%).
 */
export function srtToVtt(
  srtContent: string,
  offsetSeconds: number = 0,
  positionPercent: number = 0
): string {
  if (!srtContent) return "WEBVTT\n\n";

  let normalized = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  // Strip leading WEBVTT header if present so we can normalize uniformly
  if (normalized.startsWith("WEBVTT")) {
    normalized = normalized.replace(/^WEBVTT[^\n]*\n+/i, "");
  }

  // Convert SRT comma millisecond separators (00:01:23,456) to WebVTT dot separators (00:01:23.456)
  normalized = normalized.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  // Handle cases where hours might be 1 digit: 0:01:23,456 -> 00:01:23.456
  normalized = normalized.replace(/(^|\n)(\d:\d{2}:\d{2})\.(\d{3})/g, "$10$2.$3");

  const offsetMs = Math.round(offsetSeconds * 1000);
  const lineSetting = positionPercent > 0 ? ` line:${Math.max(10, 100 - positionPercent)}%` : "";

  // Apply timestamp shifting and cue line positioning
  normalized = normalized.replace(
    /(^|\n)(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})([^\n]*)/g,
    (_match, prefix, start, end, existingSettings) => {
      const shiftedStart = offsetMs !== 0 ? shiftTimestamp(start, offsetMs) : start;
      const shiftedEnd = offsetMs !== 0 ? shiftTimestamp(end, offsetMs) : end;
      // Strip any prior line: settings from existingSettings if we are applying a new position
      let settings = (existingSettings || "").trim();
      if (lineSetting) {
        settings = settings.replace(/\bline:\S+/g, "").trim();
        settings = settings ? `${settings}${lineSetting}` : lineSetting.trim();
      }
      const suffix = settings ? ` ${settings}` : "";
      return `${prefix}${shiftedStart} --> ${shiftedEnd}${suffix}`;
    }
  );

  return `WEBVTT\n\n${normalized}\n`;
}
