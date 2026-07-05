// Milestone B — Cartesia TTS for the Velvet + Sprint stacks only (10 clips).
// Drop-in replacement for Piper: writes pcm_s16le / 22050 Hz / mono WAVs to the
// exact out/responses/{scenario}__{stack}.wav paths the existing assemble.py +
// phone.py already consume. Reads the LOCKED transcripts from out/manifest.json
// (does NOT re-call Groq) so response texts stay a controlled variable.
//
// Two-phase budget gate (this env is non-interactive):
//   node tts-cartesia.mjs         -> print char budget, synthesize NOTHING, stop
//   node tts-cartesia.mjs --go    -> actually synthesize the 10 clips
//
// No new dependencies (native fetch + node:fs). CARTESIA_API_KEY never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const SERVER_ENV = resolve(here, '..', 'server', '.env');
const MANIFEST = resolve(here, 'out', 'manifest.json');
const RESPONSES_DIR = resolve(here, 'out', 'responses');

// --- Env loading: same manual parse as the Python pipeline + the probes ------
function loadKey(name) {
  if (process.env[name]) return process.env[name];
  const text = readFileSync(SERVER_ENV, 'utf-8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+?)\\s*$`));
    if (m) return m[1];
  }
  return undefined;
}

const KEY = loadKey('CARTESIA_API_KEY');
if (!KEY) {
  console.error(`CARTESIA_API_KEY not found in env or ${SERVER_ENV}`);
  process.exit(1);
}
console.log(`key loaded (length ${KEY.length})`);

// --- Casting (verified via probe, both 200) ---------------------------------
const VOICE = {
  velvet: '30894953-bcce-41fe-892c-15ce19c843ff',
  sprint: '4c2dcd38-5608-45ca-8f11-51c88208d01c',
};

// Audio format must match Piper exactly so assemble.py/phone.py run unchanged.
const OUTPUT_FORMAT = { container: 'wav', encoding: 'pcm_s16le', sample_rate: 22050 };
const CARTESIA_VERSION = '2025-04-16';
const AUTH = { Authorization: `Bearer ${KEY}`, 'Cartesia-Version': CARTESIA_VERSION };

// --- Gather the 10 locked transcripts from the manifest ---------------------
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf-8'));
const lines = manifest.responses
  .filter((r) => r.stackId === 'velvet' || r.stackId === 'sprint')
  .map((r) => ({
    stackId: r.stackId,
    scenarioId: r.scenarioId,
    text: r.text,
    voiceId: VOICE[r.stackId],
    outPath: resolve(RESPONSES_DIR, `${r.scenarioId}__${r.stackId}.wav`),
  }))
  .sort((a, b) => (a.stackId + a.scenarioId).localeCompare(b.stackId + b.scenarioId));

if (lines.length !== 10) {
  console.error(`Expected 10 velvet/sprint transcripts, found ${lines.length}. Aborting.`);
  process.exit(1);
}

// --- Budget gate ------------------------------------------------------------
let total = 0;
console.log('\n=== CHARACTER BUDGET (10 transcripts) ===');
for (const l of lines) {
  const n = l.text.length;
  total += n;
  console.log(`  ${l.stackId.padEnd(7)} ${l.scenarioId.padEnd(16)} ${String(n).padStart(3)} chars`);
}
console.log(`  TOTAL: ${total} chars across ${lines.length} lines`);

const GO = process.argv.includes('--go');
if (!GO) {
  console.log('\n[gate] Dry run — nothing synthesized. Re-run with --go to generate.');
  process.exit(0);
}

// --- Synthesis (sequential; free-tier concurrency is 1) ---------------------
async function synth(voiceId, text, modelId) {
  return fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    headers: { ...AUTH, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model_id: modelId,
      transcript: text,
      voice: { mode: 'id', id: voiceId },
      output_format: OUTPUT_FORMAT,
    }),
  });
}

function probe(path) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries',
     'stream=codec_name,sample_rate,channels:format=duration',
     '-of', 'default=noprint_wrappers=1', path],
    { encoding: 'utf-8' },
  );
  return out.trim();
}

console.log('\n=== SYNTHESIZING (sequential) ===');
let model = 'sonic-3'; // try sonic-3 first; fall back to sonic-2 for ALL if rejected

for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  let res = await synth(l.voiceId, l.text, model);

  // Model-availability check happens once, on the very first line.
  if (i === 0 && res.status !== 200) {
    const body = await res.clone().text();
    if (/model/i.test(body)) {
      console.error(`sonic-3 rejected (HTTP ${res.status}): ${body}`);
      console.error('Falling back to model_id "sonic-2" for ALL 10 lines.');
      model = 'sonic-2';
      res = await synth(l.voiceId, l.text, model);
    }
  }

  if (res.status !== 200) {
    const body = await res.text();
    console.error(`FAILED ${l.scenarioId}__${l.stackId} (model "${model}") HTTP ${res.status}: ${body}`);
    process.exit(1);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(l.outPath, bytes);
  console.log(`  ${l.scenarioId}__${l.stackId}: wrote ${bytes.length} bytes | ${probe(l.outPath)}`);
}

console.log(`\n=== TTS DONE ===`);
console.log(`model actually used: ${model}  <-- UI chips must claim this`);
console.log('10 response WAVs written to out/responses/ (pcm_s16le/22050/mono).');
console.log('Next: python assemble.py && python phone.py (stock, all 35).');
