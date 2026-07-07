// Cloudflare Turnstile, invisible mode, guarding the vote endpoint ONLY.
//
// If VITE_TURNSTILE_SITE_KEY is unset/empty we skip Turnstile entirely: the
// script never loads and getVoteToken() resolves to undefined, so votes go out
// with no turnstileToken. That mirrors the server, which skips verification when
// TURNSTILE_SECRET is unset — keeping local dev frictionless on both ends.
//
// When configured, we lazily load the widget once with execution:'execute' so it
// does NOT run on page load. Each vote mints a FRESH single-use token via
// turnstile.execute(); we reset afterwards so the next vote gets a clean token.
//
// Invisible by default, with a visible fallback: the widget is mounted inside a
// hidden full-screen overlay. If Cloudflare escalates to an interactive challenge
// (before-interactive-callback), we reveal the overlay so the user can solve it,
// then hide it again (after-interactive-callback / settle). Without this, an
// escalated challenge would render into an off-screen host the user can't reach.

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

let scriptPromise = null;
let widgetPromise = null;
let overlay = null;
// The in-flight execute()'s resolver — votes are serialized by the UI's
// `submitting` guard, so at most one is ever pending.
let pending = null;

function loadScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('turnstile script failed to load'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// A full-screen backdrop, hidden by default, holding the widget mount. Shown only
// when an interactive challenge escalates.
function buildContainer() {
  overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'display:none', // invisible until Cloudflare needs interaction
    'align-items:center',
    'justify-content:center',
    'background:rgba(8,8,12,0.72)',
  ].join(';');
  const host = document.createElement('div');
  overlay.appendChild(host);
  document.body.appendChild(overlay);
  return host;
}

const showOverlay = () => {
  if (overlay) overlay.style.display = 'flex';
};
const hideOverlay = () => {
  if (overlay) overlay.style.display = 'none';
};

function settle(fn, arg) {
  const p = pending;
  pending = null;
  hideOverlay(); // resolved or rejected, the challenge is done — tuck it away
  if (p) fn(p, arg);
}

function getWidget() {
  if (widgetPromise) return widgetPromise;
  widgetPromise = (async () => {
    await loadScript();
    await new Promise((r) => window.turnstile.ready(r));
    const host = buildContainer();
    return window.turnstile.render(host, {
      sitekey: SITE_KEY,
      execution: 'execute', // do NOT challenge on page load — only on execute()
      appearance: 'interaction-only', // stays invisible unless interaction needed
      'before-interactive-callback': showOverlay, // escalation → reveal fallback
      'after-interactive-callback': hideOverlay,
      callback: (token) => settle((p) => p.resolve(token)),
      'error-callback': () => settle((p) => p.reject(new Error('turnstile error'))),
      'timeout-callback': () => settle((p) => p.reject(new Error('turnstile timeout'))),
    });
  })();
  return widgetPromise;
}

// Mint a fresh, single-use token for one vote. Resolves undefined when Turnstile
// is disabled (no site key). Rejects if the challenge errors/times out so the
// caller can surface a soft retry rather than swallow it into a dead button.
export async function getVoteToken() {
  if (!SITE_KEY) return undefined;
  const widgetId = await getWidget();
  try {
    return await new Promise((resolve, reject) => {
      pending = { resolve, reject };
      window.turnstile.execute(widgetId);
    });
  } finally {
    // Single-use + ~300s TTL: clear the widget so the next vote starts clean.
    try {
      window.turnstile.reset(widgetId);
    } catch {
      /* ignore */
    }
  }
}
