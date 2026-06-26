import mongoose from 'mongoose';

// An anonymous voter, keyed by a client-generated uuid stored as _id.
const voterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    votes: { type: Number, default: 0 },
    goldenAttempts: { type: Number, default: 0 },
    goldenCorrect: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastVoteAt: { type: Date },
  },
  { _id: false }
);

export const Voter = mongoose.model('Voter', voterSchema);
