import { useEffect, useState } from 'react';
import { fetchLeaderboard, fetchVoterLeaderboard, getVoterId } from '../lib/api';
import CountUp from '../components/CountUp';
import StackMark from '../components/StackMark';
import { stackTheme } from '../lib/stacks';

const STEPS = [
  {
    num: '01',
    title: 'Listen blind',
    desc: 'Two clips play — both from a real phone call. One might be human. You don\'t know which stack built either voice.',
  },
  {
    num: '02',
    title: "Vote on who's human",
    desc: 'Not just "which sounds better" — which one handles the conversation like a real person? Pauses, interruptions, all of it.',
  },
  {
    num: '03',
    title: "See what's under the hood",
    desc: 'The reveal shows the full stack — STT, LLM, TTS — plus how each one behaves in conversation. Every vote reshapes the leaderboard.',
  },
];

const SCENARIOS_DISPLAY = [
  { id: 'interruption', icon: '🗣️', label: 'Barge-in', desc: 'You cut the AI off mid-sentence. Does it stop and listen — or bulldoze through?' },
  { id: 'long-pause', icon: '⏸️', label: 'Endpointing', desc: 'You pause for three seconds mid-thought. Does it wait patiently — or jump in too early?' },
  { id: 'backchannel', icon: '🔄', label: 'Overlap tolerance', desc: 'You and the AI talk at the same time. Does it handle the overlap gracefully?' },
  { id: 'self-correction', icon: '✏️', label: 'Repair handling', desc: 'You correct yourself: "Tuesday — no, Wednesday." Does it catch the correction or lock onto the first thing you said?' },
  { id: 'rapid-fire', icon: '⚡', label: 'Rapid-fire', desc: 'Fast, short exchanges back and forth. Can the AI keep up without lag or missing your cues?' },
];

// At/above this uncertainty a row has too little data to trust its point score,
// so we mute the big number and let the ± band dominate.
const UNCERTAIN = 30;

// Humanness fill: cyan → lime reads as "moving toward human". Width carries the
// score; the CSS transition makes it grow in when the board loads.
function Bar({ value, className = '' }) {
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan to-lime transition-[width] duration-700 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function PriceTier({ tier }) {
  return (
    <span className="rounded-md bg-white/8 px-2 py-1 font-display text-xs font-bold text-amber" title="Price tier">
      {tier}
    </span>
  );
}

function ConfigChips({ stt, llm, tts, accent = 'var(--color-mist)' }) {
  const items = [
    ['STT', stt],
    ['LLM', llm],
    ['TTS', tts],
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(([label, value]) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs"
          style={{
            background: `color-mix(in srgb, ${accent} 9%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 26%, transparent)`,
          }}
        >
          <span style={{ color: accent }} className="font-bold">{label}</span>
          <span className="font-medium text-cream">{value}</span>
        </span>
      ))}
    </div>
  );
}

// The human anchor, pinned above the competitors. Styled as a benchmark line —
// cream/lime, no rank, no crown — so it reads as the bar, not a contestant.
function BaselineRow({ row }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-cream/30 bg-gradient-to-r from-cream/15 to-transparent p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <span className="text-3xl" aria-hidden>🧑</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-display text-xl font-bold text-cream">Human</p>
            <span className="rounded-full bg-cream/20 px-2 py-0.5 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-cream">
              The benchmark
            </span>
          </div>
          <p className="mt-0.5 font-body text-xs text-mist">
            {row.votes.toLocaleString()} calls · the bar every stack is measured against
          </p>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full rounded-full bg-gradient-to-r from-cream to-lime" />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="font-display text-4xl font-extrabold leading-none text-cream">100</span>
          <p className="font-body text-xs text-mist">/100</p>
        </div>
      </div>
    </div>
  );
}

// The champion. Crown, lime/amber glow, the score blown up — clearly the one to
// beat. Lays out stacked on phone, side-by-side on desktop.
function Podium({ row }) {
  const unsettled = row.uncertainty >= UNCERTAIN;
  return (
    <div className="glow-pulse relative overflow-hidden rounded-[1.75rem] border border-lime/40 bg-gradient-to-br from-grape/85 to-void/50 p-5 sm:p-6 lg:p-8">
      <span className="absolute -right-6 -top-6 text-[7rem] opacity-10 lg:text-[9rem]" aria-hidden>
        👑
      </span>

      <div className="lg:flex lg:items-center lg:gap-10">
        <div className="lg:flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden>
              👑
            </span>
            <span className="rounded-full bg-lime/15 px-2.5 py-1 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-lime">
              Most human
            </span>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <StackMark stackId={row.id} size="lg" />
            <h2 className="font-display text-4xl font-extrabold tracking-tight text-cream lg:text-5xl">
              {row.name}
            </h2>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <PriceTier tier={row.priceTier} />
            <span className="font-body text-sm text-mist">{row.votes} votes</span>
          </div>
          <div className="mt-4 lg:max-w-md">
            <ConfigChips stt={row.stt} llm={row.llm} tts={row.tts} accent={stackTheme(row.id).accent} />
          </div>
        </div>

        <div className="mt-6 lg:mt-0 lg:w-72 lg:shrink-0">
          <div className="flex items-end justify-between">
            <span className="font-body text-xs font-bold uppercase tracking-[0.2em] text-mist">Humanness</span>
            <span className={unsettled ? 'font-display text-base font-extrabold text-amber' : 'font-body text-sm text-mist'}>±{row.uncertainty}</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`font-display font-extrabold leading-none ${unsettled ? 'text-4xl text-mist/70 lg:text-5xl' : 'text-6xl text-lime lg:text-7xl'}`}>
              <CountUp value={row.humanness} />
            </span>
            <span className="font-display text-2xl font-bold text-mist">/100</span>
          </div>
          <Bar value={row.humanness} className="mt-3 h-3" />
        </div>
      </div>
    </div>
  );
}

// Phone rows below the podium: a clean stacked card each.
function RankCard({ row, rank }) {
  const unsettled = row.uncertainty >= UNCERTAIN;
  return (
    <div
      className="lift lux-accent rounded-2xl border border-white/10 bg-grape/40 p-4"
      style={{ '--card-accent': stackTheme(row.id).accent }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-extrabold tabular-nums text-mist">{rank}</span>
          <StackMark stackId={row.id} size="sm" />
          <div>
            <p className="font-display text-lg font-bold text-cream">{row.name}</p>
            <p className="font-body text-xs text-mist">
              {row.votes} votes · <span className="text-amber">{row.priceTier}</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className={`font-display font-extrabold leading-none ${unsettled ? 'text-xl text-mist/60' : 'text-3xl text-cream'}`}>
            <CountUp value={row.humanness} />
          </span>
          <p className={unsettled ? 'font-display text-lg font-extrabold text-amber' : 'font-body text-xs text-mist'}>±{row.uncertainty}</p>
        </div>
      </div>
      <Bar value={row.humanness} className="mt-3" />
      <div className="mt-3">
        <ConfigChips stt={row.stt} llm={row.llm} tts={row.tts} accent={stackTheme(row.id).accent} />
      </div>
    </div>
  );
}

// Desktop rows: an aligned grid that fills the width like a real ranking table.
function TableRow({ row, rank }) {
  const unsettled = row.uncertainty >= UNCERTAIN;
  return (
    <div
      className="lift lux-accent grid grid-cols-[2.5rem_1fr_minmax(13rem,1fr)_4rem_4.5rem] items-center gap-4 rounded-2xl border border-white/8 bg-grape/30 px-5 py-4 hover:border-white/15 hover:bg-grape/50"
      style={{ '--card-accent': stackTheme(row.id).accent }}
    >
      <span className="font-display text-2xl font-extrabold tabular-nums text-mist">{rank}</span>
      <div className="flex min-w-0 items-center gap-3">
        <StackMark stackId={row.id} size="sm" />
        <div className="min-w-0">
          <p className="font-display text-xl font-bold text-cream">{row.name}</p>
          <div className="mt-2">
            <ConfigChips stt={row.stt} llm={row.llm} tts={row.tts} accent={stackTheme(row.id).accent} />
          </div>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className={`font-display font-extrabold leading-none ${unsettled ? 'text-lg text-mist/60' : 'text-2xl text-cream'}`}>
            <CountUp value={row.humanness} />
          </span>
          <PriceTier tier={row.priceTier} />
        </div>
        <Bar value={row.humanness} />
      </div>
      <span className={`text-right ${unsettled ? 'font-display text-base font-extrabold text-amber' : 'font-body text-sm text-mist'}`}>±{row.uncertainty}</span>
      <span className="text-right font-body text-sm tabular-nums text-mist">{row.votes}</span>
    </div>
  );
}

function Header() {
  return (
    <header className="pt-2">
      <p className="font-body text-xs font-bold uppercase tracking-[0.28em] text-cyan">The leaderboard</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-cream lg:text-5xl">
        Most human stacks
      </h1>
      <p className="mt-3 max-w-2xl font-body text-mist lg:text-lg">
        These are full deployable stacks, ranked by how human they feel in real conversation — not just voices.
      </p>
    </header>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse pt-2">
      <div className="h-3 w-28 rounded bg-white/10" />
      <div className="mt-3 h-9 w-64 rounded bg-white/10" />
      <div className="mt-4 h-4 w-full max-w-xl rounded bg-white/10" />
      <div className="mt-7 h-44 rounded-[1.75rem] bg-white/5" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}

export default function LeaderboardView() {
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [rows, setRows] = useState([]);
  const [voters, setVoters] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await fetchLeaderboard();
        if (!alive) return;
        const sorted = [...data].sort((a, b) => b.humanness - a.humanness);
        setRows(sorted);
        // Gate the empty state on the stacks alone — the human baseline row is
        // always present, so it must not by itself count as "has rankings".
        const stackCount = sorted.filter((r) => !r.isBaseline).length;
        setStatus(stackCount ? 'ready' : 'empty');
      } catch {
        if (alive) setStatus('error');
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Independent of the stack leaderboard's status: a voter-leaderboard failure
  // shouldn't block or error out the stacks board above it, so it's fetched on
  // its own and just silently omits the section on failure.
  useEffect(() => {
    let alive = true;
    fetchVoterLeaderboard(getVoterId())
      .then((v) => alive && setVoters(v))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (status === 'loading') return <Skeleton />;

  if (status === 'empty' || status === 'error') {
    return (
      <div className="flex flex-1 flex-col">
        <Header />
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl" aria-hidden>
            {status === 'error' ? '📡' : '🏁'}
          </div>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-cream">
            {status === 'error' ? "Couldn't load the board" : 'No rankings yet'}
          </h2>
          <p className="mt-1.5 max-w-sm text-mist">
            {status === 'error'
              ? 'The leaderboard is out of reach right now. Try again shortly.'
              : 'Be the first to judge a call — every vote shapes the ranking.'}
          </p>
        </div>
      </div>
    );
  }

  const baseline = rows.find((r) => r.isBaseline);
  const stacks = rows.filter((r) => !r.isBaseline);
  const [champion, ...rest] = stacks;

  const totalVotes = stacks.reduce((sum, s) => sum + (s.votes || 0), 0);
  const stackCount = stacks.length;
  const sprintScore = stacks.find((s) => s.id === 'sprint')?.humanness ?? 0;

  return (
    <div className="flex flex-1 flex-col">
      <Header />

      {baseline && (
        <div className="mt-7">
          <BaselineRow row={baseline} />
        </div>
      )}

      <div className="mt-4">
        <Podium row={champion} />
      </div>

      {/* Phone / tablet: stacked cards. Desktop: an aligned table. */}
      <div className="mt-4 space-y-3 lg:hidden">
        {rest.map((row, i) => (
          <RankCard key={row.id} row={row} rank={i + 2} />
        ))}
      </div>

      <div className="mt-6 hidden lg:block">
        <div className="grid grid-cols-[2.5rem_1fr_minmax(13rem,1fr)_4rem_4.5rem] gap-4 px-5 pb-2 font-body text-[11px] font-bold uppercase tracking-[0.18em] text-mist">
          <span>#</span>
          <span>Stack</span>
          <span>Humanness</span>
          <span className="text-right">Conf.</span>
          <span className="text-right">Votes</span>
        </div>
        <div className="space-y-2.5">
          {rest.map((row, i) => (
            <TableRow key={row.id} row={row} rank={i + 2} />
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <section className="mt-16 lg:mt-20">
        <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-cyan">How it works</p>
        <h2 className="mt-2 font-display text-2xl font-extrabold text-cream lg:text-3xl">
          Three rounds to the truth
        </h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-mist lg:text-base">
          Every vote trains a live Elo leaderboard — not just on voice quality, but on how well each AI stack
          handles real conversation.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-6"
            >
              <span
                className="pointer-events-none absolute right-4 top-3 select-none font-display text-[3.5rem] font-extrabold leading-none text-white/[0.04]"
                aria-hidden
              >
                {step.num}
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10 font-display text-sm font-bold text-cyan">
                {step.num}
              </span>
              <h3 className="mt-3 font-display text-base font-bold text-cream">{step.title}</h3>
              <p className="mt-1.5 font-body text-sm leading-snug text-mist">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What we test ── */}
      <section className="mt-16 lg:mt-20">
        <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-cyan">
          What we test
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold text-cream lg:text-3xl">
          Five conversational pressure points
        </h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-mist lg:text-base">
          Each round is built around a specific moment where voice AI breaks down. These aren't scripted reads — they're the messy parts of real conversation.
        </p>
        <div className="mt-8 space-y-3">
          {SCENARIOS_DISPLAY.map((s) => (
            <div key={s.id} className="flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 lg:px-5">
              <span className="mt-0.5 text-xl leading-none">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-cream">{s.label}</p>
                <p className="mt-1 font-body text-sm leading-snug text-mist/70">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {stacks?.length > 0 && (
        <div className="mt-12 grid grid-cols-3 gap-3 lg:mt-16">
          <div className="rounded-xl bg-white/[0.04] px-4 py-4 text-center">
            <p className="font-display text-2xl font-extrabold text-cream">{totalVotes}</p>
            <p className="mt-1 font-body text-[11px] font-medium uppercase tracking-widest text-mist/60">
              Blind votes
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.04] px-4 py-4 text-center">
            <p className="font-display text-2xl font-extrabold text-cream">{stackCount}</p>
            <p className="mt-1 font-body text-[11px] font-medium uppercase tracking-widest text-mist/60">
              Full stacks
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.04] px-4 py-4 text-center">
            <p className="font-display text-2xl font-extrabold text-cyan">{sprintScore}</p>
            <p className="mt-1 font-body text-[11px] font-medium uppercase tracking-widest text-mist/60">
              Sprint humanness
            </p>
          </div>
        </div>
      )}

      {/* ── Methodology ── */}
      <section className="mt-16 lg:mt-20">
        <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-cyan">
          Methodology
        </p>
        <h2 className="mt-2 font-display text-2xl font-extrabold text-cream lg:text-3xl">
          How the ranking works
        </h2>
        <div className="mt-6 space-y-6 font-body text-sm leading-relaxed text-mist lg:text-base">
          <div>
            <h3 className="font-display text-base font-bold text-cream">Blind comparison</h3>
            <p className="mt-1.5">
              Every round plays two audio clips from the same conversation scenario. One may be a real human. Voters don't see names, providers, or any identifying information until after they vote. Position (A vs B) is randomized 50/50.
            </p>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-cream">Elo rating system</h3>
            <p className="mt-1.5">
              Each vote updates both stacks' Elo ratings — the same system used in chess rankings. Early votes move scores more; as vote counts grow, ratings stabilize. Phantom prior votes prevent a single lucky matchup from distorting the leaderboard.
            </p>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-cream">Humanness score</h3>
            <p className="mt-1.5">
              The humanness number you see is the Elo rating rescaled so the real human baseline sits at 100. A stack scoring 80 means voters chose the human over that stack roughly 80% of the time they were compared. Higher is more human-sounding.
            </p>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-cream">Confidence (±)</h3>
            <p className="mt-1.5">
              The ± number reflects uncertainty — how much the score could shift as more votes come in. A stack with ±5 has a stable ranking. A stack with ±15 still needs more votes before its position is reliable. When uncertainty is high, the score dims on the leaderboard.
            </p>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-cream">What makes this different</h3>
            <p className="mt-1.5">
              Most voice benchmarks compare single-line reads: two voices say the same sentence, you pick the better one. That tests voice quality in isolation. Stackoff tests full deployable stacks in conversation — STT, LLM, and TTS together — across scenarios designed to expose how the stack handles turns, interruptions, pauses, and corrections. A config with a beautiful voice that talks over you will lose here.
            </p>
          </div>
        </div>
      </section>

      {voters?.voters?.length > 0 && (
        <section className="mt-16 lg:mt-20">
          <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-cyan">Golden ears</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-cream lg:text-3xl">Top listeners</h2>
          <p className="mt-2 font-body text-sm leading-relaxed text-mist lg:text-base">
            Ranked by golden-ears accuracy. Minimum 5 rounds to qualify.
          </p>

          <div className="mt-6 space-y-2">
            {voters.voters.map((v) => (
              <div
                key={v.rank}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  voters.you && v.rank === voters.you.rank ? 'border border-cyan/20 bg-cyan/10' : 'bg-white/[0.03]'
                }`}
              >
                <span className="w-8 text-right font-display text-lg font-bold text-mist/40">{v.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-medium text-cream">
                    {v.name}
                    {voters.you && v.rank === voters.you.rank && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-cyan">You</span>
                    )}
                  </p>
                  <p className="font-body text-xs text-mist/50">
                    {v.goldenAttempts} rounds · best streak {v.bestStreak}
                  </p>
                </div>
                <span className="font-display text-lg font-bold text-cream">{Math.round(v.accuracy * 100)}%</span>
              </div>
            ))}
          </div>

          {voters.you && !voters.voters.some((v) => v.rank === voters.you.rank) && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-cyan/20 bg-cyan/10 px-4 py-3">
              <span className="w-8 text-right font-display text-lg font-bold text-mist/40">{voters.you.rank}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-medium text-cream">
                  {voters.you.name}
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-cyan">You</span>
                </p>
              </div>
              <span className="font-display text-lg font-bold text-cream">
                {Math.round(voters.you.accuracy * 100)}%
              </span>
            </div>
          )}
        </section>
      )}

      {/* ── CTA ── */}
      <section className="mt-16 lg:mt-20 mb-8">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-white/[0.01] px-6 py-8 text-center lg:px-10 lg:py-10">
          <p className="font-body text-xs font-bold uppercase tracking-[0.2em] text-cyan">
            The rankings are live
          </p>
          <h2 className="mt-3 font-display text-2xl font-extrabold text-cream lg:text-3xl">
            Help decide which stack sounds human
          </h2>
          <p className="mt-3 font-body text-sm leading-relaxed text-mist lg:text-base max-w-md mx-auto">
            Every blind vote sharpens these numbers. It takes 30 seconds, and you might discover that the prettiest voice has the worst manners.
          </p>
          <button
            onClick={() => { window.location.hash = '#/'; }}
            className="press mt-6 inline-flex items-center gap-2 rounded-full bg-cyan px-6 py-3 font-display text-sm font-bold text-void-deep transition-transform hover:scale-[1.03]"
          >
            Play a round →
          </button>
        </div>
      </section>
    </div>
  );
}
