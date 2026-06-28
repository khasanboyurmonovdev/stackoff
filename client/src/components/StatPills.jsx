// The player's live streak + accuracy, shown in both the desktop nav and the
// mobile header so the game state is always visible. `active` rings it when the
// profile view is open (it doubles as the entry point to your stats).
export default function StatPills({ stats, active = false }) {
  const streak = stats?.currentStreak ?? 0;
  const accuracy = stats ? Math.round((stats.accuracy || 0) * 100) : 0;

  return (
    <div className={`flex items-center gap-2 rounded-full p-0.5 ${active ? 'ring-2 ring-cyan/60' : ''}`}>
      <span
        className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm"
        title="Current streak"
      >
        <span aria-hidden>🔥</span>
        <span className="font-bold tabular-nums">{streak}</span>
      </span>
      <span
        className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-sm"
        title="Your accuracy at spotting the human"
      >
        <span className="text-mist">acc</span>
        <span className="font-bold tabular-nums">{accuracy}%</span>
      </span>
    </div>
  );
}
