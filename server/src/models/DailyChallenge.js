import mongoose from 'mongoose';

// The day's fixed set of golden battles, shared by every voter. `date` is the
// UTC calendar day ("YYYY-MM-DD") and doubles as the natural key — one document
// per day, generated lazily by the first request that day (see services/daily.js).
const dailyBattleSchema = new mongoose.Schema(
  {
    scenarioId: { type: String, required: true },
    clipAId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clip', required: true },
    clipBId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clip', required: true },
    kind: { type: String, default: 'golden' },
  },
  { _id: false }
);

const dailyChallengeSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  battles: { type: [dailyBattleSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const DailyChallenge = mongoose.model('DailyChallenge', dailyChallengeSchema);
