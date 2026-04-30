import { Beat } from "@/components/types";

/** Shared tag / BPM proximity scoring (same as the home beat list). */
export function getRelatedBeats(current: Beat, candidates: Beat[], limit = 3): Beat[] {
  return candidates
    .filter((beat) => beat.id !== current.id)
    .map((beat) => {
      const bpmDiff = Math.abs(beat.bpm - current.bpm);
      const sharedTags = beat.tags.filter((tag) => current.tags.includes(tag)).length;
      const score = sharedTags * 10 - bpmDiff;
      return { beat, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.beat);
}
