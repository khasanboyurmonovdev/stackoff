import DesktopNav from './DesktopNav';
import MobileHeader from './MobileHeader';
import BottomTabs from './BottomTabs';

// The chrome around every view. Phone: wordmark header on top, thumb tab bar on
// the bottom. Tablet/desktop: a sticky top nav and no tab bar. The main column
// is width-capped and centered at every size so content never stretches across a
// big monitor — narrow and tight on a phone, a roomy 6xl canvas on desktop.
export default function AppShell({ view, stats, onNavigate, children }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <DesktopNav view={view} stats={stats} onNavigate={onNavigate} />
      <MobileHeader stats={stats} onNavigate={onNavigate} />

      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:max-w-3xl md:px-6 md:pb-12 lg:max-w-6xl lg:px-8">
        {children}
      </main>

      <footer className="hidden md:block border-t border-white/[0.06] mt-16">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-display text-lg font-bold text-cream">
                stack<span className="text-cyan">off</span>
              </p>
              <p className="mt-1 font-body text-xs leading-relaxed text-mist/40 max-w-xs">
                The open blind test for voice-AI stacks. Not just which voice sounds best — which stack holds a conversation.
              </p>
            </div>
            <div className="flex gap-8">
              <div className="flex flex-col gap-2">
                <p className="font-body text-[10px] font-bold uppercase tracking-widest text-mist/30">Product</p>
                <a href="#/" className="font-body text-xs text-mist/50 transition-colors hover:text-cream/70">Play</a>
                <a href="#/leaderboard" className="font-body text-xs text-mist/50 transition-colors hover:text-cream/70">Leaderboard</a>
              </div>
              <div className="flex flex-col gap-2">
                <p className="font-body text-[10px] font-bold uppercase tracking-widest text-mist/30">Open source</p>
                <a
                  href="https://github.com/khasanboyurmonovdev/stackoff"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-xs text-mist/50 transition-colors hover:text-cream/70"
                >
                  GitHub
                </a>
                <a
                  href="https://vocalrank.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-body text-xs text-mist/50 transition-colors hover:text-cream/70"
                >
                  vocalrank.xyz
                </a>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-white/[0.04] pt-4">
            <p className="font-body text-[10px] text-mist/25">
              Blind-testing voice AI stacks — ranked by real conversation, not scripted reads.
            </p>
          </div>
        </div>
      </footer>

      <BottomTabs view={view} onNavigate={onNavigate} />
    </div>
  );
}
