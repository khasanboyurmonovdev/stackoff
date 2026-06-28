import { useEffect, useState } from 'react';
import { reduceMotion } from '../lib/motion';

// Animated number that eases from 0 up to `value` (easeOutCubic). Respects
// reduced-motion by snapping straight to the final value. Shared by the reveal,
// profile stats, and leaderboard scores so every count-up feels the same.
export default function CountUp({ value, suffix = '', duration = 700, decimals = 0 }) {
  const [n, setN] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (reduceMotion) {
      setN(value);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const shown = decimals ? n.toFixed(decimals) : Math.round(n);
  return (
    <>
      {shown}
      {suffix}
    </>
  );
}
