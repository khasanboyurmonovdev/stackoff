// Scripted CALLER moments, each engineered around ONE turn-taking failure mode.
// The caller track is identical across every stack, so the only variable a
// listener hears is how the responder handles the moment.
//
// The <<pause:ms>>, <<cut-in>>, and <<overlap>> markers drive timing the
// pipeline will bake in later.

export const SCENARIOS = [
  {
    id: 'interruption',
    name: 'The Interruption',
    tests: 'barge-in',
    callerScript:
      "Yeah so I want to update the card on file, it's the visa ending four-four— <<cut-in>> no wait, use the mastercard instead.",
    listenFor: 'When you cut in, does the responder stop and listen — or keep talking over you?',
  },
  {
    id: 'long-pause',
    name: 'The Long Pause',
    tests: 'endpointing',
    callerScript:
      'Let me find it, my order number is <<pause:3000>> okay it\'s A-as-in-apple, four, seven, two.',
    listenFor: 'During your silence, does it wait — or jump in too early and cut you off?',
  },
  {
    id: 'backchannel',
    name: 'The Backchannel',
    tests: 'overlap tolerance',
    callerScript:
      'So the way the refund works is— <<overlap>>mm-hm, yeah<<overlap>> —it goes back to the original payment method.',
    listenFor: "You murmur 'mm-hm' while it talks. Does it plow on naturally, or awkwardly stop as if interrupted?",
  },
  {
    id: 'self-correction',
    name: 'The Correction',
    tests: 'repair handling',
    callerScript:
      'Ship it to 12 Oak Street— actually no, 12 Oak Avenue, the one near the station.',
    listenFor: 'Does it catch your correction and use the right address, or lock onto the first thing you said?',
  },
  {
    id: 'rapid-fire',
    name: 'The Rapid-Fire',
    tests: 'latency + completeness',
    callerScript:
      'Quick one — are you open Sunday, and if so what hours, and do I need an appointment?',
    listenFor: 'Does it wait for the whole 3-part question, then answer fast — or cut in and miss part of it?',
  },
];

export const SCENARIO_BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
