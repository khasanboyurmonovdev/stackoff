import { STACK_INFO, stackTheme } from '../lib/stacks';
import { reduceMotion } from '../lib/motion';
import CountUp from './CountUp';
import StackMark from './StackMark';

const ACCENT = { A: 'var(--color-magenta)', B: 'var(--color-cyan)' };

function Confetti() {
  if (reduceMotion) return null;
  const colors = ['#c6ff4a', '#22e0d6', '#ff3d8b', '#ffc53d'];
  const pieces = Array.from({ length: 16 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden" aria-hidden>
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 6.5 + 4) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 5) * 0.06}s`,
          }}
        />
      ))}
    </div>
  );
}

function Chip({ label, value, accent }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
      style={{
        background: `color-mix(in srgb, ${accent} 9%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accent} 26%, transparent)`,
      }}
    >
      <span style={{ color: accent }} className="font-bold">{label}</span>
      <span className="font-medium text-cream">{value}</span>
    </span>
  );
}

// Shows what one side actually was: a real human, or a stack with its own
// identity (monogram mark + accent-tinted config chips), not a generic robot.
// The A/B side accent stays on the card border as the duel's punctuation.
function ResultCard({ side, clip, picked }) {
  const accent = ACCENT[side];
  const human = clip.sourceType === 'human';
  const info = human ? null : STACK_INFO[clip.stackId] || { name: clip.name };
  const stackAccent = human ? null : stackTheme(clip.stackId).accent;
  // The card glows in its own identity: a stack in its accent, the human in lime.
  const glow = human ? '#c6ff4a' : stackAccent;

  return (
    <div
      className="rise relative rounded-2xl border-2 bg-grape/50 p-3.5"
      style={{
        borderColor: picked ? accent : 'rgba(255,255,255,0.10)',
        backgroundImage: `linear-gradient(180deg, color-mix(in srgb, ${glow} 8%, rgba(255,255,255,0.05)) 0%, rgba(255,255,255,0.012) 38%, rgba(0,0,0,0.08) 100%)`,
        boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.09), 0 2px 4px -2px rgba(0,0,0,0.4), 0 22px 48px -30px rgba(0,0,0,0.9), 0 0 30px -18px ${glow}`,
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-display text-2xl font-extrabold leading-none" style={{ color: accent }}>
          {side}
        </span>
        {picked && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-void" style={{ background: accent }}>
            YOUR PICK
          </span>
        )}
      </div>

      {human ? (
        <div>
          <p className="font-display text-xl font-bold text-lime">🧑 Real human</p>
          <p className="mt-1 text-sm text-mist">An actual person on the call.</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2.5">
            <StackMark stackId={clip.stackId} size="sm" />
            <p className="font-display text-xl font-bold text-cream">{info.name}</p>
          </div>
          {info.stt && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip label="STT" value={info.stt} accent={stackAccent} />
              <Chip label="LLM" value={info.llm} accent={stackAccent} />
              <Chip label="TTS" value={info.tts} accent={stackAccent} />
            </div>
          )}
          {info.blurb && <p className="mt-2 text-sm leading-snug text-mist">{info.blurb}</p>}
        </div>
      )}
    </div>
  );
}

// The post-vote reveal. On phone it slides up as a full sheet; on desktop it
// becomes a centered modal card over a dimmed backdrop so it reads as a
// deliberate moment rather than a stretched panel.
export default function Reveal({ reveal, stats, onNext, onViewStats }) {
  const { kind, clipA, clipB, pickedSide } = reveal;
  const golden = kind === 'golden';

  let banner;
  if (golden) {
    banner = reveal.correct
      ? { emoji: '✅', title: 'You spotted the human!', sub: 'Sharp ears.', tone: 'var(--color-lime)' }
      : { emoji: '🤖', title: 'Fooled you!', sub: 'That one was the AI.', tone: 'var(--color-magenta)' };
  } else {
    const pickedClip = pickedSide === 'A' ? clipA : clipB;
    const pickedName = STACK_INFO[pickedClip.stackId]?.name || pickedClip.name || 'your pick';
    banner = {
      emoji: '⚔️',
      title: `You picked ${pickedName}`,
      sub: "You're shaping the leaderboard.",
      tone: 'var(--color-cyan)',
    };
  }

  // Full opaque screen (nothing renders behind it — the play view is unmounted).
  // On phone it's a flex column that exactly fills the visible viewport: header and
  // the Next button stay pinned, only the inner card region scrolls if a persona
  // blurb runs long — so the whole reveal fits without page-scrolling.
  //
  // Height comes from the outer fixed `inset-0` (the true visible viewport) via
  // `h-full` — NOT `h-[100dvh]`, which overrides `bottom:0` and overflows past the
  // fold on a real phone. The bottom padding reserves the fixed tab bar's zone
  // (same `safe-area + 5.5rem` constant AppShell uses) so Next sits above the tab
  // bar, never behind it; dropped at md+ where the tab bar is hidden.
  return (
    <div className="fixed inset-0 z-40 bg-void-deep lg:flex lg:items-center lg:justify-center lg:overflow-y-auto lg:p-6">
      <div className="sheet mx-auto flex h-full w-full max-w-[440px] flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pt-[max(1rem,env(safe-area-inset-top))] md:pb-7 lg:h-auto lg:max-h-[92vh] lg:overflow-y-auto lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-void/80 lg:px-7 lg:pb-7 lg:pt-7 lg:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative shrink-0 pt-2 text-center">
          {golden && reveal.correct && <Confetti />}
          <div className="pop text-5xl lg:text-6xl" aria-hidden>
            {banner.emoji}
          </div>
          <h2 className="pop mt-2 font-display text-2xl font-extrabold leading-tight lg:text-3xl" style={{ color: banner.tone }}>
            {banner.title}
          </h2>
          <p className="mt-1 text-sm text-mist lg:text-base">{banner.sub}</p>
        </div>

        {golden && (
          <div className="mt-3 grid shrink-0 grid-cols-2 gap-3 lg:mt-5">
            <div className="lux-accent rounded-2xl bg-white/8 p-2.5 text-center lg:p-3" style={{ '--card-accent': '#ffc53d' }}>
              <div className="font-display text-3xl font-extrabold text-amber">
                <CountUp value={reveal.currentStreak ?? stats?.currentStreak ?? 0} />
                <span className="ml-1 text-2xl">🔥</span>
              </div>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-mist">streak</p>
            </div>
            <div className="lux-accent rounded-2xl bg-white/8 p-2.5 text-center lg:p-3" style={{ '--card-accent': '#c6ff4a' }}>
              <div className="font-display text-3xl font-extrabold text-lime">
                <CountUp value={Math.round((reveal.accuracy ?? stats?.accuracy ?? 0) * 100)} suffix="%" />
              </div>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-mist">accuracy</p>
            </div>
          </div>
        )}

        <div className="mt-4 flex min-h-0 flex-1 flex-col lg:mt-6 lg:flex-none">
          <p className="shrink-0 text-center font-body text-xs font-bold uppercase tracking-[0.2em] text-mist">The reveal</p>
          <div className="mt-2 flex-1 space-y-2.5 overflow-y-auto lg:flex-none lg:overflow-visible">
            <ResultCard side="A" clip={clipA} picked={pickedSide === 'A'} />
            <ResultCard side="B" clip={clipB} picked={pickedSide === 'B'} />
          </div>
        </div>

        <div className="shrink-0 pt-4 lg:pt-7">
          <button
            type="button"
            onClick={onNext}
            className="press w-full rounded-2xl bg-cream py-4 font-display text-xl font-extrabold text-void shadow-lg"
          >
            Next →
          </button>
          {golden && onViewStats && (
            <button
              type="button"
              onClick={onViewStats}
              className="press mt-2.5 w-full rounded-2xl py-2 font-display text-sm font-bold text-mist transition-colors hover:text-cream"
            >
              See your stats & share →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
