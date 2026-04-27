/// <reference lib="webworker" />

import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/audio-analysis-contract";
import { detectBpmWithMusicTempo, detectKeyFromSignal } from "@/lib/audio-analysis-shared";

function postResult(message: AnalyzeResponse) {
  self.postMessage(message);
}

async function decodeToMono(ab: ArrayBuffer): Promise<{ mono: Float32Array; sampleRate: number }> {
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(ab.slice(0));
    const channelCount = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    let mono: Float32Array;
    if (channelCount <= 1) {
      mono = audioBuffer.getChannelData(0).slice();
    } else {
      mono = new Float32Array(length);
      for (let channel = 0; channel < channelCount; channel += 1) {
        const data = audioBuffer.getChannelData(channel);
        for (let i = 0; i < length; i += 1) {
          mono[i] += data[i]! / channelCount;
        }
      }
    }
    return { mono, sampleRate: audioBuffer.sampleRate };
  } finally {
    await ctx.close();
  }
}

/** Run jobs one at a time so overlapping file picks don't corrupt results. */
let drain = Promise.resolve();

self.onmessage = (event: MessageEvent<AnalyzeRequest>) => {
  const payload = event.data;
  drain = drain.then(async () => {
    const { id, buffer } = payload;
    try {
      const { mono, sampleRate } = await decodeToMono(buffer);
      const bpm = detectBpmWithMusicTempo(mono, sampleRate);
      const key = detectKeyFromSignal(mono, sampleRate);
      postResult({ id, bpm, key });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed.";
      postResult({ id, bpm: null, key: null, error: message });
    }
  });
};
