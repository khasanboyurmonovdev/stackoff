// One of the two big tappable clip cards. Tap to play/pause; shows a live
// equalizer + a color-coded glow while playing, a fill bar for progress, and a
// check once it has been heard (so the vote gate is legible).

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1.4" />
      <rect x="14" y="5" width="4" height="14" rx="1.4" />
    </svg>
  );
}

function fmt(ms) {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PlayCard({ side, accent, playing, progress, played, durationMs, onToggle }) {
  const elapsed = (progress || 0) * (durationMs || 0);
  const active = playing || played;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`${playing ? 'Pause' : 'Play'} clip ${side}`}
      aria-pressed={playing}
      className="press relative w-full overflow-hidden rounded-3xl border-2 bg-grape/55 p-4 text-left backdrop-blur"
      style={{
        borderColor: playing ? accent : 'rgba(255,255,255,0.10)',
        // A top-light sheen over the grape fill gives the card depth at rest;
        // the drop shadow lifts it off the canvas. Resting carries a faint glow
        // in its side accent; playing ramps that glow up to full.
        backgroundImage:
          'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 36%, rgba(0,0,0,0.08) 100%)',
        boxShadow: playing
          ? `0 0 36px -8px ${accent}, 0 22px 48px -30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.10)`
          : `inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 4px -2px rgba(0,0,0,0.4), 0 22px 48px -30px rgba(0,0,0,0.9), 0 0 26px -18px ${accent}`,
      }}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-void shadow-lg"
          style={{ background: accent }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </span>

        <span
          className="font-display text-5xl font-extrabold leading-none"
          style={{ color: active ? accent : 'var(--color-cream)' }}
        >
          {side}
        </span>

        <span className={`eq ml-1 ${playing ? 'is-playing' : ''}`} style={{ color: accent }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="eq-bar"
              style={{ animationDelay: `${i * 0.09}s`, height: `${[55, 80, 100, 70, 45][i]}%` }}
            />
          ))}
        </span>

        <span className="ml-auto shrink-0 font-body text-xs tabular-nums text-mist">
          {fmt(elapsed)} / {fmt(durationMs)}
        </span>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-[width] duration-100 ease-linear"
          style={{ width: `${(progress || 0) * 100}%`, background: accent }}
        />
      </div>

      {played && (
        <span
          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-void"
          style={{ background: accent }}
          aria-hidden
        >
          ✓
        </span>
      )}
    </button>
  );
}
