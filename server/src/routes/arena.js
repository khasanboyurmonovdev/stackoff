import express from 'express';
import { buildBattle, applyVote } from '../services/arena.js';
import { Stack } from '../models/Stack.js';
import { Voter } from '../models/Voter.js';
import { humannessFromRating, uncertaintyBand } from '../lib/elo.js';
import { Baseline } from '../models/Baseline.js';
import { Share } from '../models/Share.js';
import { nanoid } from 'nanoid';

const router = express.Router();

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
  const { token, winnerClipId, voterId } = req.body ?? {};
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

export default router;
