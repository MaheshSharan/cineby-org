import type { PlaybackRate, QualityLabel, ServerOption } from "./types";

export const HISTORY_SAVE_INTERVAL_MS = 30_000;

export const HISTORY_SAVE_THRESHOLD_S = 15;

export const DEFAULT_VOLUME = 0.8;

export const REWIND_MS = 10000;

export const FORWARD_MS = 10000;

export const AUTOHIDE_CONTROLS_MS = 3000;

export const SHOW_CONTROLS_TRANSITION_MS = 300;

export const QUALITIES: QualityLabel[] = ["2160p", "1080p", "720p", "480p"];

export const QUALITY_BADGES: Partial<Record<QualityLabel, string>> = {
  "1080p": "Full HD",
  "720p": "HD",
};

export const PLAYBACK_RATES: PlaybackRate[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export const SERVERS: ServerOption[] = [
  { id: "default", name: "Auto", description: "Best available source", kind: "default" },
  { id: "vidy-miami", name: "Miami", description: "Original audio · Fast HLS / 4K", kind: "default" },
  { id: "vidy-boise", name: "Boise", description: "Original audio · High Bitrate HLS", kind: "default" },
  { id: "vidy-atlanta", name: "Atlanta", description: "Original audio · Alternate HLS", kind: "default" },
  { id: "vidy-seattle", name: "Seattle", description: "Original audio · Fast HLS", kind: "default" },
  { id: "vidy-denver", name: "Denver", description: "Original audio · DASH / HLS", kind: "default" },
  { id: "vidy-phoenix", name: "Phoenix", description: "Original audio · Alternate HLS", kind: "default" },
  { id: "vidy-portland", name: "Portland", description: "Original audio · Alternate HLS", kind: "default" },
  { id: "vidy-austin", name: "Austin", description: "Original audio · English stream", kind: "default" },
  { id: "vidy-dallas", name: "Dallas", description: "Original audio · Alternate HLS", kind: "default" },
  { id: "vidy-tampa", name: "Tampa", description: "Original audio · Fast HLS", kind: "default" },
  { id: "vidy-orlando", name: "Orlando", description: "Original audio · Fast HLS", kind: "default" },
  { id: "vidy-munich", name: "Munich", description: "German dubbed audio", kind: "default" },
  { id: "vidy-berlin", name: "Berlin", description: "German dubbed audio", kind: "default" },
  { id: "vidy-paris", name: "Paris", description: "French dubbed audio", kind: "default" },
  { id: "vidy-delhi", name: "Delhi", description: "Hindi dubbed audio", kind: "default" },
  { id: "vidy-cancun", name: "Cancun", description: "Spanish dubbed audio", kind: "default" },
];

