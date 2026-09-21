import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { Badge, EmptyState } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { fmtDate, subStatusVariant } from '../../utils/helpers';

export default function AdminUsersPage() {
  const { data: users, loading } = useApi('/admin-stats/users/');
  const [query, setQuery] = useState('');

  const filtered = (users ?? []).filter(u =>
    !query ||
    u.email.toLowerCase().includes(query.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Users</h1>
          <p className="text-ink-muted text-sm mt-1">{users?.length ?? 0} total accounts</p>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
          <input
            placeholder="Search by email or name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="bg-bg-raised border border-line-subtle rounded-xl pl-9 pr-4 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-brand w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="No users found" description="Try a different search." />
      ) : (
        <div className="bg-bg-surface border border-line-subtle rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b border-line-subtle text-ink-faint text-xs uppercase tracking-widest">
            <span>User</span>
            <span>Status</span>
            <span>Plan</span>
            <span>Joined</span>
            <span>Staff</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-line-subtle">
            {filtered.map(u => (
              <div
                key={u.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-5 py-4 hover:bg-bg-raised transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-ink text-sm font-medium truncate">{u.first_name} {u.last_name}</p>
                  <p className="text-ink-faint text-xs truncate">{u.email}</p>
                </div>
                <Badge variant={subStatusVariant(u.subscription_status ?? 'inactive')}>
                  {u.subscription_status ?? 'none'}
                </Badge>
                <span className="text-ink-muted text-sm capitalize">{u.subscription_plan ?? '—'}</span>
                <span className="text-ink-muted text-sm">{fmtDate(u.date_joined)}</span>
                <span className="text-xs">{u.is_staff ? '🔐' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
