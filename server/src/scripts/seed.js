import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { Stack } from '../models/Stack.js';
import { Scenario } from '../models/Scenario.js';
import { Baseline } from '../models/Baseline.js';
import { STACKS } from '../data/stacks.js';
import { SCENARIOS } from '../data/scenarios.js';

// Phantom priors: a believable skill order baked in so the board reads sensibly
// from vote one and cold-start noise can't fluke the ranking. Best -> worst:
// Velvet, Studio, Cosmo, Sage, Sprint, Thrift, spread below the human (1500).
// INSERT-ONLY — applied via $setOnInsert so re-seeding never wipes real scores.
const PHANTOM_PRIORS = {
  velvet: { rating: 1320, votes: 12 },
  studio: { rating: 1280, votes: 11 },
  cosmo:  { rating: 1240, votes: 10 },
  sage:   { rating: 1200, votes: 10 },
  sprint: { rating: 1160, votes: 9 },
  thrift: { rating: 1120, votes: 8 },
};

// Upsert every stack and scenario from the registries. For stacks, rating/votes
// are only set on insert ($setOnInsert) so re-running the seed never wipes
// accumulated ratings. Does NOT seed clips — those arrive in the pipeline milestone.
async function seed() {
  await connectDb();

  // Human baseline — the scale's anchor. rating/votes are insert-only so a
  // re-seed never resets it (mirrors the stack rule below).
  await Baseline.updateOne(
    { _id: 'human' },
    { $setOnInsert: { rating: 1500, votes: 500 } },
    { upsert: true }
  );

  let stacksUpserted = 0;
  for (const s of STACKS) {
    const { id, ...rest } = s;
    await Stack.updateOne(
      { _id: id },
      {
        $set: rest, // name, stt, llm, tts, turnTaking, priceTier, blurb
        $setOnInsert: PHANTOM_PRIORS[id] ?? { rating: 1200, votes: 0 },
      },
      { upsert: true }
    );
    stacksUpserted++;
  }

  let scenariosUpserted = 0;
  for (const sc of SCENARIOS) {
    const { id, ...rest } = sc;
    await Scenario.updateOne(
      { _id: id },
      { $set: rest },
      { upsert: true }
    );
    scenariosUpserted++;
  }

  console.log(`[seed] Upserted ${stacksUpserted} stacks, ${scenariosUpserted} scenarios, 1 human baseline.`);

  await mongoose.disconnect();
  console.log('[seed] Done.');
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
