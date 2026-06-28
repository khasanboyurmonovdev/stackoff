import { STACK_INFO } from '../lib/stacks';
import { reduceMotion } from '../lib/motion';
import CountUp from './CountUp';

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

function Chip({ label, value }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-white/8 px-2 py-1 text-xs">
      <span className="text-mist">{label}</span>
      <span className="font-medium text-cream">{value}</span>
    </span>
  );
}

// Shows what one side actually was: a real human, or a stack with its config.
function ResultCard({ side, clip, picked }) {
  const accent = ACCENT[side];
  const human = clip.sourceType === 'human';
  const info = human ? null : STACK_INFO[clip.stackId] || { name: clip.name };

  return (
    <div
      className="rise relative rounded-2xl border-2 bg-grape/50 p-4"
      style={{ borderColor: picked ? accent : 'rgba(255,255,255,0.10)' }}
    >
      <div className="mb-2 flex items-center gap-2">
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
          <p className="font-display text-xl font-bold text-cream">🤖 {info.name}</p>
          {info.stt && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Chip label="STT" value={info.stt} />
              <Chip label="LLM" value={info.llm} />
              <Chip label="TTS" value={info.tts} />
            </div>
          )}
          {info.blurb && <p className="mt-2.5 text-sm leading-snug text-mist">{info.blurb}</p>}
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

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-void-deep/95 backdrop-blur-md lg:flex lg:items-center lg:justify-center lg:p-6">
      <div className="sheet mx-auto flex min-h-[100dvh] w-full max-w-[440px] flex-col px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] lg:min-h-0 lg:max-h-[92vh] lg:overflow-y-auto lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-void/80 lg:pb-7 lg:pt-7 lg:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        <div className="relative pt-6 text-center lg:pt-2">
          {golden && reveal.correct && <Confetti />}
          <div className="pop text-6xl" aria-hidden>
            {banner.emoji}
          </div>
          <h2 className="pop mt-3 font-display text-3xl font-extrabold leading-tight" style={{ color: banner.tone }}>
            {banner.title}
          </h2>
          <p className="mt-1 text-mist">{banner.sub}</p>
        </div>

        {golden && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/8 p-3 text-center">
              <div className="font-display text-3xl font-extrabold text-amber">
                <CountUp value={reveal.currentStreak ?? stats?.currentStreak ?? 0} />
                <span className="ml-1 text-2xl">🔥</span>
              </div>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-mist">streak</p>
            </div>
            <div className="rounded-2xl bg-white/8 p-3 text-center">
              <div className="font-display text-3xl font-extrabold text-lime">
                <CountUp value={Math.round((reveal.accuracy ?? stats?.accuracy ?? 0) * 100)} suffix="%" />
              </div>
              <p className="mt-0.5 text-xs uppercase tracking-wide text-mist">accuracy</p>
            </div>
          </div>
        )}

        <p className="mt-6 text-center font-body text-xs font-bold uppercase tracking-[0.2em] text-mist">The reveal</p>
        <div className="mt-2 space-y-3">
          <ResultCard side="A" clip={clipA} picked={pickedSide === 'A'} />
          <ResultCard side="B" clip={clipB} picked={pickedSide === 'B'} />
        </div>

        <div className="mt-auto pt-6 lg:mt-7">
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
              className="press mt-3 w-full rounded-2xl py-2.5 font-display text-sm font-bold text-mist transition-colors hover:text-cream"
            >
              See your stats & share →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
