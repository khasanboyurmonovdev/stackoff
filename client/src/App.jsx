import { useCallback, useEffect, useState } from 'react';
import AppShell from './components/AppShell';
import PlayView from './views/PlayView';
import LeaderboardView from './views/LeaderboardView';
import ProfileView from './views/ProfileView';
import { fetchVoter, getVoterId } from './lib/api';

const VOTER_ID = getVoterId();
const VIEWS = ['play', 'leaderboard', 'profile'];

// Tiny hash router: keeps Play / Leaderboard / Profile in the URL so the back
// button works and links are shareable, with zero routing dependencies. A bare
// or unknown hash lands on Play — which is exactly where a challenged friend
// should start.
function hashToView(hash) {
  const v = (hash || '').replace(/^#\/?/, '');
  return VIEWS.includes(v) ? v : 'play';
}

export default function App() {
  const [view, setView] = useState(() => hashToView(window.location.hash));
  // Voter stats live here so the nav, play loop, and profile all share one copy.
  const [stats, setStats] = useState(null);

  const refreshStats = useCallback(() => {
    fetchVoter(VOTER_ID).then((s) => s && setStats(s));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const onHash = () => setView(hashToView(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((next) => {
    window.location.hash = next === 'play' ? '/' : `/${next}`;
    setView(next);
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <AppShell view={view} stats={stats} onNavigate={navigate}>
      {/* Keyed so each view remounts and plays its entrance transition. */}
      <div key={view} className="view-in flex flex-1 flex-col">
        {view === 'play' && (
          <PlayView voterId={VOTER_ID} stats={stats} setStats={setStats} onNavigate={navigate} />
        )}
        {view === 'leaderboard' && <LeaderboardView />}
        {view === 'profile' && <ProfileView stats={stats} onNavigate={navigate} />}
      </div>
    </AppShell>
  );
}
