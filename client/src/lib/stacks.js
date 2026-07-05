// Display reference for the reveal. The /api/vote reveal returns only each
// stack's name + stackId, so we keep the config/blurb here (mirror of the
// server's data/stacks.js) to show STT/LLM/TTS chips and the turn-taking note.
export const STACK_INFO = {
  velvet: {
    name: 'Velvet',
    stt: 'Deepgram Nova-2',
    llm: 'GPT-4o',
    tts: 'Cartesia Sonic-3',
    blurb: 'Premium and unhurried. Beautiful voice, waits its turn, yields the instant you cut in.',
  },
  sprint: {
    name: 'Sprint',
    stt: 'Deepgram Nova-2',
    llm: 'Llama-3.3-70B (Groq)',
    tts: 'Cartesia Sonic-3',
    blurb: 'Blazing fast with a great voice — but jumps in early and talks over you. The cautionary tale.',
  },
  studio: {
    name: 'Studio',
    stt: 'Deepgram Nova-2',
    llm: 'GPT-4o',
    tts: 'Cartesia Sonic',
    blurb: 'The balanced default. Quick enough to feel live, polite enough to let you finish.',
  },
  thrift: {
    name: 'Thrift',
    stt: 'Deepgram Nova-2',
    llm: 'Llama-3.1-8B (Groq)',
    tts: 'Deepgram Aura',
    blurb: 'Cheap with decent manners, but a flatter voice and a beat slow to stop when interrupted.',
  },
  cosmo: {
    name: 'Cosmo',
    stt: 'Deepgram Nova-2',
    llm: 'Gemini 2.0 Flash',
    tts: 'OpenAI TTS',
    blurb: 'Modern and snappy with clean barge-in. Slightly synthetic timbre under phone quality.',
  },
  sage: {
    name: 'Sage',
    stt: 'Deepgram Nova-2',
    llm: 'Llama-3.3-70B (Groq)',
    tts: 'Cartesia Sonic',
    blurb: 'Warm and very patient — never steps on you, but the long wait can read as a lag.',
  },
};

// Per-stack visual identity. Each of the six stacks owns an accent and a clean
// monogram mark so it reads as a distinct competitor (instead of a generic
// robot) wherever its identity is *known* — the reveal and the leaderboard. The
// blind play cards stay deliberately anonymous (A = magenta, B = cyan) so the
// game isn't given away. Accent is used sparingly: the mark and the STT/LLM/TTS
// chips pick it up; everything else stays on the cool neutral scale.
export const STACK_THEME = {
  velvet: { accent: '#e84a97', mark: 'V' }, // deep magenta
  studio: { accent: '#22d3d6', mark: 'S' }, // cyan
  cosmo: { accent: '#8b7cf6', mark: 'C' }, // violet
  sage: { accent: '#2dd4a8', mark: 'S' }, // teal-green
  sprint: { accent: '#f5a623', mark: 'S' }, // amber — the villain
  thrift: { accent: '#8a8d9c', mark: 'T' }, // muted grey
};

export function stackTheme(stackId) {
  return STACK_THEME[stackId] || { accent: 'var(--color-mist)', mark: '?' };
}
