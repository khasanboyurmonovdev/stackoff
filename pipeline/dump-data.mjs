// Emits the canonical stacks + scenarios from the server as JSON so the Python
// pipeline consumes a single source of truth instead of re-declaring the data.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STACKS } from '../server/src/data/stacks.js';
import { SCENARIOS } from '../server/src/data/scenarios.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'out', '_data.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ stacks: STACKS, scenarios: SCENARIOS }, null, 2));
console.log(`[dump-data] wrote ${out} (${STACKS.length} stacks, ${SCENARIOS.length} scenarios)`);
