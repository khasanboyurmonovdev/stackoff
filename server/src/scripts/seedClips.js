import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import { Clip } from '../models/Clip.js';

// Reads the assembled clip index produced by the pipeline (pipeline/out/clips.json)
// and upserts one Clip doc per final clip. audioUrl = AUDIO_ORIGIN + '/' + file,
// so the same DB can point at local static serving or a CDN just by changing the
// env var. Idempotent: keyed on { scenarioId, sourceType, sourceId } so re-running
// updates URLs/durations in place instead of duplicating.
const here = dirname(fileURLToPath(import.meta.url));
const CLIPS_JSON = resolve(here, '../../../pipeline/out/clips.json');

async function seedClips() {
  const origin = (process.env.AUDIO_ORIGIN || '').replace(/\/$/, '');
  if (!origin) {
    console.error('[seed:clips] AUDIO_ORIGIN is not set. Add it to server/.env (e.g. http://localhost:4000/audio).');
    process.exit(1);
  }

  const clips = JSON.parse(await readFile(CLIPS_JSON, 'utf-8'));
  await connectDb();

  let upserted = 0;
  for (const c of clips) {
    await Clip.updateOne(
      { scenarioId: c.scenarioId, sourceType: c.sourceType, sourceId: c.sourceId },
      {
        $set: {
          audioUrl: `${origin}/${c.file}`,
          durationMs: c.durationMs,
        },
      },
      { upsert: true }
    );
    upserted++;
  }

  const total = await Clip.countDocuments();
  console.log(`[seed:clips] Upserted ${upserted} clips (${total} total in collection).`);

  await mongoose.disconnect();
  console.log('[seed:clips] Done.');
}

seedClips().catch((err) => {
  console.error('[seed:clips] Failed:', err);
  process.exit(1);
});
