import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { Stack } from '../models/Stack.js';
import { Scenario } from '../models/Scenario.js';
import { STACKS } from '../data/stacks.js';
import { SCENARIOS } from '../data/scenarios.js';

// Upsert every stack and scenario from the registries. For stacks, rating/votes
// are only set on insert ($setOnInsert) so re-running the seed never wipes
// accumulated ratings. Does NOT seed clips — those arrive in the pipeline milestone.
async function seed() {
  await connectDb();

  let stacksUpserted = 0;
  for (const s of STACKS) {
    const { id, ...rest } = s;
    await Stack.updateOne(
      { _id: id },
      {
        $set: rest, // name, stt, llm, tts, turnTaking, priceTier, blurb
        $setOnInsert: { rating: 1200, votes: 0 },
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

  console.log(`[seed] Upserted ${stacksUpserted} stacks, ${scenariosUpserted} scenarios.`);

  await mongoose.disconnect();
  console.log('[seed] Done.');
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
