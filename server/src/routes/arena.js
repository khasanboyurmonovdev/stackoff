import express from 'express';
import { buildBattle, applyVote } from '../services/arena.js';
import { Stack } from '../models/Stack.js';
import { Voter } from '../models/Voter.js';
import { normalize, uncertaintyBand } from '../lib/elo.js';

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
    const stacks = (await Stack.find().lean()).sort((a, b) => b.rating - a.rating);
    const normalized = normalize(stacks.map((s) => ({ id: s._id, rating: s.rating })));
    const humannessById = Object.fromEntries(normalized.map((n) => [n.id, n.humanness]));

    const rows = stacks.map((s) => ({
      id: s._id,
      name: s.name,
      humanness: Math.round(humannessById[s._id]),
      uncertainty: uncertaintyBand(s.votes),
      votes: s.votes,
      priceTier: s.priceTier,
      stt: s.stt,
      llm: s.llm,
      tts: s.tts,
    }));
    res.json(rows);
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

export default router;
