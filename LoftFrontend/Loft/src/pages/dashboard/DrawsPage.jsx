import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import client from '../../api/client';
import { Badge, Card, EmptyState } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { drawStatusVariant, fmt, monthName } from '../../utils/helpers';

/* Single number bubble — green if it matched the user's scores */
function NumberBubble({ n, matched = false }) {
  return (
    <span
      className={`
        w-11 h-11 rounded-full flex items-center justify-center
        font-heading font-bold text-sm border-2 transition-all
        ${matched
          ? 'bg-brand text-bg-base border-brand shadow-lg shadow-brand/30'
          : 'bg-bg-raised text-ink border-line-subtle'
        }
      `}
    >
      {n}
    </span>
  );
}

/* Expandable draw row in the history list */
function DrawRow({ draw }) {
  const [entry,     setEntry]     = useState(null);
  const [expanded,  setExpanded]  = useState(false);
  const [entryLoad, setEntryLoad] = useState(false);

  const toggle = async () => {
    if (!expanded && !entry && draw.status === 'published') {
      setEntryLoad(true);
      try {
        const { data } = await client.get(`/draws/${draw.id}/my-entry/`);
        setEntry(data);
      } catch { /* user had no entry */ }
      finally { setEntryLoad(false); }
    }
    setExpanded(p => !p);
  };

  const matchSet = new Set(draw.drawn_numbers ?? []);
  const userNums = entry?.numbers ?? [];

  return (
    <div className="border border-line-subtle rounded-2xl overflow-hidden">
      {/* Row header — always visible */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-raised transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <Trophy size={16} className="text-ink-faint shrink-0" />
          <div>
            <p className="font-heading font-semibold text-ink text-sm">
              {monthName(draw.month, draw.year)}
            </p>
            <p className="text-ink-faint text-xs">{draw.active_subscriber_count} players · {fmt(draw.total_prize_pool)} pool</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={drawStatusVariant(draw.status)}>{draw.status}</Badge>
          <span className="text-ink-faint text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-line-subtle px-5 py-4 bg-bg-raised space-y-4 animate-fade-in">
          {/* Drawn numbers */}
          {draw.drawn_numbers?.length > 0 && (
            <div>
              <p className="text-ink-muted text-xs uppercase tracking-widest mb-2">Drawn numbers</p>
              <div className="flex flex-wrap gap-2">
                {draw.drawn_numbers.map(n => (
                  <NumberBubble key={n} n={n} matched={userNums.includes(n)} />
                ))}
              </div>
            </div>
          )}

          {/* User entry */}
          {entryLoad && <Spinner size="sm" />}
          {entry && (
            <div>
              <p className="text-ink-muted text-xs uppercase tracking-widest mb-2">Your entry</p>
              {entry.entered ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {entry.numbers?.map(n => (
                      <NumberBubble key={n} n={n} matched={matchSet.has(n)} />
                    ))}
                  </div>
                  <p className="text-sm">
                    {entry.matches > 0
                      ? <span className="text-brand font-semibold">{entry.matches} match{entry.matches !== 1 ? 'es' : ''} {entry.is_winner ? '🏆' : ''}</span>
                      : <span className="text-ink-muted">No matches this draw</span>
                    }
                  </p>
                </div>
              ) : (
                <p className="text-ink-muted text-sm">{entry.reason ?? 'You were not entered in this draw.'}</p>
              )}
            </div>
          )}

          {/* Prize tiers */}
          {draw.prize_tiers?.length > 0 && (
            <div>
              <p className="text-ink-muted text-xs uppercase tracking-widest mb-2">Prize breakdown</p>
              <div className="grid grid-cols-3 gap-2">
                {draw.prize_tiers.map(t => (
                  <div key={t.tier} className="bg-bg-surface border border-line-subtle rounded-xl p-3 text-center">
                    <p className="text-ink-faint text-xs">{t.tier_display}</p>
                    <p className="font-heading font-bold text-brand text-sm mt-1">{fmt(t.total_pool)}</p>
                    <p className="text-ink-faint text-xs">{t.winner_count} winner{t.winner_count !== 1 ? 's' : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DrawsPage() {
  const [current, setCurrent] = useState(null);
  const [draws,   setDraws]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/draws/current/'),
      client.get('/draws/'),
    ]).then(([c, d]) => {
      setCurrent(c.data);
      setDraws(d.data?.results ?? d.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner full />;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-ink">Draws</h1>
        <p className="text-ink-muted text-sm mt-1">Monthly prize draws · your scores are your numbers</p>
      </div>

      {/* ── Current draw hero ─────────────────────────────────────────── */}
      {current?.exists && (
        <Card className="mb-8 border-brand/20 bg-brand-faint">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-brand text-xs uppercase tracking-widest font-medium mb-1">This month</p>
              <h2 className="font-heading text-2xl font-bold text-ink">{current.display_month}</h2>
            </div>
            <Badge variant={drawStatusVariant(current.status)}>{current.status}</Badge>
          </div>

          {current.prize_tiers && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {current.prize_tiers.map(t => (
                <div key={t.tier} className="bg-bg-surface/70 rounded-xl p-3 text-center">
                  <p className="text-ink-faint text-xs">{t.tier_display}</p>
                  <p className="font-heading font-bold text-brand mt-1">{fmt(t.total_pool)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Drawn numbers if published */}
          {current.status === 'published' && current.drawn_numbers?.length > 0 && (
            <div>
              <p className="text-ink-muted text-xs uppercase tracking-widest mb-3">Drawn numbers</p>
              <div className="flex flex-wrap gap-2">
                {current.drawn_numbers.map(n => (
                  <NumberBubble key={n} n={n} />
                ))}
              </div>
            </div>
          )}

          {current.status !== 'published' && (
            <p className="text-ink-muted text-sm mt-2">
              Draw not yet published. Check back soon — numbers are released at month end.
            </p>
          )}
        </Card>
      )}

      {/* ── Draw history ──────────────────────────────────────────────── */}
      <div>
        <h2 className="font-heading font-semibold text-ink mb-4">Draw history</h2>
        {draws.length === 0 ? (
          <EmptyState icon={Trophy} title="No draws yet" description="Published draws will appear here." />
        ) : (
          <div className="space-y-3">
            {draws.map(d => <DrawRow key={d.id} draw={d} />)}
          </div>
        )}
      </div>
    </div>
  );
}
