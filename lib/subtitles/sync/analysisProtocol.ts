import type { SubtitleCue, WindowMatch } from "./types";

export interface AnalyzeRequest {
  id: number;
  samples: Float32Array;
  sampleRate: number;
  /** Video time of samples[0], in seconds. */
  windowStart: number;
  cues: SubtitleCue[];
}

export interface AnalyzeResponse {
  id: number;
  /** Null when no speech could be matched at all. */
  match: WindowMatch | null;
  /** Share of frames classed as speech; near 0 means the audio had no clear dialogue. */
  speechRatio: number;
}
