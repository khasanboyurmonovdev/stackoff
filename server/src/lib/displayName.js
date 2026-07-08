// Deterministic "Adjective Noun #xxxx" display name derived from a voter UUID.
// Same voterId always produces the same name — no storage needed.

const ADJECTIVES = [
  'Sharp', 'Silver', 'Golden', 'Calm', 'Swift', 'Bold', 'Keen', 'Bright', 'Steady', 'Quick',
  'Iron', 'Crystal', 'Silent', 'Nimble', 'Copper', 'Velvet', 'Phantom', 'Arctic', 'Lunar', 'Sonic',
  'Crimson', 'Shadow', 'Electric', 'Frosty',
];

const NOUNS = [
  'Fox', 'Owl', 'Hawk', 'Wolf', 'Bear', 'Lynx', 'Crane', 'Raven', 'Tiger', 'Viper',
  'Falcon', 'Panther', 'Cobra', 'Eagle', 'Jaguar', 'Otter', 'Heron', 'Badger', 'Mantis', 'Sphinx',
  'Puma', 'Kestrel', 'Marten', 'Osprey',
];

// djb2-ish string hash. Deterministic, no crypto needed for a cosmetic name.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function displayName(voterId) {
  const id = String(voterId);
  const hash = hashString(id);
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length];
  const suffix = id.slice(-4);
  return `${adjective} ${noun} #${suffix}`;
}
