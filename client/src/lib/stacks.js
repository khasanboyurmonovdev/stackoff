// Display reference for the reveal. The /api/vote reveal returns only each
// stack's name + stackId, so we keep the config/blurb here (mirror of the
// server's data/stacks.js) to show STT/LLM/TTS chips and the turn-taking note.
export const STACK_INFO = {
  velvet: {
    name: 'Velvet',
    stt: 'Deepgram Nova-2',
    llm: 'GPT-4o',
    tts: 'ElevenLabs v3',
    blurb: 'Premium and unhurried. Beautiful voice, waits its turn, yields the instant you cut in.',
  },
  sprint: {
    name: 'Sprint',
    stt: 'Deepgram Nova-2',
    llm: 'Llama-3.3-70B (Groq)',
    tts: 'ElevenLabs Flash v2',
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
