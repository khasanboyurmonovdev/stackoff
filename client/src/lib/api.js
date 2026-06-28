const VOTER_KEY = 'stackoff_voter_id';

// RFC4122-ish v4 id. crypto.randomUUID is unavailable in non-secure contexts
// (http://<lan-ip> on a phone), so fall back to getRandomValues / Math.random.
function genId() {
  try {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  const b = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'));
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10, 16).join('')}`;
}

export function getVoterId() {
  let id = null;
  try {
    id = localStorage.getItem(VOTER_KEY);
  } catch {
    /* private mode — fall back to a per-session id */
  }
  if (!id) {
    id = genId();
    try {
      localStorage.setItem(VOTER_KEY, id);
    } catch {
      /* ignore */
    }
  }
  return id;
}

// Strip the origin so audio loads through the Vite proxy (/audio/...) — the
// API hands back an absolute localhost URL the phone can't resolve.
export function clipPath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export async function fetchBattle() {
  const r = await fetch('/api/battle');
  if (r.status === 503) return { empty: true };
  if (!r.ok) throw new Error(`battle ${r.status}`);
  return r.json();
}

export async function postVote(body) {
  const r = await fetch('/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (r.status === 409) {
    const e = new Error('already voted');
    e.code = 'DUPLICATE';
    throw e;
  }
  if (!r.ok) throw new Error(`vote ${r.status}`);
  return r.json();
}

export async function fetchLeaderboard() {
  const r = await fetch('/api/leaderboard');
  if (!r.ok) throw new Error(`leaderboard ${r.status}`);
  return r.json();
}

export async function fetchVoter(id) {
  try {
    const r = await fetch(`/api/voter/${id}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}
