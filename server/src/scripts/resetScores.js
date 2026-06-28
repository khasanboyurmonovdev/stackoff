import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { Stack } from '../models/Stack.js';
import { Baseline } from '../models/Baseline.js';

// ONE-TIME migration for the scoring overhaul. Clears stacks + the human
// baseline so the next `node src/scripts/seed.js` re-inserts them with the
// designed phantom priors via $setOnInsert. The deleted rating/votes are the
// uniform-1200 cold-start noise this overhaul replaces. NOT part of normal
// seeding — run once, intentionally.
async function reset() {
  await connectDb();
  const s = await Stack.deleteMany({});
  const b = await Baseline.deleteMany({ _id: 'human' });
  console.log(`[reset] Deleted ${s.deletedCount} stacks, ${b.deletedCount} baseline. Run seed next.`);
  await mongoose.disconnect();
}
reset().catch((e) => { console.error('[reset] Failed:', e); process.exit(1); });
