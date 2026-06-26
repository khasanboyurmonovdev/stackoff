import mongoose from 'mongoose';

// A deployable voice-AI stack. Uses the string stack id (e.g. "velvet") as _id.
const stackSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    stt: { type: String, required: true },
    llm: { type: String, required: true },
    tts: { type: String, required: true },
    turnTaking: { type: mongoose.Schema.Types.Mixed, required: true },
    priceTier: { type: String, required: true },
    blurb: { type: String, required: true },
    rating: { type: Number, default: 1200 },
    votes: { type: Number, default: 0 },
  },
  { _id: false }
);

export const Stack = mongoose.model('Stack', stackSchema);
