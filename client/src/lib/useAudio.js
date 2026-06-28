import { useEffect, useRef, useState } from 'react';

// Drives one HTML5 Audio element: play/pause, 0..1 progress, and a `played`
// flag (true once it has started at least once — used to gate voting). State
// resets whenever the url changes (next battle).
export default function useAudio(url) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    setPlayed(false);
    if (!url) {
      ref.current = null;
      return undefined;
    }

    const a = new Audio(url);
    a.preload = 'auto';
    ref.current = a;

    const onTime = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(1);
    };
    const onPlay = () => {
      setPlaying(true);
      setPlayed(true);
    };
    const onPause = () => setPlaying(false);

    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);

    return () => {
      a.pause();
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      ref.current = null;
    };
  }, [url]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      if (a.ended || a.currentTime >= (a.duration || Infinity)) a.currentTime = 0;
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };

  const stop = () => {
    const a = ref.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setProgress(0);
  };

  return { playing, progress, played, toggle, stop };
}
