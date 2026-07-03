import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../lib/api';
import CountUp from '../components/CountUp';
import StackMark from '../components/StackMark';
import { stackTheme } from '../lib/stacks';

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
    </div>
  );
}
