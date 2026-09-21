import { BarChart3, Gift, Heart, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Card, StatTile } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { fmt } from '../../utils/helpers';

export default function AdminOverviewPage() {
  const { data, loading, refetch } = useApi('/admin-stats/overview/');

  if (loading) return <Spinner full />;

  const d = data ?? {};

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Overview</h1>
          <p className="text-ink-muted text-sm mt-1">Platform health at a glance</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch}>↻ Refresh</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile icon={Users}    label="Total users"        value={d.users?.total ?? 0}              accent />
        <StatTile icon={Users}    label="Active subscribers" value={d.users?.active_subscribers ?? 0} />
        <StatTile icon={BarChart3} label="Est. prize pool"   value={fmt(d.prize_pool?.estimated_monthly)}  sub="This month" />
        <StatTile icon={Heart}    label="Est. charity total" value={fmt(d.charity?.estimated_monthly_total)} sub="This month" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Action queue */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pending verifications */}
          {(d.winners?.pending_verifications ?? 0) > 0 && (
            <Card className="border-accent/30 bg-accent/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold text-accent">
                    {d.winners.pending_verifications} proof{d.winners.pending_verifications !== 1 ? 's' : ''} awaiting review
                  </p>
                  <p className="text-ink-muted text-sm mt-0.5">Winners have uploaded screenshots for verification.</p>
                </div>
                <Link to="/admin/winners">
                  <Button variant="accent" size="sm">Review →</Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Pending payouts */}
          {(d.winners?.pending_payouts ?? 0) > 0 && (
            <Card className="border-status-info/30 bg-status-info/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold text-status-info">
                    {d.winners.pending_payouts} payout{d.winners.pending_payouts !== 1 ? 's' : ''} pending
                  </p>
                  <p className="text-ink-muted text-sm mt-0.5">Verified winners waiting to be paid.</p>
                </div>
                <Link to="/admin/winners">
                  <Button variant="secondary" size="sm">View →</Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Upcoming draw */}
          {d.draws?.upcoming ? (
            <Card>
              <p className="text-ink-muted text-xs uppercase tracking-widest mb-3">Upcoming draw</p>
              <p className="font-heading font-semibold text-ink text-lg">
                {new Date(d.draws.upcoming.year, d.draws.upcoming.month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </p>
              <p className="text-ink-muted text-sm capitalize mt-0.5">Status: {d.draws.upcoming.status}</p>
              <Link to="/admin/draws" className="mt-4 inline-block">
                <Button size="sm">Manage draw →</Button>
              </Link>
            </Card>
          ) : (
            <Card>
              <p className="text-ink-muted text-xs uppercase tracking-widest mb-3">Draws</p>
              <p className="text-ink text-sm">{d.draws?.total_published ?? 0} draws published all time.</p>
              <Link to="/admin/draws" className="mt-4 inline-block">
                <Button size="sm"><Gift size={14} /> Create this month's draw</Button>
              </Link>
            </Card>
          )}
        </div>

        {/* Quick links */}
        <div className="space-y-3">
          {[
            { to: '/admin/users',     icon: Users,    label: 'Manage users'     },
            { to: '/admin/draws',     icon: Gift,     label: 'Manage draws'     },
            { to: '/admin/charities', icon: Heart,    label: 'Manage charities' },
            { to: '/admin/winners',   icon: BarChart3,label: 'Verify winners'   },
          ].map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}>
              <div className="flex items-center gap-3 px-4 py-3 bg-bg-surface border border-line-subtle rounded-xl hover:border-brand/30 hover:bg-bg-raised transition-all group">
                <Icon size={16} className="text-ink-faint group-hover:text-brand transition-colors" />
                <span className="text-ink text-sm font-medium">{label}</span>
                <span className="ml-auto text-ink-faint group-hover:text-brand transition-colors">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
