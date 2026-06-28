// Friendly framing per scenario so the player knows the one human cue they're
// judging. Keyed by the server's scenarioId.
export const SCENARIO_PROMPTS = {
  interruption: {
    round: 'The Interruption',
    prompt: 'Which one handles being cut off like a human?',
  },
  'long-pause': {
    round: 'The Long Pause',
    prompt: 'Who waits through the silence like a real person?',
  },
  backchannel: {
    round: 'The Backchannel',
    prompt: 'Which keeps its cool when you say “mm-hm”?',
  },
  'self-correction': {
    round: 'The Correction',
    prompt: 'Who catches your change of mind like a human?',
  },
  'rapid-fire': {
    round: 'The Rapid-Fire',
    prompt: 'Which keeps up with the rapid-fire question?',
  },
};

export const FALLBACK_PROMPT = {
  round: 'The Call',
  prompt: 'Which one sounds more human?',
};
