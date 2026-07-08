import express from 'express';
import { buildBattle, applyVote } from '../services/arena.js';
import { signBattle } from '../services/battleToken.js';
import { getOrCreateDaily, getDailyProgress, recordDailyResult, todayUTC } from '../services/daily.js';
import { Stack } from '../models/Stack.js';
import { Voter } from '../models/Voter.js';
import { Clip } from '../models/Clip.js';
import { humannessFromRating, uncertaintyBand } from '../lib/elo.js';
import { displayName } from '../lib/displayName.js';
import { Baseline } from '../models/Baseline.js';
import { Share } from '../models/Share.js';
import { nanoid } from 'nanoid';

const router = express.Router();

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verify a Cloudflare Turnstile token against siteverify. Returns true to let the
// vote through, false to reject with 403.
// - TURNSTILE_SECRET unset/empty -> skip entirely (local dev parity with the
//   client, which also sends no token when its site key is unset).
// - Secret set -> the token MUST verify. FAIL CLOSED: a missing token, a
//   success:false response, or a network/timeout error all return false.
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;

  // Short timeout so a hung Cloudflare can't hang the vote.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', typeof token === 'string' ? token : '');
    if (ip) params.set('remoteip', ip);

    const r = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
      signal: controller.signal,
    });
    const data = await r.json();
    return data?.success === true;
  } catch {
    return false; // network/timeout while a secret is configured -> fail closed
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/battle — a fresh signed battle, or 503 until clips exist.
router.get('/battle', async (req, res, next) => {
  try {
    const battle = await buildBattle();
    if (!battle.available) {
      return res.status(503).json({ error: 'no clips yet' });
    }
    const { available, ...payload } = battle;
    res.json(payload);
  } catch (e) {
    next(e);
  }
});

// POST /api/vote — body { token, winnerClipId, voterId }.
router.post('/vote', async (req, res, next) => {
  const { token, winnerClipId, voterId, turnstileToken } = req.body ?? {};
  if (
    typeof token !== 'string' ||
    typeof winnerClipId !== 'string' ||
    typeof voterId !== 'string' ||
    !token ||
    !winnerClipId ||
    !voterId
  ) {
    return res.status(400).json({ error: 'token, winnerClipId and voterId are required' });
  }

  // Bot gate on the vote endpoint only. req.ip is the real client IP (trust proxy
  // is set to 1, so X-Forwarded-For from Nginx is honored).
  if (!(await verifyTurnstile(turnstileToken, req.ip))) {
    return res.status(403).json({ error: 'turnstile verification failed' });
  }

  try {
    const reveal = await applyVote({ token, winnerClipId, voterId });
    res.json(reveal);
  } catch (e) {
    if (e.code === 'DUPLICATE') return res.status(409).json({ error: e.message });
    if (e.code === 'BAD_WINNER') return res.status(400).json({ error: e.message });
    if (e.code === 'GONE') return res.status(409).json({ error: e.message });
    // Token tamper / expiry / malformed.
    return res.status(400).json({ error: 'invalid or expired battle token' });
  }
});

// GET /api/leaderboard — stacks by rating desc, scaled to humanness 0-100.
router.get('/leaderboard', async (req, res, next) => {
  try {
    // Fall back to the default anchor if the baseline isn't seeded yet, so the
    // route never crashes pre-seed.
    const baseline = (await Baseline.findById('human').lean()) ?? { rating: 1500, votes: 0 };

    const stacks = (await Stack.find().lean()).sort((a, b) => b.rating - a.rating);
    const stackRows = stacks.map((s) => ({
      id: s._id,
      name: s.name,
      humanness: Math.round(humannessFromRating(s.rating, baseline.rating)),
      uncertainty: uncertaintyBand(s.votes),
      votes: s.votes,
      priceTier: s.priceTier,
      stt: s.stt,
      llm: s.llm,
      tts: s.tts,
    }));

    const humanRow = {
      id: 'human',
      name: 'Human',
      isBaseline: true,
      humanness: 100,
      votes: baseline.votes,
    };

    res.json([humanRow, ...stackRows]);
  } catch (e) {
    next(e);
  }
});

// GET /api/voter/:voterId — that voter's stats, or zeros if unseen.
router.get('/voter/:voterId', async (req, res, next) => {
  try {
    const v = await Voter.findById(req.params.voterId).lean();
    if (!v) {
      return res.json({ votes: 0, accuracy: 0, currentStreak: 0, bestStreak: 0 });
    }
    res.json({
      votes: v.votes,
      accuracy: v.goldenAttempts ? v.goldenCorrect / v.goldenAttempts : 0,
      currentStreak: v.currentStreak,
      bestStreak: v.bestStreak,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/voter/:voterId/share — mint a short share link from the voter's
// AUTHORITATIVE stats (read from the DB, never client-supplied), so nobody can
// forge a fake brag card. The stats are snapshotted into a Share row keyed by an
// 8-char nanoid, so the /s unfurl route resolves the card from that id alone.
// Unseen voter -> zeros (a valid, humble card). This is user-action-only on the
// client (Share / Copy-link buttons), so each call is a deliberate mint, not a
// per-render write; expired rows are reaped by the Share TTL index.
router.get('/voter/:voterId/share', async (req, res, next) => {
  try {
    const v = await Voter.findById(req.params.voterId).lean();
    const accuracy = v && v.goldenAttempts ? v.goldenCorrect / v.goldenAttempts : 0;
    const id = nanoid(8);
    await Share.create({
      _id: id,
      accuracy,
      bestStreak: v ? v.bestStreak : 0,
      votes: v ? v.votes : 0,
    });
    // PUBLIC_SHARE_BASE lets prod/dev pin the public origin of /s; otherwise use
    // the request's own origin (the server that owns /s).
    const base = process.env.PUBLIC_SHARE_BASE || `${req.protocol}://${req.get('host')}`;
    res.json({ id, url: `${base}/s/${id}` });
  } catch (e) {
    next(e);
  }
});

// GET /api/daily?voterId=... — today's fixed golden-battle set (shared by every
// voter), freshly signed tokens per battle, and this voter's progress if given.
router.get('/daily', async (req, res, next) => {
  try {
    const dateStr = todayUTC();
    const daily = await getOrCreateDaily(dateStr);
    const voterId = typeof req.query.voterId === 'string' ? req.query.voterId : null;
    const progress = voterId ? await getDailyProgress(dateStr, voterId) : null;

    const clipIds = daily.battles.flatMap((b) => [b.clipAId, b.clipBId]);
    const clips = await Clip.find({ _id: { $in: clipIds } }).lean();
    const clipById = Object.fromEntries(clips.map((c) => [String(c._id), c]));

    const battles = daily.battles.map((b, i) => {
      const clipAId = String(b.clipAId);
      const clipBId = String(b.clipBId);
      return {
        index: i,
        token: signBattle({
          battleId: `daily-${dateStr}-${i}`,
          scenarioId: b.scenarioId,
          clipAId,
          clipBId,
          kind: b.kind,
          iat: Date.now(),
        }),
        scenarioId: b.scenarioId,
        clipA: { id: clipAId, audioUrl: clipById[clipAId]?.audioUrl, durationMs: clipById[clipAId]?.durationMs },
        clipB: { id: clipBId, audioUrl: clipById[clipBId]?.audioUrl, durationMs: clipById[clipBId]?.durationMs },
        voted: progress?.results?.some((r) => r.battleIndex === i) || false,
      };
    });

    res.json({
      date: dateStr,
      total: daily.battles.length,
      battles,
      progress: progress
        ? { score: progress.score, completed: progress.results.length }
        : { score: 0, completed: 0 },
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/daily/vote — body { token, winnerClipId, voterId, battleIndex }.
// Applies the vote through the same path as a normal battle (Elo + voter stats
// all update identically), then additionally records the outcome against the
// voter's daily progress.
router.post('/daily/vote', async (req, res, next) => {
  const { token, winnerClipId, voterId, battleIndex } = req.body ?? {};
  if (
    typeof token !== 'string' ||
    typeof winnerClipId !== 'string' ||
    typeof voterId !== 'string' ||
    typeof battleIndex !== 'number' ||
    !token ||
    !winnerClipId ||
    !voterId
  ) {
    return res.status(400).json({ error: 'token, winnerClipId, voterId and battleIndex are required' });
  }

  try {
    const reveal = await applyVote({ token, winnerClipId, voterId });
    const dateStr = todayUTC();
    const [result, daily] = await Promise.all([
      recordDailyResult(dateStr, voterId, battleIndex, reveal.correct === true),
      getOrCreateDaily(dateStr),
    ]);

    res.json({
      ...reveal,
      dailyProgress: {
        score: result.score,
        completed: result.results.length,
        total: daily.battles.length,
      },
    });
  } catch (e) {
    if (e.code === 'DUPLICATE') return res.status(409).json({ error: e.message });
    if (e.code === 'BAD_WINNER') return res.status(400).json({ error: e.message });
    if (e.code === 'GONE') return res.status(409).json({ error: e.message });
    return res.status(400).json({ error: 'invalid or expired battle token' });
  }
});

// GET /api/voters/top?voterId=... — voter leaderboard by golden-ears accuracy
// (min 5 golden attempts to qualify, avoiding 1-vote lucky guesses), tiebroken
// by best streak. `voterId`, if given, resolves that voter's own rank even when
// they're outside the top 20 (or null if they don't meet the attempt floor).
router.get('/voters/top', async (req, res, next) => {
  try {
    const ranked = await Voter.aggregate([
      { $match: { goldenAttempts: { $gte: 5 } } },
      { $addFields: { accuracy: { $divide: ['$goldenCorrect', '$goldenAttempts'] } } },
      { $sort: { accuracy: -1, bestStreak: -1 } },
      { $limit: 20 },
      { $project: { _id: 1, accuracy: 1, bestStreak: 1, goldenAttempts: 1, votes: 1 } },
    ]);

    const voters = ranked.map((v, i) => ({
      rank: i + 1,
      name: displayName(v._id),
      accuracy: v.accuracy,
      bestStreak: v.bestStreak,
      goldenAttempts: v.goldenAttempts,
    }));

    let you = null;
    const voterId = typeof req.query.voterId === 'string' ? req.query.voterId : null;
    if (voterId) {
      const voter = await Voter.findById(voterId).lean();
      if (voter && voter.goldenAttempts >= 5) {
        const accuracy = voter.goldenCorrect / voter.goldenAttempts;
        const ahead = await Voter.aggregate([
          { $match: { goldenAttempts: { $gte: 5 } } },
          { $addFields: { accuracy: { $divide: ['$goldenCorrect', '$goldenAttempts'] } } },
          {
            $match: {
              $or: [{ accuracy: { $gt: accuracy } }, { accuracy, bestStreak: { $gt: voter.bestStreak } }],
            },
          },
          { $count: 'n' },
        ]);
        const rank = (ahead[0]?.n || 0) + 1;
        you = { rank, name: displayName(voter._id), accuracy, bestStreak: voter.bestStreak };
      }
    }

    res.json({ voters, you });
  } catch (e) {
    next(e);
  }
});

export default router;
