// Server-side OG share card: Satori (JSX-like tree -> SVG) -> resvg (SVG -> PNG).
// Mirrors client ShareCard.jsx — big accuracy %, best-streak + calls-judged
// tiles, neon-violet background — but rendered from a token payload, no DOM.
//
// Emoji: Satori throws on any glyph it has no font for, and the monochrome Noto
// Emoji variable font crashes satori's parser. So we render emoji the way satori
// recommends — `graphemeImages`, which swaps a grapheme for an inline <image>.
// We vendor the two color Twemoji SVGs we actually use (🔥 best streak, 👂 golden
// ears) under assets/emoji/ and embed them as data URIs. Full color, offline, and
// it matches the in-app UI (ShareCard.jsx uses the same two emoji).
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', '..', 'assets');
const fontDir = path.join(assetsDir, 'fonts');
const read = (f) => readFileSync(path.join(fontDir, f));

// Loaded once at module init; the renderer is hot after first import.
const FONTS = [
  { name: 'Bricolage Grotesque', data: read('BricolageGrotesque-800.woff'), weight: 800, style: 'normal' },
  { name: 'Space Grotesk', data: read('SpaceGrotesk-500.woff'), weight: 500, style: 'normal' },
  { name: 'Space Grotesk', data: read('SpaceGrotesk-700.woff'), weight: 700, style: 'normal' },
];

// Vendored Twemoji SVGs -> data URIs, keyed by the emoji grapheme. Satori draws
// each as an inline image sized to the surrounding font-size.
const emojiDataUri = (file) =>
  `data:image/svg+xml;base64,${readFileSync(path.join(assetsDir, 'emoji', file)).toString('base64')}`;
const GRAPHEME_IMAGES = {
  '🔥': emojiDataUri('1f525.svg'),
  '👂': emojiDataUri('1f442.svg'),
};

// Brand palette (subset mirrored from client index.css).
const C = {
  lime: '#C6FF4A',
  cyan: '#22D3EE',
  amber: '#FBBF24',
  cream: '#F4ECDE',
  mist: '#C4B5E0',
};

const el = (type, style, children) => ({ type, props: { style, children } });

function label(text, color) {
  return el('div', {
    fontFamily: 'Space Grotesk',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: 4,
    textTransform: 'uppercase',
    color,
  }, text);
}

// `value` may be a string or an array of inline nodes (e.g. number + 🔥 image).
function statTile(value, caption, valueColor) {
  return el('div', {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: '20px 28px',
  }, [
    el('div', { display: 'flex', alignItems: 'center', fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 52, color: valueColor }, value),
    el('div', { fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', color: C.mist, marginTop: 4 }, caption),
  ]);
}

function buildTree(payload) {
  const valid = payload && typeof payload.accuracy === 'number';
  const pct = valid ? Math.round(payload.accuracy * 100) : null;
  const bestStreak = valid ? payload.bestStreak ?? 0 : null;
  const votes = valid ? payload.votes ?? 0 : null;

  const header = el('div', {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  }, [
    el('div', { display: 'flex', fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 34 }, [
      el('span', { color: C.cream }, 'stack'),
      el('span', { color: '#E879F9' }, 'off'),
    ]),
    el('div', {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'Space Grotesk',
      fontWeight: 700,
      fontSize: 18,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: C.cream,
      backgroundColor: 'rgba(255,255,255,0.10)',
      borderRadius: 999,
      padding: '8px 20px',
    }, '👂 Golden ears'),
  ]);

  let middle;
  if (valid) {
    middle = el('div', {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      justifyContent: 'center',
    }, [
      label('My accuracy', C.cyan),
      el('div', { display: 'flex', alignItems: 'flex-end', marginTop: 4 }, [
        el('div', { fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 150, lineHeight: 1, color: C.lime }, String(pct)),
        el('div', { fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 80, color: C.lime, marginLeft: 8, marginBottom: 18 }, '%'),
      ]),
      el('div', { display: 'flex', gap: 20, marginTop: 28 }, [
        statTile(
          [String(bestStreak), el('span', { display: 'flex', marginLeft: 10 }, '🔥')],
          'Best streak',
          C.amber,
        ),
        statTile(Number(votes).toLocaleString('en-US'), 'Calls judged', C.cream),
      ]),
    ]);
  } else {
    // Generic card for an invalid/expired token — never an error image.
    middle = el('div', {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      justifyContent: 'center',
    }, [
      label('A voice-AI duel', C.cyan),
      el('div', { fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 96, lineHeight: 1.05, color: C.lime, marginTop: 8 }, 'Spot the human.'),
    ]);
  }

  const footer = el('div', { display: 'flex', flexDirection: 'column' }, [
    el('div', { fontFamily: 'Bricolage Grotesque', fontWeight: 800, fontSize: 44, color: C.cream }, valid ? 'Can you beat me?' : 'Think you can tell?'),
    el('div', { fontFamily: 'Space Grotesk', fontWeight: 500, fontSize: 24, color: C.mist, marginTop: 6 }, 'stackoff — spot the human in a voice-AI duel'),
  ]);

  return el('div', {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: 64,
    fontFamily: 'Space Grotesk',
    backgroundImage: 'linear-gradient(135deg, #2B0B57 0%, #6D28D9 60%, #8B5CF6 100%)',
  }, [header, middle, footer]);
}

// payload: the verified share payload, or null/invalid -> generic card.
// Returns a PNG Buffer (1200x630).
export async function renderShareCardPng(payload) {
  const svg = await satori(buildTree(payload), {
    width: 1200,
    height: 630,
    fonts: FONTS,
    graphemeImages: GRAPHEME_IMAGES,
  });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
