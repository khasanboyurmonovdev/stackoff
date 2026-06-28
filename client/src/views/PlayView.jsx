import { useCallback, useEffect, useState } from 'react';
import PlayCard from '../components/PlayCard';
import Reveal from '../components/Reveal';
import useAudio from '../lib/useAudio';
import { clipPath, fetchBattle, postVote } from '../lib/api';
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
      <h1 className="mt-1.5 font-display text-[1.7rem] font-extrabold leading-[1.1] text-cream">{s.prompt}</h1>
    </div>
  );
}

function VoteButton({ side, accent, armed, loading, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={`Vote: ${side} is more human`}
      className="press flex min-h-[72px] flex-col items-center justify-center rounded-2xl font-display"
      style={{
        background: armed ? accent : 'rgba(255,255,255,0.06)',
        color: armed ? '#190a2e' : 'var(--color-mist)',
      }}
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

// --- Desktop-only hero copy that frames the game beside the featured panel -----

function HeroCopy() {
  const steps = [
    { icon: '▶', text: 'Hear two callers handle the same moment', color: 'var(--color-magenta)' },
    { icon: '👂', text: 'Call which one sounds human', color: 'var(--color-cyan)' },
    { icon: '📈', text: 'Your vote ranks the whole stack', color: 'var(--color-lime)' },
  ];
  return (
    <div className="hidden lg:flex lg:flex-col lg:pr-4">
      <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-cyan">
        The voice-AI turing arena
      </p>
      <h1 className="mt-4 font-display text-6xl font-extrabold leading-[0.98] tracking-tight text-cream">
        Which voice AI
        <br />
        sounds{' '}
        <span className="bg-gradient-to-r from-magenta to-cyan bg-clip-text text-transparent">human?</span>
      </h1>
      <p className="mt-5 max-w-md text-lg leading-relaxed text-mist">
        Judge the whole stack — voice, brains, and how it handles a real conversation. Play a clip from each
        caller, then trust your ears.
      </p>
      <ul className="mt-8 space-y-3">
        {steps.map((s) => (
          <li key={s.text} className="flex items-center gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: s.color }}
              aria-hidden
            >
              {s.icon}
            </span>
            <span className="font-body text-[15px] text-cream/90">{s.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// -----------------------------------------------------------------------------

export default function PlayView({ voterId, stats, setStats, onNavigate }) {
  const [status, setStatus] = useState('loading'); // loading | ready | reveal | empty | error
  const [battle, setBattle] = useState(null);
  const [reveal, setReveal] = useState(null);
  const [submitting, setSubmitting] = useState(null); // 'A' | 'B' | null
  const [nudge, setNudge] = useState(false);

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

  useEffect(() => {
    loadBattle();
  }, [loadBattle]);

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
      const rev = await postVote({ token: battle.token, winnerClipId, voterId });
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
        loadBattle();
      } else {
        setStatus('error');
      }
    } finally {
      setSubmitting(null);
    }
  }

  // The vote machine — identical markup on phone and desktop, only its container
  // changes (bare column on mobile, featured panel on desktop).
  const machine = battle && (
    <>
      <ScenarioPrompt scenarioId={battle.scenarioId} />

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
            onClick={loadBattle}
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
            onClick={loadBattle}
            className="press mt-5 rounded-2xl bg-cream px-6 py-3 font-display text-lg font-extrabold text-void"
          >
            Retry
          </button>
        }
      />
    );
  } else {
    panel = machine; // ready + reveal both keep the machine visible
  }

  return (
    <>
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[1.05fr_minmax(0,520px)] lg:items-center lg:gap-14 lg:py-8">
        <HeroCopy />
        <section className="flex flex-1 flex-col lg:flex-none lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-grape/40 lg:p-7 lg:shadow-[0_40px_90px_-40px_rgba(0,0,0,0.85)] lg:backdrop-blur">
          {panel}
        </section>
      </div>

      {status === 'reveal' && reveal && (
        <Reveal reveal={reveal} stats={stats} onNext={loadBattle} onViewStats={() => onNavigate('profile')} />
      )}
    </>
  );
}
