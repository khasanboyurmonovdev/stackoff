import { stackTheme } from '../lib/stacks';

// A stack's identity mark: its monogram on a tinted glass tile in the stack's
// own accent. Replaces the generic 🤖 wherever a stack's identity is revealed.
// `size` keys a few presets so it sits right in the reveal, leaderboard rows,
// and the podium without per-call tuning.
const SIZES = {
  sm: { box: 'h-9 w-9 rounded-xl', text: 'text-base' },
  md: { box: 'h-11 w-11 rounded-2xl', text: 'text-xl' },
  lg: { box: 'h-14 w-14 rounded-2xl', text: 'text-2xl' },
};

export default function StackMark({ stackId, size = 'md', className = '' }) {
  const { accent, mark } = stackTheme(stackId);
  const s = SIZES[size] || SIZES.md;
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-display font-extrabold leading-none ${s.box} ${s.text} ${className}`}
      style={{
        color: accent,
        // A diagonal gradient in the accent (brighter top-left → deeper
        // bottom-right) instead of a flat tint, a ~1px ring a touch lighter than
        // the fill, and a soft glow in the mark's own color, so it reads as a
        // designed brand mark with depth rather than a solid placeholder square.
        background: `linear-gradient(150deg, color-mix(in srgb, ${accent} 38%, transparent) 0%, color-mix(in srgb, ${accent} 15%, transparent) 100%)`,
        border: `1px solid color-mix(in srgb, ${accent} 52%, transparent)`,
        boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.22), 0 4px 14px -5px color-mix(in srgb, ${accent} 60%, transparent)`,
      }}
      aria-hidden
    >
      {mark}
    </span>
  );
}
