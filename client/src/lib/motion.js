// Single source of truth for the user's reduced-motion preference. Read once at
// module load — our animations are decorative, so a static read is enough and
// avoids wiring a matchMedia listener through every component.
export const reduceMotion =
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
