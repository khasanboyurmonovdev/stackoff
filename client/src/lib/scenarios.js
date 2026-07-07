// Friendly framing per scenario so the player knows the one human cue they're
// judging. Keyed by the server's scenarioId. `tests` and `listenFor` are
// mirrored verbatim from server/src/data/scenarios.js.
export const SCENARIO_PROMPTS = {
  interruption: {
    round: 'The Interruption',
    prompt: 'Which one handles being cut off like a human?',
    tests: 'barge-in',
    listenFor: 'When you cut in, does the responder stop and listen — or keep talking over you?',
  },
  'long-pause': {
    round: 'The Long Pause',
    prompt: 'Who waits through the silence like a real person?',
    tests: 'endpointing',
    listenFor: 'During your silence, does it wait — or jump in too early and cut you off?',
  },
  backchannel: {
    round: 'The Backchannel',
    prompt: 'Which keeps its cool when you say “mm-hm”?',
    tests: 'overlap tolerance',
    listenFor: "You murmur 'mm-hm' while it talks. Does it plow on naturally, or awkwardly stop as if interrupted?",
  },
  'self-correction': {
    round: 'The Correction',
    prompt: 'Who catches your change of mind like a human?',
    tests: 'repair handling',
    listenFor: 'Does it catch your correction and use the right address, or lock onto the first thing you said?',
  },
  'rapid-fire': {
    round: 'The Rapid-Fire',
    prompt: 'Which keeps up with the rapid-fire question?',
    tests: 'latency + completeness',
    listenFor: 'Does it wait for the whole 3-part question, then answer fast — or cut in and miss part of it?',
  },
};

export const FALLBACK_PROMPT = {
  round: 'The Call',
  prompt: 'Which one sounds more human?',
};
