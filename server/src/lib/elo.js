// Pure, dependency-free Elo engine for ranking voice-AI stacks.

const DEFAULT_RATING = 1200;
const DEFAULT_K = 24;

// Expected score for A against B: probability-like value in (0,1) that sums to
// 1 across the pair. 0.5 means evenly matched.
export function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

// Apply one result to a pair. `score` is A's outcome (1 win, 0 loss, 0.5 draw).
// B moves by the mirror amount, so the pair's total rating is conserved.
export function updateRatings(a, b, score, k = DEFAULT_K) {
  const expA = expectedScore(a, b);
  const expB = expectedScore(b, a);
  return {
    ratingA: a + k * (score - expA),
    ratingB: b + k * (1 - score - expB),
  };
}

// K-factor that shrinks as a stack accumulates votes: big early swings settle
// into stable ratings. Starts at 36 (0 votes) and floors at 12.
export function adaptiveK(votes) {
  return Math.max(12, Math.round(36 / (1 + votes / 30)));
}

// How many Elo points below the human baseline map all the way down to 0
// humanness. The gap-to-percent scale: a stack one full SPAN below the human
// scores 0; at the human's rating it would hit the ceiling.
export const HUMANNESS_SPAN = 600;

// Absolute humanness on a fixed 0-100 scale anchored to the human baseline.
// The human's rating is the ceiling (100); a stack scores lower the further its
// rating sits below the human, linearly in the rating gap. Stacks are clamped
// strictly below 100 — only the human baseline itself is the 100 anchor — so a
// stack that ever climbs to/over the human still reads as "almost", never 100.
export function humannessFromRating(rating, humanRating) {
  const gap = humanRating - rating;
  const raw = 100 * (1 - gap / HUMANNESS_SPAN);
  return Math.max(0, Math.min(99, raw));
}

// Confidence band around a rating: wide with few votes, narrowing as votes grow.
export function uncertaintyBand(votes) {
  return Math.round(40 / Math.sqrt(votes + 1));
}
