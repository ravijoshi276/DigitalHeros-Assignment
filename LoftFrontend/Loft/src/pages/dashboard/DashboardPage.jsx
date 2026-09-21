import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Gift, Heart, Trophy } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Card, StatTile, Badge } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { fmt, fmtDate, subStatusVariant, monthName } from '../../utils/helpers';

export default function DashboardPage() {
  const { user }           = useAuth();
  const { sub, loading: subLoading } = useSubscription();
  const [draw,    setDraw]    = useState(null);
  const [scores,  setScores]  = useState([]);
  const [wins,    setWins]    = useState([]);

  useEffect(() => {
    client.get('/draws/current/').then(r => setDraw(r.data)).catch(() => {});
    client.get('/scores/').then(r => setScores(r.data?.results ?? r.data ?? [])).catch(() => {});
    client.get('/winners/mine/').then(r => setWins(r.data?.results ?? r.data ?? [])).catch(() => {});
  }, []);

  const openPortal = async () => {
    try {
      const { data } = await client.post('/subscriptions/portal/');
      window.location.href = data.portal_url;
    } catch { /* portal will show error */ }
  };

  if (subLoading) return <Spinner full />;

  const isActive = sub?.status === 'active';

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-ink">
          Good day, {user?.first_name} 👋
        </h1>
        <p className="text-ink-muted text-sm mt-1">Here's what's happening with your account.</p>
      </div>

      {/* ── Subscription banner ────────────────────────────────────────── */}
      {!isActive && (
        <div className="mb-8 bg-accent/5 border border-accent/20 rounded-2xl px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-heading font-semibold text-accent">No active subscription</p>
            <p className="text-ink-muted text-sm">Subscribe to enter monthly draws and track your scores.</p>
          </div>
          <Link to="/pricing">
            <Button variant="accent" size="sm">Subscribe now →</Button>
          </Link>
        </div>
      )}

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile icon={BarChart3} label="Scores logged"   value={scores.length + ' / 5'} sub="Stableford" accent={scores.length === 5} />
        <StatTile icon={Trophy}    label="Total wins"       value={wins.length}            sub="All time" />
        <StatTile icon={Heart}     label="Charity share"    value={sub?.charity_percentage ? sub.charity_percentage + '%' : '—'} sub={sub?.charity_detail?.name ?? 'Not selected'} />
        <StatTile icon={Gift}      label="Subscription"     value={sub?.plan === 'yearly' ? 'Yearly' : sub?.plan === 'monthly' ? 'Monthly' : '—'} sub={isActive ? 'Active' : 'Inactive'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Current draw ──────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-ink-muted text-xs uppercase tracking-widest mb-1">Current draw</p>
                <h2 className="font-heading font-semibold text-ink text-xl">
                  {draw?.exists ? draw.display_month : 'No active draw'}
                </h2>
              </div>
              {draw?.exists && <Badge variant={draw.status === 'published' ? 'green' : 'muted'}>{draw.status}</Badge>}
            </div>

            {draw?.exists ? (
              <div className="space-y-4">
                {/* Prize tiers */}
                {draw.prize_tiers && (
                  <div className="grid grid-cols-3 gap-3">
                    {draw.prize_tiers.map(t => (
                      <div key={t.tier} className="bg-bg-raised border border-line-subtle rounded-xl p-3 text-center">
                        <p className="text-ink-faint text-xs mb-1">{t.tier_display}</p>
                        <p className="font-heading font-bold text-brand text-lg">{fmt(t.total_pool)}</p>
                        {t.winner_count > 0 && (
                          <p className="text-ink-faint text-xs mt-1">{t.winner_count} winner{t.winner_count !== 1 ? 's' : ''}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Drawn numbers — only shown after publish */}
                {draw.status === 'published' && draw.drawn_numbers?.length > 0 && (
                  <div>
                    <p className="text-ink-muted text-xs mb-2">Drawn numbers</p>
                    <div className="flex gap-2 flex-wrap">
                      {draw.drawn_numbers.map(n => (
                        <span key={n} className="w-10 h-10 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center font-heading font-bold text-brand text-sm">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <Link to="/draws">
                  <Button variant="ghost" size="sm" className="mt-1">View full draw →</Button>
                </Link>
              </div>
            ) : (
              <p className="text-ink-muted text-sm">No draw has been set up for this month yet. Check back soon.</p>
            )}
          </Card>
        </div>

        {/* ── Right column ──────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Subscription card */}
          <Card>
            <p className="text-ink-muted text-xs uppercase tracking-widest mb-3">Subscription</p>
            <div className="flex items-center gap-2 mb-3">
              <Badge variant={subStatusVariant(sub?.status ?? 'inactive')}>
                {sub?.status ?? 'None'}
              </Badge>
              {sub?.plan && <span className="text-ink-muted text-xs capitalize">{sub.plan}</span>}
            </div>
            {sub?.renewal_date && (
              <p className="text-ink-faint text-xs">Renews {fmtDate(sub.renewal_date)}</p>
            )}
            <div className="flex gap-2 mt-4">
              {isActive
                ? <Button variant="secondary" size="sm" onClick={openPortal}>Manage →</Button>
                : <Link to="/pricing"><Button size="sm">Subscribe</Button></Link>
              }
            </div>
          </Card>

          {/* Charity card */}
          <Card>
            <p className="text-ink-muted text-xs uppercase tracking-widest mb-3">Your charity</p>
            {sub?.charity_detail ? (
              <>
                <p className="font-heading font-semibold text-ink">{sub.charity_detail.name}</p>
                <p className="text-brand text-sm mt-1">{sub.charity_percentage}% of your subscription</p>
              </>
            ) : (
              <p className="text-ink-muted text-sm">No charity selected.</p>
            )}
            <Link to="/charities">
              <Button variant="ghost" size="sm" className="mt-3 pl-0">Browse charities →</Button>
            </Link>
          </Card>

          {/* Recent scores */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <p className="text-ink-muted text-xs uppercase tracking-widest">Last scores</p>
              <Link to="/scores" className="text-brand text-xs hover:underline">Edit →</Link>
            </div>
            {scores.length > 0 ? (
              <div className="space-y-2">
                {scores.slice(0, 3).map(s => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-ink-faint text-xs">{fmtDate(s.date)}</span>
                    <span className="font-heading font-bold text-ink text-sm">{s.score} <span className="text-ink-faint font-normal">pts</span></span>
                  </div>
                ))}
                {scores.length > 3 && (
                  <p className="text-ink-faint text-xs">+{scores.length - 3} more</p>
                )}
              </div>
            ) : (
              <p className="text-ink-muted text-sm">No scores yet. <Link to="/scores" className="text-brand hover:underline">Add one →</Link></p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
