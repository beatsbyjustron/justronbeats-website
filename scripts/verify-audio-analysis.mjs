/**
 * Manual verification (run: node scripts/verify-audio-analysis.mjs):
 * 1) music-tempo on a synthetic impulse train at 140 BPM
 * 2) Krumhansl–Schmuckler picks C Major from a synthetic chroma vector
 *
 * Expect ~140 BPM and "C Major". Small deviation on BPM is acceptable.
 */

import { createRequire } from "module";

const require = createRequire(import.meta.url);
const MusicTempo = require("music-tempo");

const TARGET_SR = 44100;
const hopSize = 441;
const timeStep = hopSize / TARGET_SR;

function runTempoTest() {
  const bpmTarget = 140;
  const periodSamples = Math.round((60 / bpmTarget) * TARGET_SR);
  const durationSec = 12;
  const totalSamples = TARGET_SR * durationSec;
  const buf = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i += periodSamples) {
    for (let k = 0; k < 24 && i + k < totalSamples; k += 1) {
      buf[i + k] = k % 3 === 0 ? 1 : -0.4;
    }
  }

  let detected;
  try {
    const mt = new MusicTempo(Array.from(buf), {
      bufferSize: 2048,
      hopSize,
      timeStep,
      peakThreshold: 0.22
    });
    detected = Number.parseFloat(String(mt.tempo));
  } catch (e) {
    console.error("music-tempo failed:", e);
    process.exit(1);
  }

  const err = Math.abs(detected - bpmTarget);
  console.log(`[BPM test] target ${bpmTarget} -> detected ${detected.toFixed(2)} (|error| = ${err.toFixed(2)})`);
  if (err > 8) {
    console.warn("Warning: error > 8 BPM; check music-tempo / hop parameters.");
  }
}

function pearson(a, b) {
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < 12; i += 1) {
    ma += a[i];
    mb += b[i];
  }
  ma /= 12;
  mb /= 12;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < 12; i += 1) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  const den = Math.sqrt(da * db);
  return den > 1e-12 ? num / den : 0;
}

const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];

function runKeyTest() {
  const chromaC = new Float32Array(12);
  for (let i = 0; i < 12; i += 1) {
    chromaC[i] = KS_MAJOR[i] + (i % 2 ? 0.1 : 0);
  }
  let s = 0;
  for (let i = 0; i < 12; i += 1) s += chromaC[i] * chromaC[i];
  s = Math.sqrt(s);
  for (let i = 0; i < 12; i += 1) chromaC[i] /= s;

  const r0 = pearson(chromaC, KS_MAJOR);
  const rM = pearson(
    chromaC,
    KS_MAJOR.map((_, j) => KS_MAJOR[(j + 1) % 12])
  );
  const best = r0 >= rM ? "C Major" : "C# Major (wrong)";
  console.log(`[Key test] r(C major profile)=${r0.toFixed(3)}, r(rotated +1)=${rM.toFixed(3)} -> expect C Major, got ${best}`);
  if (r0 <= rM) {
    process.exitCode = 1;
  }
}

runTempoTest();
runKeyTest();
console.log("Done.");
