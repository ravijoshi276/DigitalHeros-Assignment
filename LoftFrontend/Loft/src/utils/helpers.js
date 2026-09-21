/* ── Currency ──────────────────────────────────────────────────────────────── */
export const fmt = (n) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n ?? 0);

/* ── Dates ─────────────────────────────────────────────────────────────────── */
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

/* ── Month name from number ────────────────────────────────────────────────── */
export const monthName = (m, y) => {
  const d = new Date(y, m - 1);
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

/* ── Badge variants keyed by status string ─────────────────────────────────── */
export const subStatusVariant = (s) =>
  ({ active: 'green', cancelled: 'red', past_due: 'amber', inactive: 'muted', incomplete: 'muted' }[s] ?? 'muted');

export const verifyVariant = (s) =>
  ({ approved: 'green', rejected: 'red', pending: 'amber' }[s] ?? 'muted');

export const payVariant = (s) => (s === 'paid' ? 'green' : 'amber');

export const drawStatusVariant = (s) =>
  ({ published: 'green', simulated: 'blue', pending: 'muted' }[s] ?? 'muted');

/* ── Tier display labels ───────────────────────────────────────────────────── */
export const tierLabel = { five_match: '5 Match 🏆', four_match: '4 Match ⭐', three_match: '3 Match' };

/* ── Clamp 0-100 for visual progress bars ──────────────────────────────────── */
export const pct = (val, max) => Math.round(Math.min(100, Math.max(0, (val / max) * 100)));
