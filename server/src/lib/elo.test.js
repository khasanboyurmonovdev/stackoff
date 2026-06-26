// Plain-node test for the Elo engine. No framework.
// Run: node src/lib/elo.test.js

import {
  expectedScore,
  updateRatings,
  adaptiveK,
  normalize,
  uncertaintyBand,
} from './elo.js';

let passed = 0;
let failed = 0;

function check(name, cond) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}`);
  }
}

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// 1. Equal ratings give 0.5 expected.
check('equal ratings -> 0.5 expected', near(expectedScore(1200, 1200), 0.5));

// 2. Winner gains and loser loses symmetrically.
{
  const { ratingA, ratingB } = updateRatings(1200, 1200, 1);
  const gain = ratingA - 1200;
  const loss = 1200 - ratingB;
  check('winner gains', gain > 0);
  check('loser loses', loss > 0);
  check('gain/loss symmetric', near(gain, loss));
}

// 3. Upset win gains more than an expected win.
{
  const upset = updateRatings(1000, 1400, 1).ratingA - 1000; // underdog beats favorite
  const expected = updateRatings(1400, 1000, 1).ratingA - 1400; // favorite beats underdog
  check('upset win gains more than expected win', upset > expected);
}

// 4. adaptiveK starts >=30, decays, floors at 12.
{
  const start = adaptiveK(0);
  check('adaptiveK starts >= 30', start >= 30);
  check('adaptiveK decays', adaptiveK(60) < start);
  check('adaptiveK floors at 12', adaptiveK(100000) === 12);
}

// 5. normalize maps top to 100 and bottom to 0.
{
  const out = normalize([
    { id: 'a', rating: 1300 },
    { id: 'b', rating: 1100 },
    { id: 'c', rating: 1200 },
  ]);
  const byId = Object.fromEntries(out.map((x) => [x.id, x]));
  check('normalize top -> 100', near(byId.a.humanness, 100));
  check('normalize bottom -> 0', near(byId.b.humanness, 0));
  check('normalize mid between', byId.c.humanness > 0 && byId.c.humanness < 100);

  const eq = normalize([
    { id: 'x', rating: 1200 },
    { id: 'y', rating: 1200 },
  ]);
  check('normalize all-equal no divide-by-zero', eq.every((x) => Number.isFinite(x.humanness)));
}

// 6. Uncertainty narrows with more votes.
check('uncertainty narrows with votes', uncertaintyBand(1000) < uncertaintyBand(5));

// 7. Simulated season: a deliberately-stronger stack ends rated above a weaker one.
{
  // Deterministic LCG so the test never flakes.
  let seed = 123456789;
  const rng = () => {
    seed = (1103515245 * seed + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const trueStrong = 1700; // hidden true skill
  const trueWeak = 1300;
  let strong = 1200;
  let weak = 1200;
  let strongVotes = 0;
  let weakVotes = 0;

  for (let i = 0; i < 3000; i++) {
    const pStrongWins = expectedScore(trueStrong, trueWeak);
    const score = rng() < pStrongWins ? 1 : 0; // 1 = strong wins
    const k = Math.min(adaptiveK(strongVotes), adaptiveK(weakVotes));
    const r = updateRatings(strong, weak, score, k);
    strong = r.ratingA;
    weak = r.ratingB;
    strongVotes++;
    weakVotes++;
  }

  check('season: stronger stack ends above weaker', strong > weak);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
