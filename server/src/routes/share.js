import express from 'express';
import { verifyShare } from '../services/battleToken.js';
import { renderShareCardPng } from '../lib/shareCard.js';

// Server-rendered share unfurl. Mounted in index.js BEFORE helmet and BEFORE the
// rate limiter (see the mount comment there) so social crawlers reach the HTML
// and card image without CSP interference or 429s.
//
// Where human visitors land after the unfurl. Set PUBLIC_APP_URL to the deployed
// client; falls back to the site root so the link still goes somewhere in dev.
const APP_URL = process.env.PUBLIC_APP_URL || '/';

const router = express.Router();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function meta(payload) {
  if (payload && typeof payload.accuracy === 'number') {
    const pct = Math.round(payload.accuracy * 100); // 0..1 fraction -> whole percent here
    return {
      title: `I scored ${pct}% spotting humans on Stackoff`,
      description: `Best streak ${payload.bestStreak ?? 0} · ${Number(payload.votes ?? 0).toLocaleString('en-US')} calls judged. Can you beat me?`,
    };
  }
  return {
    title: 'Stackoff — spot the human',
    description: 'Can you tell a human from a voice-AI on a phone call? Play the duel.',
  };
}

// GET /s/:token — minimal HTML with OG/Twitter tags + a redirect for humans.
// Invalid/expired tokens still render valid tags (generic), never an error.
router.get('/:token', (req, res) => {
  const { token } = req.params;
  let payload = null;
  try {
    payload = verifyShare(token);
  } catch {
    payload = null; // generic unfurl, not an error
  }

  const { title, description } = meta(payload);
  const base = `${req.protocol}://${req.get('host')}`;
  const cardUrl = `${base}/s/${encodeURIComponent(token)}/card.png`;
  const t = escapeHtml(title);
  const d = escapeHtml(description);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta property="og:type" content="website">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:image" content="${cardUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${cardUrl}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(APP_URL)}">
</head>
<body>
<p>Redirecting to Stackoff… <a href="${escapeHtml(APP_URL)}">Continue</a></p>
<script>location.replace(${JSON.stringify(APP_URL)});</script>
</body>
</html>`;

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// GET /s/:token/card.png — the personalized 1200x630 card. Invalid token -> a
// generic Stackoff card (the renderer handles a null payload).
router.get('/:token/card.png', async (req, res, next) => {
  try {
    let payload = null;
    try {
      payload = verifyShare(req.params.token);
    } catch {
      payload = null;
    }
    const png = await renderShareCardPng(payload);
    res.set('Content-Type', 'image/png');
    // Token deterministically maps to a card; safe to cache for a day at the edge.
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.send(png);
  } catch (e) {
    next(e);
  }
});

export default router;
