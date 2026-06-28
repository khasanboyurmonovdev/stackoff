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

      <BottomTabs view={view} onNavigate={onNavigate} />
    </div>
  );
}
