import mongoose from 'mongoose';

// One voter's progress through a given day's DailyChallenge. `results` accrues
// one entry per battle as the voter completes it; `score` is a running count of
// correct picks, kept denormalized so the leaderboard/profile can read it without
// re-deriving from `results`.
const dailyResultEntrySchema = new mongoose.Schema(
  {
    battleIndex: { type: Number, required: true },
    correct: { type: Boolean, required: true },
  },
  { _id: false }
);

const dailyResultSchema = new mongoose.Schema({
  date: { type: String, required: true },
  voterId: { type: String, required: true },
  results: { type: [dailyResultEntrySchema], default: [] },
  score: { type: Number, default: 0 },
  completedAt: { type: Date },
});

// One progress row per voter per day.
dailyResultSchema.index({ date: 1, voterId: 1 }, { unique: true });

export const DailyResult = mongoose.model('DailyResult', dailyResultSchema);
