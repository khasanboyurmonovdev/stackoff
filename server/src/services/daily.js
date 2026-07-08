import { Clip } from '../models/Clip.js';
import { DailyChallenge } from '../models/DailyChallenge.js';
import { DailyResult } from '../models/DailyResult.js';

const DAILY_BATTLE_COUNT = 3;

// UTC calendar day as "YYYY-MM-DD" — the natural key for a day's challenge,
// independent of the requester's local timezone.
export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// Deterministic string hash (djb2-ish) used to seed scenario/clip picks from a
// date string, so the same date always builds the same battle set.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Fisher-Yates shuffle driven by a seeded LCG instead of Math.random, so the
// same seed always produces the same order.
function seededShuffle(arr, seedStr) {
  let seed = hashString(seedStr);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build today's fixed battle set: up to DAILY_BATTLE_COUNT golden battles
// (human vs stack), one per scenario, chosen deterministically from `dateStr` so
// every voter that day gets the identical set. Idempotent under concurrent
// callers via the unique index on `date` — the loser of the race just re-reads
// the winner's document.
export async function getOrCreateDaily(dateStr) {
  const existing = await DailyChallenge.findOne({ date: dateStr }).lean();
  if (existing) return existing;

  const scenarioIds = await Clip.distinct('scenarioId');
  const chosenScenarios = seededShuffle(scenarioIds, dateStr).slice(
    0,
    Math.min(DAILY_BATTLE_COUNT, scenarioIds.length)
  );

  const battles = [];
  for (const scenarioId of chosenScenarios) {
    const clips = await Clip.find({ scenarioId }).lean();
    const humanClips = clips.filter((c) => c.sourceType === 'human');
    const stackClips = clips.filter((c) => c.sourceType === 'stack');
    if (!humanClips.length || !stackClips.length) continue; // no golden pair possible here

    const humanClip = humanClips[hashString(dateStr + scenarioId + 'human') % humanClips.length];
    const stackClip = stackClips[hashString(dateStr + scenarioId + 'stack') % stackClips.length];

    battles.push({
      scenarioId,
      clipAId: humanClip._id,
      clipBId: stackClip._id,
      kind: 'golden',
    });
  }

  try {
    const created = await DailyChallenge.create({ date: dateStr, battles });
    return created.toObject();
  } catch (e) {
    if (e && e.code === 11000) {
      // Lost the create race — another request already built today's set.
      const winner = await DailyChallenge.findOne({ date: dateStr }).lean();
      if (winner) return winner;
    }
    throw e;
  }
}

// A voter's progress on a given day, or null if they haven't started.
export async function getDailyProgress(dateStr, voterId) {
  if (!voterId) return null;
  return DailyResult.findOne({ date: dateStr, voterId }).lean();
}

function err(message, code) {
  const e = new Error(message);
  e.code = code;
  return e;
}

// Record one daily-battle outcome for a voter. Atomic: the filter's
// `results.battleIndex: {$ne}` clause means the $push/$inc only apply if this
// battleIndex hasn't been recorded yet; a repeat lands on the unique
// {date,voterId} index instead (since the filter no longer matches an existing
// doc, the upsert tries to insert a duplicate) and is reported as DUPLICATE.
export async function recordDailyResult(dateStr, voterId, battleIndex, correct) {
  let updated;
  try {
    updated = await DailyResult.findOneAndUpdate(
      { date: dateStr, voterId, 'results.battleIndex': { $ne: battleIndex } },
      {
        $push: { results: { battleIndex, correct } },
        $inc: { score: correct ? 1 : 0 },
        $setOnInsert: { date: dateStr, voterId },
      },
      { upsert: true, new: true }
    );
  } catch (e) {
    if (e && e.code === 11000) {
      throw err('you have already voted on this daily battle', 'DUPLICATE');
    }
    throw e;
  }

  const daily = await DailyChallenge.findOne({ date: dateStr }).lean();
  if (daily && !updated.completedAt && updated.results.length === daily.battles.length) {
    updated.completedAt = new Date();
    await updated.save();
  }

  return updated;
}
