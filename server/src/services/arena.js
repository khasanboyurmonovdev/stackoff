import crypto from 'crypto';
import { Clip } from '../models/Clip.js';
import { Stack } from '../models/Stack.js';
import { Vote } from '../models/Vote.js';
import { Voter } from '../models/Voter.js';
import { expectedScore, updateRatings, adaptiveK } from '../lib/elo.js';
import { signBattle, verifyBattle } from './battleToken.js';

const GOLDEN_PROBABILITY = 0.25;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sampleTwoDistinct(arr) {
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * (arr.length - 1));
  if (j >= i) j++;
  return [arr[i], arr[j]];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function publicClip(clip) {
  // What the client is allowed to see: never the source (stack vs human).
  return { clipId: String(clip._id), audioUrl: clip.audioUrl, durationMs: clip.durationMs };
}

// Build a battle from a random scenario that actually has clips. ~25% of the
// time make a "golden" battle (human clip vs stack clip); otherwise an "arena"
// battle of two distinct stack clips. Returns { available:false } when no clips
// exist yet (pre-pipeline) instead of crashing.
export async function buildBattle() {
  const scenarioIds = await Clip.distinct('scenarioId');
  if (!scenarioIds.length) return { available: false };

  for (const scenarioId of shuffle(scenarioIds)) {
    const clips = await Clip.find({ scenarioId }).lean();
    const stackClips = clips.filter((c) => c.sourceType === 'stack');
    const humanClips = clips.filter((c) => c.sourceType === 'human');

    const canArena = stackClips.length >= 2;
    const canGolden = humanClips.length >= 1 && stackClips.length >= 1;
    if (!canArena && !canGolden) continue;

    // Choose kind: golden when possible and (dice roll OR arena impossible).
    const kind = canGolden && (Math.random() < GOLDEN_PROBABILITY || !canArena) ? 'golden' : 'arena';

    let c1, c2;
    if (kind === 'golden') {
      c1 = pick(humanClips);
      c2 = pick(stackClips);
    } else {
      [c1, c2] = sampleTwoDistinct(stackClips);
    }

    // Randomize which is A vs B so position leaks nothing.
    const [clipA, clipB] = Math.random() < 0.5 ? [c1, c2] : [c2, c1];

    const battleId = crypto.randomUUID();
    const token = signBattle({
      battleId,
      scenarioId,
      clipAId: String(clipA._id),
      clipBId: String(clipB._id),
      kind,
      iat: Date.now(),
    });

    return {
      available: true,
      battleId,
      scenarioId,
      kind,
      clipA: publicClip(clipA),
      clipB: publicClip(clipB),
      token,
    };
  }

  return { available: false };
}

function err(message, code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

async function describeClip(clip) {
  if (clip.sourceType === 'human') {
    return { clipId: String(clip._id), sourceType: 'human', name: 'Human' };
  }
  const stack = await Stack.findById(clip.sourceId).lean();
  return {
    clipId: String(clip._id),
    sourceType: 'stack',
    stackId: clip.sourceId,
    name: stack ? stack.name : clip.sourceId,
  };
}

// Apply one vote. Verifies the token (tamper/replay-proof), guards against the
// same voter voting twice in a battle, updates Elo (arena) or golden stats, and
// always records the Vote + bumps the Voter. Returns the reveal.
export async function applyVote({ token, winnerClipId, voterId }) {
  const payload = verifyBattle(token); // throws on tamper / expiry
  const { battleId, scenarioId, clipAId, clipBId, kind } = payload;

  if (winnerClipId !== clipAId && winnerClipId !== clipBId) {
    throw err('winnerClipId is not part of this battle', 'BAD_WINNER');
  }

  // Fast path: clean 409 on the common case. The unique { battleId, voterId }
  // index below is the actual guarantee; this just avoids the round-trip work.
  if (await Vote.findOne({ battleId, voterId })) {
    throw err('you have already voted in this battle', 'DUPLICATE');
  }

  const clipA = await Clip.findById(clipAId).lean();
  const clipB = await Clip.findById(clipBId).lean();
  if (!clipA || !clipB) throw err('battle clips no longer exist', 'GONE');

  // --- Read-only preparation: validate and compute everything we need BEFORE
  // touching any rating, so the only thing left after the insert is the writes. ---
  let stackA, stackB;
  if (kind === 'arena') {
    stackA = await Stack.findById(clipA.sourceId);
    stackB = await Stack.findById(clipB.sourceId);
    if (!stackA || !stackB) throw err('battle stacks no longer exist', 'GONE');
  }

  // For golden, correctness is a pure read (voter picked the human clip?). We
  // compute it now so it can be stored on the Vote we insert first.
  let correct = null;
  if (kind === 'golden') {
    const humanClip = clipA.sourceType === 'human' ? clipA : clipB;
    correct = winnerClipId === String(humanClip._id);
  }

  // --- Insert the Vote FIRST. ---
  // The unique index rejects a concurrent duplicate here (code 11000), so we
  // bail BEFORE any Elo/voter mutation. This makes double-applying impossible:
  // a rating can only change once the vote has been durably committed.
  try {
    await Vote.create({
      battleId,
      scenarioId,
      clipAId,
      clipBId,
      winnerClipId,
      voterId,
      kind,
      correct,
    });
  } catch (e) {
    if (e && e.code === 11000) {
      throw err('you have already voted in this battle', 'DUPLICATE');
    }
    throw e;
  }

  // --- Vote is committed; now it is safe to apply the side effects exactly once. ---
  if (kind === 'arena') {
    const scoreA = winnerClipId === clipAId ? 1 : 0;
    const k = adaptiveK(Math.min(stackA.votes, stackB.votes));
    const { ratingA, ratingB } = updateRatings(stackA.rating, stackB.rating, scoreA, k);

    stackA.rating = ratingA;
    stackB.rating = ratingB;
    stackA.votes += 1;
    stackB.votes += 1;
    await stackA.save();
    await stackB.save();
  }

  // Always: upsert the voter and bump counters.
  let voter = await Voter.findById(voterId);
  if (!voter) voter = new Voter({ _id: voterId });
  voter.votes += 1;
  voter.lastVoteAt = new Date();
  if (kind === 'golden') {
    voter.goldenAttempts += 1;
    if (correct) {
      voter.goldenCorrect += 1;
      voter.currentStreak += 1;
      voter.bestStreak = Math.max(voter.bestStreak, voter.currentStreak);
    } else {
      voter.currentStreak = 0;
    }
  }
  await voter.save();

  // Reveal what each clip actually was.
  const reveal = {
    kind,
    winnerClipId,
    clipA: await describeClip(clipA),
    clipB: await describeClip(clipB),
  };

  if (kind === 'golden') {
    reveal.correct = correct;
    reveal.accuracy = voter.goldenAttempts ? voter.goldenCorrect / voter.goldenAttempts : 0;
    reveal.currentStreak = voter.currentStreak;
    reveal.bestStreak = voter.bestStreak;
  }

  return reveal;
}

// Re-exported for tests / callers that want the raw Elo expectation.
export { expectedScore };
