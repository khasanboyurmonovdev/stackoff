import crypto from 'crypto';

// Stateless, signed battle tokens. The server signs exactly which clips were in
// a battle (and the pairing/kind), so a vote can be accepted without a login and
// can't be forged or replayed against a different pairing.
//
// Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 of that JSON)

const TTL_MS = 30 * 60 * 1000; // 30 minutes

function secret() {
  const s = process.env.BATTLE_TOKEN_SECRET;
  if (!s) throw new Error('BATTLE_TOKEN_SECRET is not set');
  return s;
}

function hmac(json) {
  return crypto.createHmac('sha256', secret()).update(json).digest();
}

// payload: { battleId, scenarioId, clipAId, clipBId, kind, iat }
export function signBattle(payload) {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, 'utf8').toString('base64url');
  const sig = hmac(json).toString('base64url');
  return `${body}.${sig}`;
}

// Returns the parsed payload, or throws on tamper / expiry / malformed token.
export function verifyBattle(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    throw new Error('malformed battle token');
  }
  const [body, sig] = token.split('.');
  if (!body || !sig) throw new Error('malformed battle token');

  const json = Buffer.from(body, 'base64url').toString('utf8');
  const expected = hmac(json);
  const provided = Buffer.from(sig, 'base64url');

  // Constant-time compare; timingSafeEqual throws on length mismatch, so guard it.
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    throw new Error('invalid battle token signature');
  }

  const payload = JSON.parse(json);
  if (typeof payload.iat !== 'number' || Date.now() - payload.iat > TTL_MS) {
    throw new Error('battle token expired');
  }
  return payload;
}
