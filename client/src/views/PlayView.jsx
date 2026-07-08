import { useCallback, useEffect, useState } from 'react';
import PlayCard from '../components/PlayCard';
import Reveal from '../components/Reveal';
import useAudio from '../lib/useAudio';
import { clipPath, fetchBattle, postVote, fetchDaily, submitDailyVote } from '../lib/api';
import { getVoteToken } from '../lib/turnstile';
import { FALLBACK_PROMPT, SCENARIO_PROMPTS } from '../lib/scenarios';

const ACCENT_A = '#ff3d8b';
const ACCENT_B = '#22e0d6';

// --- The vote machine pieces (unchanged from the original one-thumb flow) -----

function Skeleton() {
  return (
    <div className="animate-pulse pt-2">
      <div className="h-3 w-24 rounded bg-white/10" />
      <div className="mt-3 h-7 w-4/5 rounded bg-white/10" />
      <div className="mt-6 space-y-3">
        <div className="h-24 rounded-3xl bg-white/5" />
        <div className="mx-auto h-4 w-10 rounded bg-white/10" />
        <div className="h-24 rounded-3xl bg-white/5" />
      </div>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <div className="h-[72px] rounded-2xl bg-white/5" />
        <div className="h-[72px] rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

function Centered({ emoji, title, sub, action }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl" aria-hidden>
        {emoji}
      </div>
      <h2 className="mt-3 font-display text-2xl font-extrabold text-cream">{title}</h2>
      <p className="mt-1.5 max-w-[18rem] text-mist">{sub}</p>
      {action}
    </div>
  );
}

function ScenarioPrompt({ scenarioId }) {
  const s = SCENARIO_PROMPTS[scenarioId] || FALLBACK_PROMPT;
  return (
    <div className="rise pt-1">
      <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-cyan">Round · {s.round}</p>
      <h1
        className="mt-2 font-display text-[1.8rem] font-extrabold leading-[1.08] text-cream"
        style={{ letterSpacing: '-0.02em' }}
      >
        {s.prompt}
      </h1>
    </div>
  );
}

function VoteButton({ side, accent, armed, loading, onClick }) {
  // LOCKED (clips not both played): muted, flat, obviously inactive — barely-there
  // fill, dim text, no shadow. UNLOCKED (armed): the full-saturation accent pops
  // with a colored glow. The gap between the two states should read at a glance.
  const armedStyle = {
    background: accent,
    color: '#0b0b12',
    boxShadow: `0 12px 28px -10px ${accent}, inset 0 1px 0 rgba(255,255,255,0.35)`,
    border: '1px solid transparent',
  };
  const lockedStyle = {
    background: 'rgba(255,255,255,0.035)',
    color: 'rgba(148,153,168,0.45)', // dimmed cool-neutral mist
    boxShadow: 'none',
    border: '1px solid rgba(255,255,255,0.06)',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={`Vote: ${side} is more human`}
      aria-disabled={!armed}
      className="press flex min-h-[72px] flex-col items-center justify-center rounded-2xl font-display transition-all duration-300 ease-out"
      style={armed ? armedStyle : lockedStyle}
    >
      {loading ? (
        <span
          className="h-6 w-6 animate-spin rounded-full border-[3px] border-void/30 border-t-void"
          aria-hidden
        />
      ) : (
        <>
          <span className="text-3xl font-extrabold leading-none">{side}</span>
          <span className="mt-0.5 text-sm font-bold tracking-wide">is more human</span>
        </>
      )}
    </button>
  );
}

// Endless / Daily mode switch, pinned above the battle panel regardless of
// status (loading/empty/error/ready) so a stuck mode is always escapable.
function ModeToggle({ mode, onModeChange, dailyLabel }) {
  return (
    <div className="mb-4 flex justify-center gap-2">
      <button
        type="button"
        onClick={() => onModeChange('endless')}
        className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
          mode === 'endless' ? 'bg-white/10 text-cream' : 'text-mist/50 hover:text-mist'
        }`}
      >
        Endless
      </button>
      <button
        type="button"
        onClick={() => onModeChange('daily')}
        className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
          mode === 'daily' ? 'bg-cyan/15 text-cyan' : 'text-mist/50 hover:text-mist'
        }`}
      >
        Daily · {dailyLabel}
      </button>
    </div>
  );
}

// Map one signed daily battle (server shape: { token, scenarioId, clipA: {id,
// audioUrl, durationMs}, clipB: {...} }) into the same battle shape the
// endless flow produces, so the rest of the machine (playback, vote gating,
// reveal) never has to know which mode it's in.
function dailyBattleToBattle(b) {
  return {
    scenarioId: b.scenarioId,
    token: b.token,
    clipA: { clipId: b.clipA.id, audioUrl: b.clipA.audioUrl, durationMs: b.clipA.durationMs },
    clipB: { clipId: b.clipB.id, audioUrl: b.clipB.audioUrl, durationMs: b.clipB.durationMs },
  };
}

// --- Desktop-only hero copy that frames the game beside the featured panel -----

function HeroCopy() {
  const steps = [
    { n: '01', text: 'Hear two callers handle the same moment', color: 'var(--color-magenta)' },
    { n: '02', text: 'Call which one sounds human', color: 'var(--color-cyan)' },
    { n: '03', text: 'Your vote ranks the whole stack', color: 'var(--color-lime)' },
  ];
  return (
    <div className="hidden lg:flex lg:flex-col lg:pr-4">
      <p className="font-body text-[11px] font-bold uppercase tracking-[0.32em] text-mist">
        The voice-AI turing arena
      </p>
      {/* Sized with clamp() rather than a fixed rem so each line fits the hero
          column at every desktop width (it narrows to ~384px at the lg break):
          the two explicit lines stay "Which voice AI" / "sounds human?" without
          re-wrapping or stranding "AI" on its own. */}
      <h1
        className="mt-5 font-display text-[clamp(3.1rem,5vw,4.5rem)] font-extrabold leading-[0.95] text-cream"
        style={{ letterSpacing: '-0.035em' }}
      >
        Which voice AI
        <br />
        sounds{' '}
        <span className="text-lime">human?</span>
      </h1>
      <p className="mt-6 max-w-md text-[17px] leading-relaxed text-mist">
        Judge the whole stack — voice, brains, and how it handles a real conversation. Play a clip from each
        caller, then trust your ears.
      </p>

      <ol className="mt-10 space-y-5">
        {steps.map((s) => (
          <li key={s.text} className="flex items-center gap-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-xs font-extrabold tabular-nums glass"
              style={{ color: s.color }}
              aria-hidden
            >
              {s.n}
            </span>
            <span className="font-body text-base text-cream/85">{s.text}</span>
          </li>
        ))}
      </ol>

      {/* Real credibility line — grounds the column so it doesn't float, and
          states the setup honestly (no invented vote counts). */}
      <p className="mt-12 font-body text-sm text-mist">
        <span className="font-bold text-cream/80">6 full stacks</span>
        <span className="mx-2 text-mist/50">·</span>
        <span className="font-bold text-cream/80">1 human baseline</span>
        <span className="mx-2 text-mist/50">·</span>
        <span className="font-bold text-cream/80">live Elo ranking</span>
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------

export default function PlayView({ voterId, stats, setStats, onNavigate }) {
  const [status, setStatus] = useState('loading'); // loading | ready | reveal | empty | error | daily-complete
  const [battle, setBattle] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [submitting, setSubmitting] = useState(null); // 'A' | 'B' | null
  const [nudge, setNudge] = useState(false);
  const [mode, setMode] = useState('endless'); // 'endless' | 'daily'
  const [daily, setDaily] = useState(null); // full GET /api/daily response
  const [dailyBattleIndex, setDailyBattleIndex] = useState(0);

  const A = useAudio(battle ? clipPath(battle.clipA.audioUrl) : null);
  const B = useAudio(battle ? clipPath(battle.clipB.audioUrl) : null);

  const loadBattle = useCallback(async () => {
    setStatus('loading');
    setReveal(null);
    setNudge(false);
    setSubmitting(null);
    try {
      const b = await fetchBattle();
      if (b.empty) {
        setStatus('empty');
        return;
      }
      setBattle(b);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  // Move the daily flow to battle index `idx`: either the next unvoted battle,
  // or the completion screen once idx runs off the end. Shared by the initial
  // daily fetch and by "Next" so there's one place that owns this transition.
  const enterDaily = useCallback((d, idx) => {
    setReveal(null);
    setNudge(false);
    setSubmitting(null);
    setDailyBattleIndex(idx);
    if (!d || idx >= d.battles.length) {
      setBattle(null);
      setStatus('daily-complete');
      return;
    }
    setBattle(dailyBattleToBattle(d.battles[idx]));
    setStatus('ready');
  }, []);

  const loadDailyChallenge = useCallback(async () => {
    setStatus('loading');
    try {
      const d = await fetchDaily(voterId);
      setDaily(d);
      const firstUnvoted = d.battles.findIndex((b) => !b.voted);
      enterDaily(d, firstUnvoted >= 0 ? firstUnvoted : d.battles.length);
    } catch {
      setStatus('error');
    }
  }, [voterId, enterDaily]);

  useEffect(() => {
    if (mode === 'daily') loadDailyChallenge();
    else loadBattle();
  }, [mode, loadBattle, loadDailyChallenge]);

  // "Next" means different things per mode: a fresh random battle in endless,
  // or advancing to the next daily battle (or the completion screen) in daily.
  const handleNext = useCallback(() => {
    if (mode === 'daily') {
      enterDaily(daily, dailyBattleIndex + 1);
    } else {
      loadBattle();
    }
  }, [mode, daily, dailyBattleIndex, enterDaily, loadBattle]);

  // Mode-aware retry for the empty/error screens — resumes whichever mode the
  // player was in rather than always snapping back to endless.
  const retry = mode === 'daily' ? loadDailyChallenge : loadBattle;

  const playA = () => {
    B.stop();
    A.toggle();
  };
  const playB = () => {
    A.stop();
    B.toggle();
  };

  const canVote = A.played && B.played;

  async function vote(side) {
    if (submitting) return;
    if (!canVote) {
      setNudge(true);
      setTimeout(() => setNudge(false), 600);
      return;
    }
    const winnerClipId = side === 'A' ? battle.clipA.clipId : battle.clipB.clipId;
    A.stop();
    B.stop();
    setSubmitting(side);
    try {
      let rev;
      if (mode === 'daily') {
        // Daily votes go through the dedicated endpoint (no Turnstile — the
        // daily set is fixed and small, so it isn't gated like endless voting)
        // and still update Elo/voter stats identically server-side.
        rev = await submitDailyVote({ token: battle.token, winnerClipId, voterId, battleIndex: dailyBattleIndex });
        setDaily((d) => {
          if (!d) return d;
          const battles = d.battles.map((b, i) => (i === dailyBattleIndex ? { ...b, voted: true } : b));
          return { ...d, battles, progress: rev.dailyProgress };
        });
      } else {
        // Mint a fresh, single-use Turnstile token for this vote (undefined when
        // Turnstile is disabled). A mint failure throws into the catch below, which
        // surfaces the soft-retry error screen instead of a silently dead button.
        const turnstileToken = await getVoteToken();
        rev = await postVote({ token: battle.token, winnerClipId, voterId, turnstileToken });
      }
      setReveal({ ...rev, pickedSide: side });
      setStats((s) => {
        const base = s || { votes: 0, accuracy: 0, currentStreak: 0, bestStreak: 0 };
        if (rev.kind === 'golden') {
          return {
            ...base,
            votes: base.votes + 1,
            accuracy: rev.accuracy,
            currentStreak: rev.currentStreak,
            bestStreak: rev.bestStreak,
          };
        }
        return { ...base, votes: base.votes + 1 };
      });
      setStatus('reveal');
    } catch (e) {
      if (e.code === 'DUPLICATE') {
        if (mode === 'daily') loadDailyChallenge();
        else loadBattle();
      } else {
        setStatus('error');
      }
    } finally {
      setSubmitting(null);
    }
  }

  // The vote machine — identical markup on phone and desktop, only its container
  // changes (bare column on mobile, featured panel on desktop).
  const listenFor = battle ? SCENARIO_PROMPTS[battle.scenarioId]?.listenFor : null;

  const machine = battle && (
    <>
      <ScenarioPrompt scenarioId={battle.scenarioId} />
      {listenFor && (
        <p className="mt-3 text-center text-xs leading-snug text-cream/50 italic max-w-sm mx-auto">
          <span className="font-semibold text-cream/70 not-italic tracking-wide uppercase text-[10px]">Listen for  </span>
          {listenFor}
        </p>
      )}

      <div className="mt-5 space-y-2.5">
        <PlayCard
          side="A"
          accent={ACCENT_A}
          playing={A.playing}
          progress={A.progress}
          played={A.played}
          durationMs={battle.clipA.durationMs}
          onToggle={playA}
        />
        <div className="flex items-center justify-center gap-3 py-0.5">
          <span className="h-px flex-1 bg-white/10" />
          <span className="font-display text-sm font-extrabold tracking-[0.25em] text-mist">VS</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <PlayCard
          side="B"
          accent={ACCENT_B}
          playing={B.playing}
          progress={B.progress}
          played={B.played}
          durationMs={battle.clipB.durationMs}
          onToggle={playB}
        />
      </div>

      <div className="mt-7">
        <p className="text-center font-display text-lg font-bold text-cream">Which sounds more human?</p>
        <div className={`mt-3 grid grid-cols-2 gap-3 ${nudge ? 'shake' : ''}`}>
          <VoteButton side="A" accent={ACCENT_A} armed={canVote} loading={submitting === 'A'} onClick={() => vote('A')} />
          <VoteButton side="B" accent={ACCENT_B} armed={canVote} loading={submitting === 'B'} onClick={() => vote('B')} />
        </div>
        <p
          className="mt-3 text-center text-sm transition-colors"
          style={{ color: nudge ? ACCENT_A : 'var(--color-mist)' }}
        >
          {canVote
            ? 'Trust your ears 👂'
            : nudge
              ? 'Hear both clips first!'
              : '▶ Play both clips to unlock your vote'}
        </p>
      </div>
    </>
  );

  const dailyTotal = daily?.total ?? 3;
  const dailyCompleted = daily?.progress?.completed ?? 0;
  const dailyLabel = dailyTotal > 0 && dailyCompleted >= dailyTotal ? '✓' : `${dailyCompleted}/${dailyTotal}`;

  let panel;
  if (status === 'loading') {
    panel = <Skeleton />;
  } else if (status === 'empty') {
    panel = (
      <Centered
        emoji="🎙️"
        title="No calls to judge yet"
        sub="The clips haven't been loaded. Check back in a moment."
        action={
          <button
            type="button"
            onClick={retry}
            className="press mt-5 rounded-2xl bg-cream px-6 py-3 font-display text-lg font-extrabold text-void"
          >
            Try again
          </button>
        }
      />
    );
  } else if (status === 'error') {
    panel = (
      <Centered
        emoji="📵"
        title="Lost the connection"
        sub="Couldn't reach the game. Give it another shot."
        action={
          <button
            type="button"
            onClick={retry}
            className="press mt-5 rounded-2xl bg-cream px-6 py-3 font-display text-lg font-extrabold text-void"
          >
            Retry
          </button>
        }
      />
    );
  } else if (status === 'daily-complete') {
    panel = (
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
        <p className="text-4xl" aria-hidden>
          🏆
        </p>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-cream">Daily complete!</h2>
        <p className="mt-2 font-body text-lg font-bold text-cyan">
          {daily?.progress?.score ?? 0}/{daily?.total ?? 0} correct
        </p>
        <p className="mt-1 font-body text-sm text-mist">Come back tomorrow for a new challenge</p>
        <button
          type="button"
          onClick={() => setMode('endless')}
          className="press mt-6 rounded-full bg-white/10 px-6 py-2.5 text-sm font-bold text-cream"
        >
          Keep playing endless →
        </button>
      </div>
    );
  } else {
    panel = machine;
  }

  // The reveal is a full, dedicated screen: it fully replaces the play view (the
  // grid below is not rendered) so nothing bleeds through behind it.
  if (status === 'reveal' && reveal) {
    return (
      <Reveal reveal={reveal} stats={stats} onNext={handleNext} onViewStats={() => onNavigate('profile')} />
    );
  }

  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1.05fr_minmax(0,520px)] lg:items-center lg:gap-14 lg:py-8">
      <HeroCopy />
      <section className="flex flex-1 flex-col lg:flex-none lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-grape/40 lg:p-7 lg:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_40px_90px_-40px_rgba(0,0,0,0.85)] lg:backdrop-blur">
        <ModeToggle mode={mode} onModeChange={setMode} dailyLabel={dailyLabel} />
        {panel}
      </section>
    </div>
  );
}
