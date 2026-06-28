import mongoose from 'mongoose';

// The human baseline: the anchor the humanness scale is measured against, not a
// competitor. Singleton-style — one record, _id "human". Mirrors the Stack
// rating/votes shape so the same Elo machinery can move it once humans enter the
// arena in the next phase. For now it is seeded and static.
const baselineSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    rating: { type: Number, default: 1500 },
    votes: { type: Number, default: 0 },
  },
  { _id: false }
);

export const Baseline = mongoose.model('Baseline', baselineSchema);
