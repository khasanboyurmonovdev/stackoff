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

export const Vote = mongoose.model('Vote', voteSchema);
