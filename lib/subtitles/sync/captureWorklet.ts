/**
 * AudioWorklet processor source, loaded from a Blob so no extra asset needs
 * serving. It mixes to mono and posts ~43 ms chunks tagged with the audio
 * clock frame they start at, which lets the main thread line them up with
 * the video clock.
 */
export const CAPTURE_PROCESSOR_NAME = "cineby-sync-capture";

export const CAPTURE_WORKLET_SOURCE = `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.filled = 0;
    this.startFrame = 0;
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0) return true;
    const length = channels[0].length;
    for (let i = 0; i < length; i++) {
      if (this.filled === 0) this.startFrame = currentFrame + i;
      let sum = 0;
      for (let c = 0; c < channels.length; c++) sum += channels[c][i];
      this.buffer[this.filled++] = sum / channels.length;
      if (this.filled === this.buffer.length) {
        const samples = this.buffer;
        this.port.postMessage({ frame: this.startFrame, samples }, [samples.buffer]);
        this.buffer = new Float32Array(2048);
        this.filled = 0;
      }
    }
    return true;
  }
}
registerProcessor("${CAPTURE_PROCESSOR_NAME}", CaptureProcessor);
`;
