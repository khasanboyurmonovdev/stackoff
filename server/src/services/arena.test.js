// Plain-node test for the arena services. Fully covers battleToken with no DB.
// Run: node src/services/arena.test.js
import 'dotenv/config';
import { signBattle, verifyBattle } from './battleToken.js';

let passed = 0;
let failed = 0;

function check(name, cond) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}

function throws(fn) {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

const basePayload = () => ({
  battleId: 'b-123',
  scenarioId: 'interruption',
  clipAId: 'clipA',
  clipBId: 'clipB',
  kind: 'arena',
  iat: Date.now(),
});

// 1. Sign/verify roundtrip returns the same payload.
{
  const payload = basePayload();
  const token = signBattle(payload);
  const out = verifyBattle(token);
  check('roundtrip: battleId preserved', out.battleId === payload.battleId);
  check('roundtrip: scenarioId preserved', out.scenarioId === payload.scenarioId);
  check('roundtrip: clipAId preserved', out.clipAId === payload.clipAId);
  check('roundtrip: clipBId preserved', out.clipBId === payload.clipBId);
  check('roundtrip: kind preserved', out.kind === payload.kind);
  check('roundtrip: iat preserved', out.iat === payload.iat);
}

// 2. Tamper detection.
{
  const token = signBattle(basePayload());
  const [body, sig] = token.split('.');

  // Flip a byte in the payload body -> HMAC no longer matches.
  const bi = Math.floor(body.length / 2);
  const flippedBodyChar = body[bi] === 'A' ? 'B' : 'A';
  const tamperedBody = body.slice(0, bi) + flippedBodyChar + body.slice(bi + 1);
  check('tamper: flipped payload byte rejected', throws(() => verifyBattle(`${tamperedBody}.${sig}`)));

  // Flip a byte in the signature -> rejected.
  const si = Math.floor(sig.length / 2);
  const flippedSigChar = sig[si] === 'A' ? 'B' : 'A';
  const tamperedSig = sig.slice(0, si) + flippedSigChar + sig.slice(si + 1);
  check('tamper: flipped signature byte rejected', throws(() => verifyBattle(`${body}.${tamperedSig}`)));

  // Malformed (no dot) -> rejected.
  check('tamper: malformed token rejected', throws(() => verifyBattle('not-a-token')));
}

// 3. Expiry: an iat older than the 30-minute TTL is rejected.
{
  const expired = { ...basePayload(), iat: Date.now() - 31 * 60 * 1000 };
  const token = signBattle(expired);
  check('expiry: token older than TTL rejected', throws(() => verifyBattle(token)));

  // A token right at the edge (just under TTL) still verifies.
  const fresh = { ...basePayload(), iat: Date.now() - 29 * 60 * 1000 };
  const freshToken = signBattle(fresh);
  check('expiry: token within TTL accepted', !throws(() => verifyBattle(freshToken)));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
