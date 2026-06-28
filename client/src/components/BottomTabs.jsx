// One-thumb bottom navigation for phones (hidden at md+, where the top nav takes
// over). Three thumb-sized targets: Play, Board, You. Sits above the safe-area
// inset; the shell reserves matching bottom padding so nothing hides behind it.

function PlayGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function BoardGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="3" y="11" width="5" height="9" rx="1.4" />
      <rect x="9.5" y="5" width="5" height="15" rx="1.4" />
      <rect x="16" y="14" width="5" height="6" rx="1.4" />
    </svg>
  );
}

function YouGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

function Tab({ active, onClick, icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className="press relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5"
    >
      {active && (
        <span className="absolute top-0 h-0.5 w-8 rounded-full bg-cyan shadow-[0_0_12px_var(--color-cyan)]" />
      )}
      <span className={`transition-colors ${active ? 'text-cyan' : 'text-mist'}`}>{icon}</span>
      <span
        className={`text-[11px] font-bold tracking-wide transition-colors ${
          active ? 'text-cream' : 'text-mist'
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomTabs({ view, onNavigate }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-void-deep/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
      <div className="mx-auto flex w-full max-w-[460px]">
        <Tab active={view === 'play'} onClick={() => onNavigate('play')} icon={<PlayGlyph />} label="Play" />
        <Tab
          active={view === 'leaderboard'}
          onClick={() => onNavigate('leaderboard')}
          icon={<BoardGlyph />}
          label="Board"
        />
        <Tab active={view === 'profile'} onClick={() => onNavigate('profile')} icon={<YouGlyph />} label="You" />
      </div>
    </nav>
  );
}
