import crypto from 'crypto';

// Stateless, signed battle tokens. The server signs exactly which clips were in
// a battle (and the pairing/kind), so a vote can be accepted without a login and
// can't be forged or replayed against a different pairing.
//
// Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256 of that JSON)

const TTL_MS = 30 * 60 * 1000; // 30 minutes (battle tokens)
const SHARE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days — share links live in chat history

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

// --- Share tokens -----------------------------------------------------------
// Same HMAC-SHA256 / base64url(payload)."."base64url(sig) scheme as battles,
// reusing hmac()/secret() verbatim — only the payload and lifetime differ. The
// player's golden-ears stats are baked into the SIGNED payload, so the unfurl
// route trusts the token alone and needs zero DB lookup. Domain-separated with
// typ:'share' so a battle token can never be replayed as a share token.
//
// 90-day TTL (SHARE_TTL_MS): these links live in chat history, so they far
// outlast battle tokens, but still expire. A forged/expired token's blast radius
// is only a bogus brag card (no data access, no state change), and the unfurl
// route degrades an expired/invalid token to a generic card rather than erroring.

// payload in: { accuracy, bestStreak, votes }  — accuracy is a 0..1 fraction.
export function signShare({ accuracy, bestStreak, votes }) {
  const json = JSON.stringify({ typ: 'share', accuracy, bestStreak, votes, iat: Date.now() });
  const body = Buffer.from(json, 'utf8').toString('base64url');
  const sig = hmac(json).toString('base64url');
  return `${body}.${sig}`;
}

// Returns the parsed share payload, or throws on tamper / malformed / wrong type.
export function verifyShare(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    throw new Error('malformed share token');
  }
  const [body, sig] = token.split('.');
  if (!body || !sig) throw new Error('malformed share token');

  const json = Buffer.from(body, 'base64url').toString('utf8');
  const expected = hmac(json);
  const provided = Buffer.from(sig, 'base64url');

  // Constant-time compare; timingSafeEqual throws on length mismatch, so guard it.
  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    throw new Error('invalid share token signature');
  }

  const payload = JSON.parse(json);
  if (payload.typ !== 'share') throw new Error('not a share token');
  if (typeof payload.iat !== 'number' || Date.now() - payload.iat > SHARE_TTL_MS) {
    throw new Error('share token expired');
  }
  return payload;
}
