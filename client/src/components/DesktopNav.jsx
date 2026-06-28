import StatPills from './StatPills';

// Persistent top nav for tablet/desktop (md+). Wordmark home, Play / Leaderboard
// links, and the streak/accuracy pills doubling as the link to your profile.
function NavLink({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`press rounded-full px-4 py-1.5 font-display text-sm font-bold tracking-wide transition-colors ${
        active ? 'bg-white/10 text-cream' : 'text-mist hover:text-cream'
      }`}
    >
      {children}
    </button>
  );
}

export default function DesktopNav({ view, stats, onNavigate }) {
  return (
    <header className="sticky top-0 z-30 hidden border-b border-white/5 bg-void-deep/70 backdrop-blur-md md:block">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-8 py-3.5">
        <button
          type="button"
          onClick={() => onNavigate('play')}
          className="press font-display text-2xl font-extrabold tracking-tight"
        >
          <span className="text-cream">stack</span>
          <span className="text-magenta">off</span>
        </button>

        <nav className="flex items-center gap-1">
          <NavLink active={view === 'play'} onClick={() => onNavigate('play')}>
            Play
          </NavLink>
          <NavLink active={view === 'leaderboard'} onClick={() => onNavigate('leaderboard')}>
            Leaderboard
          </NavLink>
        </nav>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="press"
          aria-label="Your stats and share card"
        >
          <StatPills stats={stats} active={view === 'profile'} />
        </button>
      </div>
    </header>
  );
}
