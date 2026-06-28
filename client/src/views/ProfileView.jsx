import { useEffect, useState } from 'react';
import CountUp from '../components/CountUp';
import ShareCard from '../components/ShareCard';
import { copyChallengeLink, shareOrCopy } from '../lib/share';

function StatTile({ value, label, accent, suffix = '', fire = false }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-grape/40 p-4 text-center sm:p-5">
      <div className="font-display text-4xl font-extrabold leading-none sm:text-5xl" style={{ color: accent }}>
        <CountUp value={value} suffix={suffix} />
        {fire && <span className="ml-1 text-3xl sm:text-4xl">🔥</span>}
      </div>
      <p className="mt-2 font-body text-xs font-bold uppercase tracking-[0.15em] text-mist">{label}</p>
    </div>
  );
}

// Native share where it exists (phones), copy-to-clipboard everywhere else. A
// short-lived toast confirms what happened.
function ShareActions({ stats }) {
  const [toast, setToast] = useState(null);

  async function flash(result) {
    if (result === 'cancelled') return;
    const msg =
      result === 'shared'
        ? 'Shared — challenge sent 🎯'
        : result === 'copied'
          ? 'Challenge link copied 📋'
          : "Couldn't copy — try again";
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={async () => flash(await shareOrCopy(stats))}
          className="press rounded-2xl bg-gradient-to-r from-magenta to-cyan py-4 font-display text-lg font-extrabold text-void shadow-[0_14px_40px_-12px_rgba(255,61,139,0.6)]"
        >
          Share my score
        </button>
        <button
          type="button"
          onClick={async () => flash(await copyChallengeLink(stats))}
          className="press rounded-2xl border border-white/15 bg-white/5 py-4 font-display text-lg font-extrabold text-cream hover:bg-white/10"
        >
          Copy challenge link
        </button>
      </div>
      <p className="mt-3 text-center font-body text-sm text-mist">
        Your link drops a friend straight into the game.
      </p>
      {toast && (
        <div
          className="pop pointer-events-none absolute inset-x-0 -top-12 mx-auto w-max rounded-full bg-cream px-4 py-2 font-body text-sm font-bold text-void shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

function EmptyState({ onNavigate }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl" aria-hidden>
        👂
      </div>
      <h2 className="mt-3 font-display text-2xl font-extrabold text-cream">No golden ears yet</h2>
      <p className="mt-1.5 max-w-sm text-mist">
        Judge a few calls and we'll track your accuracy, streak, and a share card worth bragging about.
      </p>
      <button
        type="button"
        onClick={() => onNavigate('play')}
        className="press mt-6 rounded-2xl bg-cream px-7 py-3.5 font-display text-lg font-extrabold text-void"
      >
        Start judging →
      </button>
    </div>
  );
}

export default function ProfileView({ stats, onNavigate }) {
  // Snapshot the URL into the doc title briefly is unnecessary; just present.
  useEffect(() => {
    document.title = 'Stackoff — your golden ears';
    return () => {
      document.title = 'Stackoff — spot the human';
    };
  }, []);

  const votes = stats?.votes ?? 0;
  const accuracy = Math.round((stats?.accuracy ?? 0) * 100);
  const currentStreak = stats?.currentStreak ?? 0;
  const bestStreak = stats?.bestStreak ?? 0;

  if (votes === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="pt-2">
          <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-cyan">Your profile</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-cream lg:text-5xl">
            Golden ears
          </h1>
        </header>
        <EmptyState onNavigate={onNavigate} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="pt-2">
        <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-cyan">Your profile</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-cream lg:text-5xl">
          Golden ears
        </h1>
        <p className="mt-3 max-w-2xl font-body text-mist lg:text-lg">
          How sharp are you at spotting the human? Track your run, then challenge a friend to beat it.
        </p>
      </header>

      <div className="mt-7 lg:grid lg:grid-cols-[1.1fr_minmax(0,420px)] lg:items-start lg:gap-12">
        {/* Stats */}
        <div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatTile value={votes} label="Calls judged" accent="var(--color-cream)" />
            <StatTile value={accuracy} suffix="%" label="Golden-ears accuracy" accent="var(--color-lime)" />
            <StatTile value={currentStreak} label="Current streak" accent="var(--color-amber)" fire />
            <StatTile value={bestStreak} label="Best streak" accent="var(--color-cyan)" />
          </div>

          <div className="mt-8 hidden lg:block">
            <ShareActions stats={{ accuracy, bestStreak }} />
          </div>
        </div>

        {/* Share card */}
        <div className="mt-8 lg:mt-0">
          <p className="mb-3 font-body text-xs font-bold uppercase tracking-[0.2em] text-mist">Your share card</p>
          <ShareCard accuracy={accuracy} bestStreak={bestStreak} votes={votes} />
          <div className="mt-5 lg:hidden">
            <ShareActions stats={{ accuracy, bestStreak }} />
          </div>
        </div>
      </div>
    </div>
  );
}
