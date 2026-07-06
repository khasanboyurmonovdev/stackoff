import mongoose from 'mongoose';

// A short, shareable brag card. The 8-char nanoid _id is the public /s/<id> slug,
// swapped in for the old 200-char signed JWT (which some crawlers, e.g. Telegram,
// wouldn't unfurl). The player's golden-ears stats are snapshotted here at share
// time, so the /s unfurl route resolves the card from one lookup and never trusts
// client input — the stats are written server-side from authoritative Voter data.
//
// TTL: createdAt expires at 90 days to match SHARE_TTL_MS (battleToken.js). Mongo's
// background TTL monitor reaps expired rows, so shared links quietly stop working
// after 90 days, degrading to a generic card exactly like an expired JWT does.
const shareSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // 8-char nanoid, set at creation
    accuracy: { type: Number, required: true }, // 0..1 fraction
    bestStreak: { type: Number, default: 0 },
    votes: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, expires: '90d' },
  },
  { _id: false }
);

export const Share = mongoose.model('Share', shareSchema);
