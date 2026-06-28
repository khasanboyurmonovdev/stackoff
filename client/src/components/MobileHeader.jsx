import StatPills from './StatPills';

// The phone header: wordmark + the always-visible streak/accuracy pills (tap to
// open your profile). Hidden once the desktop top nav takes over at md.
export default function MobileHeader({ stats, onNavigate }) {
  return (
    <header className="mx-auto flex w-full max-w-[460px] items-center justify-between px-5 py-4 md:hidden">
      <button
        type="button"
        onClick={() => onNavigate('play')}
        className="press font-display text-2xl font-extrabold tracking-tight"
      >
        <span className="text-cream">stack</span>
        <span className="text-magenta">off</span>
      </button>
      <button
        type="button"
        onClick={() => onNavigate('profile')}
        className="press"
        aria-label="Your stats and share card"
      >
        <StatPills stats={stats} />
      </button>
    </header>
  );
}
