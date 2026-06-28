// Sharing the "golden ears" result. navigator.share is used where available
// (phones), with a clipboard copy as the desktop fallback. The shared link is
// always the site root so a friend lands straight in the game — the challenge.

export function buildShareText({ accuracy, bestStreak }) {
  return `I've got golden ears 👂 — ${accuracy}% accuracy, best streak ${bestStreak}🔥 on Stackoff. Can you beat me?`;
}

// The site root, normalized (drops any /index.html and trailing hash) so the
// challenge link opens on the Play view.
export function siteUrl() {
  const { origin, pathname } = window.location;
  return (origin + pathname).replace(/index\.html$/, '').replace(/\/$/, '') || origin;
}

// Copy with a graceful fallback: navigator.clipboard needs a secure context,
// which http://<lan-ip> on a phone is not, so fall back to a hidden textarea.
async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Returns: 'shared' | 'copied' | 'cancelled' | 'failed' so the UI can show the
// right toast.
export async function shareOrCopy(stats) {
  const text = buildShareText(stats);
  const url = siteUrl();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Stackoff — spot the human', text, url });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
      /* unsupported payload — fall back to copy */
    }
  }
  const ok = await copyText(`${text} ${url}`);
  return ok ? 'copied' : 'failed';
}

export async function copyChallengeLink(stats) {
  const ok = await copyText(`${buildShareText(stats)} ${siteUrl()}`);
  return ok ? 'copied' : 'failed';
}
