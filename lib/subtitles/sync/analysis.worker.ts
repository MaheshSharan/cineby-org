import type { AnalyzeRequest, AnalyzeResponse } from "./analysisProtocol";
import { matchWindow } from "./correlate";
import { detectSpeech } from "./speechDetector";

interface WorkerScope {
  onmessage: ((event: MessageEvent<AnalyzeRequest>) => void) | null;
  postMessage(message: AnalyzeResponse): void;
}

const scope = self as unknown as WorkerScope;

// Runs off the main thread so filtering and correlating never stall playback.
scope.onmessage = ({ data }) => {
  const speech = detectSpeech(data.samples, data.sampleRate);
  const speechFrames = speech.reduce((count, frame) => count + frame, 0);
  const match = matchWindow(speech, data.windowStart, data.cues);
  scope.postMessage({ id: data.id, match, speechRatio: speech.length ? speechFrames / speech.length : 0 });
};
