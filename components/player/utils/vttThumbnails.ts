export interface VttThumbnailCue {
  start: number;
  end: number;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

function parseTimestamp(timestamp: string): number {
  const normalized = timestamp.trim().replace(/,/g, ".");
  const parts = normalized.split(":");
  if (parts.length === 3) {
    const hours = Number.parseFloat(parts[0]);
    const minutes = Number.parseFloat(parts[1]);
    const seconds = Number.parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const minutes = Number.parseFloat(parts[0]);
    const seconds = Number.parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return 0;
}

export function parseVttThumbnails(vttText: string, baseUrl: string): VttThumbnailCue[] {
  const lines = vttText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const cues: VttThumbnailCue[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.startsWith("WEBVTT") || line.startsWith("NOTE")) {
      i++;
      continue;
    }

    const arrowIdx = line.indexOf("-->");
    if (arrowIdx !== -1) {
      const startStr = line.slice(0, arrowIdx).trim();
      const endPart = line.slice(arrowIdx + 3).trim();
      const endStr = endPart.split(/\s+/)[0];

      const start = parseTimestamp(startStr);
      const end = parseTimestamp(endStr);

      i++;
      while (i < lines.length && !lines[i].trim()) {
        i++;
      }

      if (i < lines.length) {
        const payloadLine = lines[i].trim();
        if (payloadLine && !payloadLine.includes("-->")) {
          const hashIdx = payloadLine.indexOf("#xywh=");
          let relUrl = payloadLine;
          let x = 0;
          let y = 0;
          let w = 0;
          let h = 0;

          if (hashIdx !== -1) {
            relUrl = payloadLine.slice(0, hashIdx);
            const coords = payloadLine.slice(hashIdx + 6).split(",");
            if (coords.length === 4) {
              x = Number.parseInt(coords[0], 10) || 0;
              y = Number.parseInt(coords[1], 10) || 0;
              w = Number.parseInt(coords[2], 10) || 0;
              h = Number.parseInt(coords[3], 10) || 0;
            }
          }

          let fullUrl = relUrl;
          try {
            fullUrl = new URL(relUrl, baseUrl).toString();
          } catch {
            fullUrl = relUrl;
          }

          cues.push({ start, end, url: fullUrl, x, y, w, h });
        }
      }
    }
    i++;
  }

  return cues;
}

export function findVttThumbnailCue(cues: VttThumbnailCue[], timeSeconds: number): VttThumbnailCue | null {
  if (cues.length === 0) return null;

  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cue = cues[mid];
    if (timeSeconds < cue.start) {
      high = mid - 1;
    } else if (timeSeconds >= cue.end) {
      low = mid + 1;
    } else {
      return cue;
    }
  }

  const clampedIdx = Math.max(0, Math.min(cues.length - 1, low));
  return cues[clampedIdx] ?? null;
}
