import { siteUrl } from '../lib/share';

// The viral artifact: a screenshot-worthy "golden ears" card the player wants to
// post. Bold neon identity, big numbers, a moving sheen as the signature. Built
// as a styled DOM card (no canvas dep) — share text + link does the spreading,
// the card does the bragging.
export default function ShareCard({ accuracy, bestStreak, votes }) {
  const host = siteUrl().replace(/^https?:\/\//, '');

  return (
    <div className="relative aspect-[5/6] w-full overflow-hidden rounded-[1.75rem] border border-white/15 bg-void-deep shadow-[0_30px_90px_-30px_rgba(0,0,0,0.9)] sm:aspect-[4/3] lg:aspect-[5/6]">
      {/* Neon atmosphere */}
      <div
        className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full opacity-50 blur-3xl"
        style={{ background: 'var(--color-magenta)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--color-cyan)' }}
        aria-hidden
      />
      <div className="sheen-layer" aria-hidden />

      <div className="relative flex h-full flex-col p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-extrabold tracking-tight">
            <span className="text-cream">stack</span>
            <span className="text-magenta">off</span>
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-cream">
            👂 Golden ears
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center py-4">
          <p className="font-body text-xs font-bold uppercase tracking-[0.24em] text-cyan">My accuracy</p>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[5.5rem] font-extrabold leading-[0.85] text-lime drop-shadow-[0_0_24px_rgba(198,255,74,0.35)] sm:text-[6.5rem]">
              {accuracy}
            </span>
            <span className="font-display text-4xl font-bold text-lime/80">%</span>
          </div>

          <div className="mt-5 flex gap-3">
            <div className="flex-1 rounded-2xl bg-white/8 px-4 py-3">
              <p className="font-display text-2xl font-extrabold text-amber">
                {bestStreak}
                <span className="ml-1">🔥</span>
              </p>
              <p className="font-body text-[11px] uppercase tracking-wide text-mist">Best streak</p>
            </div>
            <div className="flex-1 rounded-2xl bg-white/8 px-4 py-3">
              <p className="font-display text-2xl font-extrabold text-cream">{votes}</p>
              <p className="font-body text-[11px] uppercase tracking-wide text-mist">Calls judged</p>
            </div>
          </div>
        </div>

        <div>
          <p className="font-display text-2xl font-extrabold leading-tight text-cream">
            Can you beat me?
          </p>
          <p className="mt-1.5 font-body text-sm text-mist">
            {host} · spot the human in a voice-AI duel
          </p>
        </div>
      </div>
    </div>
  );
}
