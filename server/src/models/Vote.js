import mongoose from 'mongoose';

// A single pairwise vote in a battle. `kind` distinguishes a normal arena vote
// from a golden (known-answer) check; `correct` is null for arena votes.
const voteSchema = new mongoose.Schema({
  battleId: { type: String, required: true },
  scenarioId: { type: String, required: true },
  clipAId: { type: String, required: true },
  clipBId: { type: String, required: true },
  winnerClipId: { type: String, required: true },
  voterId: { type: String, required: true, index: true },
  kind: { type: String, enum: ['arena', 'golden'], required: true },
  correct: { type: Boolean, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Hard guarantee: one vote per voter per battle. This unique index is the real
// duplicate guard — applyVote's findOne is only a fast path for a clean 409.
voteSchema.index({ battleId: 1, voterId: 1 }, { unique: true });

export const Vote = mongoose.model('Vote', voteSchema);
