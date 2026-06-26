import mongoose from 'mongoose';

// A rendered audio clip of one source answering one scenario.
const clipSchema = new mongoose.Schema({
  scenarioId: { type: String, ref: 'Scenario', required: true, index: true },
  sourceType: { type: String, enum: ['stack', 'human'], required: true },
  sourceId: { type: String, required: true }, // stack id, or "human"
  audioUrl: { type: String, required: true },
  durationMs: { type: Number, required: true },
});

export const Clip = mongoose.model('Clip', clipSchema);
