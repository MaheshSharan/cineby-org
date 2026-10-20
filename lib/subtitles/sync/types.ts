/** One subtitle cue on the subtitle file's own timeline, in seconds. */
export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

/** A span of the video timeline, in seconds. */
export interface TimeWindow {
  start: number;
  end: number;
}

/** Result of matching one listening window against the cue list. */
export interface WindowMatch {
  /** Seconds to add to cue times so they line up with the audio. */
  offsetSec: number;
  /** Pearson correlation at the best lag, 0 to 1. */
  peak: number;
  /** Best correlation outside the exclusion zone around the peak. */
  sidelobe: number;
  /** peak minus sidelobe; how clearly the best lag stands out. */
  confidence: number;
}

/** Length of one speech/silence frame. Everything in the sync core uses it. */
export const FRAME_SEC = 0.01;
