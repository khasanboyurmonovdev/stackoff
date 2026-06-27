// Deployable voice-AI stacks being ranked. Each stack = STT + LLM + TTS + a
// turn-taking profile. The turn-taking fields are the whole point of the
// ranking: a stack with a beautiful voice that interrupts should be able to lose.
//
// turnTaking fields:
//   endpointingMs = silence the stack waits before assuming you're done speaking
//                   (low = interrupts you, high = patient but can feel laggy).
//   bargeIn       = what it does when you talk over it:
//                     "graceful" stops immediately,
//                     "stubborn" keeps going,
//                     "laggy"    stops slowly.
//   avgResponseMs = latency from the end of your turn to the start of its reply.
//
// voice = the Piper model used to render this stack's clips. With 6 stacks and 4
//   voices, two stacks can share one; the arena never pairs same-voice stacks so
//   timbre can't leak which is which. Mirror of pipeline/config.py STACK_VOICE.

export const STACKS = [
  {
    id: 'velvet',
    name: 'Velvet',
    stt: 'Deepgram Nova-2',
    llm: 'GPT-4o',
    tts: 'ElevenLabs v3',
    turnTaking: { endpointingMs: 900, bargeIn: 'graceful', avgResponseMs: 1100 },
    voice: 'en_US-amy-medium',
    priceTier: '$$$',
    blurb: 'Premium and unhurried. Beautiful voice, waits its turn, yields the instant you cut in.',
  },
  {
    id: 'sprint',
    name: 'Sprint',
    stt: 'Deepgram Nova-2',
    llm: 'Llama-3.3-70B (Groq)',
    tts: 'ElevenLabs Flash v2',
    turnTaking: { endpointingMs: 250, bargeIn: 'stubborn', avgResponseMs: 350 },
    voice: 'en_US-ryan-medium',
    priceTier: '$$',
    blurb: 'Blazing fast with a great voice — but jumps in early and talks over you. The cautionary tale.',
  },
  {
    id: 'studio',
    name: 'Studio',
    stt: 'Deepgram Nova-2',
    llm: 'GPT-4o',
    tts: 'Cartesia Sonic',
    turnTaking: { endpointingMs: 600, bargeIn: 'graceful', avgResponseMs: 700 },
    voice: 'en_US-lessac-medium',
    priceTier: '$$$',
    blurb: 'The balanced default. Quick enough to feel live, polite enough to let you finish.',
  },
  {
    id: 'thrift',
    name: 'Thrift',
    stt: 'Deepgram Nova-2',
    llm: 'Llama-3.1-8B (Groq)',
    tts: 'Deepgram Aura',
    turnTaking: { endpointingMs: 550, bargeIn: 'laggy', avgResponseMs: 500 },
    voice: 'en_US-kusal-medium',
    priceTier: '$',
    blurb: 'Cheap with decent manners, but a flatter voice and a beat slow to stop when interrupted.',
  },
  {
    id: 'cosmo',
    name: 'Cosmo',
    stt: 'Deepgram Nova-2',
    llm: 'Gemini 2.0 Flash',
    tts: 'OpenAI TTS',
    turnTaking: { endpointingMs: 400, bargeIn: 'graceful', avgResponseMs: 450 },
    voice: 'en_US-amy-medium',
    priceTier: '$$',
    blurb: 'Modern and snappy with clean barge-in. Slightly synthetic timbre under phone quality.',
  },
  {
    id: 'sage',
    name: 'Sage',
    stt: 'Deepgram Nova-2',
    llm: 'Llama-3.3-70B (Groq)',
    tts: 'Cartesia Sonic',
    turnTaking: { endpointingMs: 1100, bargeIn: 'graceful', avgResponseMs: 1300 },
    voice: 'en_US-ryan-medium',
    priceTier: '$$',
    blurb: 'Warm and very patient — never steps on you, but the long wait can read as a lag.',
  },
];

export const STACK_BY_ID = Object.fromEntries(STACKS.map((s) => [s.id, s]));
