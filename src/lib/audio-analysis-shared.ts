/**
 * Browser/worker-safe audio analysis helpers: STFT chromagram + Krumhansl–Schmuckler
 * key estimation, music-tempo BPM with 44.1kHz normalization and octave refinement.
 */

import MusicTempo from "music-tempo";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Temperley / Krumhansl–Kessler major profile (pitch classes C…B). */
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
/** Temperley / Krumhansl–Kessler minor profile (pitch classes C…B). */
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const TARGET_SAMPLE_RATE = 44100;

/** Radix-2 Cooley–Tukey FFT; `re`/`im` length must be a power of two. */
export function fftComplexInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  let j = 0;
  for (let i = 1; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenr = Math.cos(ang);
    const wleni = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1;
      let wi = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k += 1) {
        const idx = i + k + half;
        const tre = wr * re[idx] - wi * im[idx];
        const tim = wr * im[idx] + wi * re[idx];
        const ure = re[i + k];
        const uim = im[i + k];
        re[i + k] = ure + tre;
        im[i + k] = uim + tim;
        re[idx] = ure - tre;
        im[idx] = uim - tim;
        const twr = wr * wlenr - wi * wleni;
        wi = wr * wleni + wi * wlenr;
        wr = twr;
      }
    }
  }
}

export function resampleLinear(input: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (Math.abs(inputRate - outputRate) < 1) {
    return input;
  }
  const ratio = inputRate / outputRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    const x = i * ratio;
    const x0 = Math.floor(x);
    const x1 = Math.min(x0 + 1, input.length - 1);
    const frac = x - x0;
    out[i] = input[x0]! * (1 - frac) + input[x1]! * frac;
  }
  return out;
}

function trimSamples(signal: Float32Array, sampleRate: number, maxSeconds: number): Float32Array {
  const maxLen = Math.floor(sampleRate * maxSeconds);
  if (signal.length <= maxLen) return signal;
  return signal.subarray(0, maxLen);
}

function l2NormalizeMutate(v: Float32Array): void {
  let s = 0;
  for (let i = 0; i < v.length; i += 1) {
    s += v[i]! * v[i]!;
  }
  const n = Math.sqrt(s);
  if (n < 1e-12) return;
  for (let i = 0; i < v.length; i += 1) {
    v[i]! /= n;
  }
}

/** Distribute spectral energy onto 12 chroma bins by continuous pitch-class (librosa-style). */
function addChromaFromMidi(chroma: Float32Array, midi: number, weight: number) {
  if (weight <= 0 || !Number.isFinite(weight)) return;
  let pc = midi - Math.floor(midi / 12) * 12;
  if (pc < 0) pc += 12;
  const i = Math.floor(pc) % 12;
  const j = (i + 1) % 12;
  const frac = pc - Math.floor(pc);
  chroma[i] += weight * (1 - frac);
  chroma[j] += weight * frac;
}

/**
 * STFT chromagram: Hanning windows, magnitude spectrum mapped to chroma with log-frequency pitch.
 * Frames are L2-normalized then averaged (mean chroma vector), then L2-normalized again for KS.
 */
export function computeAggregateChroma(mono: Float32Array, sampleRate: number): Float32Array | null {
  const trimmed = trimSamples(mono, sampleRate, 120);
  const fftSize = 4096;
  const hop = 2048;
  const minBins = Math.floor((80 * fftSize) / sampleRate);
  const maxBins = Math.floor((5000 * fftSize) / sampleRate);

  if (trimmed.length < fftSize) return null;

  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i += 1) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  const re = new Float32Array(fftSize);
  const im = new Float32Array(fftSize);
  const frameChroma = new Float32Array(12);
  const aggregate = new Float32Array(12);
  let framesUsed = 0;
  const maxFrames = 200;

  for (let start = 0; start + fftSize <= trimmed.length && framesUsed < maxFrames; start += hop, framesUsed += 1) {
    frameChroma.fill(0);
    for (let i = 0; i < fftSize; i += 1) {
      re[i] = trimmed[start + i]! * hann[i]!;
      im[i] = 0;
    }
    fftComplexInPlace(re, im);

    for (let k = Math.max(1, minBins); k <= Math.min(fftSize / 2 - 1, maxBins); k += 1) {
      const freq = (k * sampleRate) / fftSize;
      if (freq < 65 || freq > 5200) continue;
      const mag = Math.hypot(re[k]!, im[k]!);
      if (!Number.isFinite(mag) || mag <= 0) continue;
      const midi = 69 + 12 * Math.log2(freq / 440);
      addChromaFromMidi(frameChroma, midi, mag * mag);
    }

    l2NormalizeMutate(frameChroma);
    for (let i = 0; i < 12; i += 1) {
      aggregate[i] += frameChroma[i]!;
    }
  }

  if (framesUsed === 0) return null;
  for (let i = 0; i < 12; i += 1) {
    aggregate[i]! /= framesUsed;
  }
  l2NormalizeMutate(aggregate);
  return aggregate;
}

function pearsonCorrelation(a: Float32Array, b: readonly number[]): number {
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < 12; i += 1) {
    ma += a[i]!;
    mb += b[i]!;
  }
  ma /= 12;
  mb /= 12;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < 12; i += 1) {
    const x = a[i]! - ma;
    const y = b[i]! - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den > 1e-12 ? num / den : 0;
}

function rotatedProfile(profile: readonly number[], semitoneOffset: number): number[] {
  const out: number[] = new Array(12);
  for (let i = 0; i < 12; i += 1) {
    out[i] = profile[(i + semitoneOffset) % 12]!;
  }
  return out;
}

/** Krumhansl–Schmuckler: pick major/minor key with highest Pearson r against aggregate chroma. */
export function estimateKeyKrumhanslSchmuckler(chroma: Float32Array): string | null {
  let bestKey = "";
  let bestR = -Infinity;

  for (let tonic = 0; tonic < 12; tonic += 1) {
    const maj = rotatedProfile(KS_MAJOR, tonic);
    const rMaj = pearsonCorrelation(chroma, maj);
    if (rMaj > bestR) {
      bestR = rMaj;
      bestKey = `${NOTE_NAMES[tonic]} Major`;
    }
    const min = rotatedProfile(KS_MINOR, tonic);
    const rMin = pearsonCorrelation(chroma, min);
    if (rMin > bestR) {
      bestR = rMin;
      bestKey = `${NOTE_NAMES[tonic]} Minor`;
    }
  }

  return bestKey || null;
}

export function detectKeyFromSignal(mono: Float32Array, sampleRate: number): string | null {
  const monoUse = resampleLinear(mono, sampleRate, TARGET_SAMPLE_RATE);
  const chroma = computeAggregateChroma(monoUse, TARGET_SAMPLE_RATE);
  if (!chroma) return null;
  return estimateKeyKrumhanslSchmuckler(chroma);
}

/** Half-wave rectified spectral flux proxy → smoothed onset envelope for octave checks. */
function buildOnsetEnvelope(signal: Float32Array, sampleRate: number): Float32Array {
  const hop = 512;
  const frame = 1024;
  const envelopeLength = Math.max(1, Math.floor((signal.length - frame) / hop));
  const envelope = new Float32Array(envelopeLength);

  for (let i = 0; i < envelopeLength; i += 1) {
    const start = i * hop;
    let energy = 0;
    for (let j = 0; j < frame; j += 1) {
      const sample = signal[start + j] ?? 0;
      energy += sample * sample;
    }
    envelope[i] = Math.sqrt(energy / frame);
  }

  for (let i = envelopeLength - 1; i > 0; i -= 1) {
    envelope[i] = Math.max(0, envelope[i]! - envelope[i - 1]!);
  }
  envelope[0] = 0;

  const smooth = 3;
  const smoothed = new Float32Array(envelopeLength);
  for (let i = 0; i < envelopeLength; i += 1) {
    let acc = 0;
    let count = 0;
    for (let k = -smooth; k <= smooth; k += 1) {
      const idx = i + k;
      if (idx >= 0 && idx < envelopeLength) {
        acc += envelope[idx]!;
        count += 1;
      }
    }
    smoothed[i] = count > 0 ? acc / count : 0;
  }
  return smoothed;
}

function sampleEnvelope(env: Float32Array, idx: number): number {
  if (idx <= 0) return env[0] ?? 0;
  if (idx >= env.length - 1) return env[env.length - 1] ?? 0;
  const i0 = Math.floor(idx);
  const frac = idx - i0;
  return env[i0]! * (1 - frac) + env[i0 + 1]! * frac;
}

/** Autocorrelation at fractional lag (in envelope index units). */
function autocorrAtLag(env: Float32Array, lagSamples: number): number {
  if (lagSamples < 2 || !Number.isFinite(lagSamples)) return 0;
  let sum = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(lagSamples / 80));
  for (let i = 0; i + lagSamples < env.length - 1; i += step) {
    const j = i + lagSamples;
    sum += env[i]! * sampleEnvelope(env, j);
    count += 1;
  }
  return count > 0 ? sum / count : 0;
}

function refineBpmOctave(mono441: Float32Array, estimate: number): number {
  const sr = TARGET_SAMPLE_RATE;
  const raw = estimate;
  const candidates = new Set<number>();
  for (const mult of [0.25, 0.5, 1, 2, 4]) {
    const b = raw * mult;
    if (b >= 55 && b <= 220) {
      candidates.add(Math.round(b * 100) / 100);
    }
  }
  candidates.add(Math.round(raw));

  const env = buildOnsetEnvelope(mono441, sr);
  let best = raw;
  let bestScore = -Infinity;
  for (const bpm of candidates) {
    const lag = (60 * sr) / (512 * bpm);
    const score = autocorrAtLag(env, lag);
    if (score > bestScore) {
      bestScore = score;
      best = bpm;
    }
  }
  return Math.round(best);
}

export function detectBpmWithMusicTempo(mono: Float32Array, sampleRate: number): number | null {
  const mono441 = resampleLinear(mono, sampleRate, TARGET_SAMPLE_RATE);
  const trimmed = trimSamples(mono441, TARGET_SAMPLE_RATE, 150);
  const hopSize = 441;
  const timeStep = hopSize / TARGET_SAMPLE_RATE;

  let raw: number;
  try {
    const mt = new MusicTempo(Array.from(trimmed), {
      bufferSize: 2048,
      hopSize,
      timeStep,
      peakThreshold: 0.22,
      decayRate: 0.82,
      maxBeatInterval: 1.05,
      minBeatInterval: 0.28
    });
    const t = mt.tempo;
    const n = typeof t === "number" ? t : Number.parseFloat(String(t));
    if (!Number.isFinite(n) || n < 55 || n > 240) return null;
    raw = n;
  } catch {
    return null;
  }

  const refined = refineBpmOctave(mono441, raw);
  if (refined < 55 || refined > 220) return null;
  return refined;
}
