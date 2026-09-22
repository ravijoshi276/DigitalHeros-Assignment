import { useState } from 'react';
import { CheckCircle, CreditCard, Eye, Users } from 'lucide-react';
import client from '../../api/client';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Badge, Card, EmptyState, Modal } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { fmt, fmtDate, fmtDateTime, payVariant, verifyVariant } from '../../utils/helpers';

/* ── Tab configuration ──────────────────────────────────────────────────── */
const TABS = [
  { id: 'needs_review',     label: 'Needs review',    url: '/winners/admin/pending-verification/', icon: Eye          },
  { id: 'pending_payment',  label: 'Pending payment', url: '/winners/admin/pending-payout/',       icon: CreditCard   },
  { id: 'all',              label: 'All winners',     url: '/winners/admin/',                       icon: Users        },
];

/* ── Single winner card ─────────────────────────────────────────────────── */
function WinnerCard({ winner: w, onVerify, onPay, payingId }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 flex-wrap">

        {/* Left: user + prize info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <p className="font-heading font-semibold text-ink">
              {w.user_name || w.user_email}
            </p>
            <Badge variant={verifyVariant(w.verification_status)}>
              {w.verification_status}
            </Badge>
            <Badge variant={payVariant(w.payment_status)}>
              {w.payment_status}
            </Badge>
          </div>

          <p className="text-ink-muted text-xs truncate mb-2">{w.user_email}</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="text-ink-faint">{w.draw_display}</span>
            <span className="text-brand font-medium">{w.tier_display}</span>
            <span className="font-heading font-bold text-ink text-lg">{fmt(w.amount)}</span>
          </div>

          {/* Admin note bubble */}
          {w.admin_notes && (
            <p className="mt-2 text-xs text-ink-muted bg-bg-raised border border-line-subtle rounded-lg px-3 py-2">
              <span className="text-ink-faint">Note: </span>{w.admin_notes}
            </p>
          )}

          <p className="text-ink-faint text-xs mt-2">{fmtDate(w.created_at)}</p>
        </div>

        {/* Right: action buttons */}
        <div className="flex gap-2 shrink-0 flex-wrap">
          {/* View proof */}
          {w.proof_image && (
            <a
              href={w.proof_image}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="sm" title="Open proof image">
                <Eye size={14} /> Proof
              </Button>
            </a>
          )}

          {/* Review button — when proof uploaded but not yet decided */}
          {w.proof_image && w.verification_status === 'pending' && (
            <Button size="sm" onClick={() => onVerify(w)}>
              Review →
            </Button>
          )}

          {/* No proof yet — informational badge */}
          {!w.proof_image && w.verification_status === 'pending' && (
            <span className="text-ink-faint text-xs self-center italic">Awaiting proof</span>
          )}

          {/* Mark paid — only after approval */}
          {w.verification_status === 'approved' && w.payment_status === 'pending' && (
            <Button
              variant="accent"
              size="sm"
              loading={payingId === w.id}
              onClick={() => onPay(w.id)}
            >
              <CreditCard size={14} /> Mark paid
            </Button>
          )}
        </div>
      </div>

      {/* Proof thumbnail — shown in "needs review" tab only */}
      {w.proof_image && w.verification_status === 'pending' && (
        <div className="mt-4 pt-4 border-t border-line-subtle">
          <p className="text-ink-muted text-xs uppercase tracking-widest mb-2">Proof screenshot</p>
          <a href={w.proof_image} target="_blank" rel="noopener noreferrer">
            <img
              src={w.proof_image}
              alt="Score proof"
              className="max-h-40 rounded-xl border border-line-subtle object-contain hover:opacity-80 transition-opacity"
            />
          </a>
        </div>
      )}
    </Card>
  );
}

/* ── Verify modal ───────────────────────────────────────────────────────── */
function VerifyModal({ winner, onClose, onDone }) {
  const [decision,  setDecision]  = useState('approved');
  const [notes,     setNotes]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [err,       setErr]       = useState('');

  const submit = async () => {
    if (decision === 'rejected' && !notes.trim()) {
      setErr('A rejection reason is required.'); return;
    }
    setErr(''); setLoading(true);
    try {
      await client.patch(`/winners/admin/${winner.id}/verify/`, { decision, notes });
      onDone();
    } catch (e) {
      const d = e?.response?.data ?? {};
      setErr(d.detail ?? d.notes?.[0] ?? 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={!!winner} onClose={onClose} title="Review winner proof">
      {winner && (
        <div className="space-y-4">

          {/* Winner summary */}
          <div className="bg-bg-raised border border-line-subtle rounded-xl p-4">
            <p className="font-semibold text-ink">{winner.user_name || winner.user_email}</p>
            <p className="text-ink-muted text-sm">{winner.draw_display} · {winner.tier_display}</p>
            <p className="font-heading font-bold text-brand text-2xl mt-1">{fmt(winner.amount)}</p>
          </div>

          {/* Proof image */}
          {winner.proof_image && (
            <div>
              <p className="text-ink-muted text-xs uppercase tracking-widest mb-2">Submitted proof</p>
              <a href={winner.proof_image} target="_blank" rel="noopener noreferrer">
                <img
                  src={winner.proof_image}
                  alt="Proof"
                  className="w-full max-h-52 object-contain rounded-xl border border-line-subtle hover:opacity-90 transition-opacity"
                />
                <p className="text-ink-faint text-xs text-center mt-1">Click to open full size ↗</p>
              </a>
            </div>
          )}

          {/* Decision picker */}
          <div>
            <p className="text-ink-muted text-xs uppercase tracking-widest mb-2">Your decision</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'approved', label: '✓ Approve', active: 'border-status-success/40 bg-status-success/10 text-status-success' },
                { val: 'rejected', label: '✕ Reject',  active: 'border-status-danger/40  bg-status-danger/10  text-status-danger'  },
              ].map(({ val, label, active }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDecision(val)}
                  className={`
                    py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${decision === val ? active : 'border-line-subtle text-ink-muted hover:border-line hover:text-ink'}
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-ink-muted block mb-1.5">
              {decision === 'rejected' ? 'Rejection reason *' : 'Internal notes (optional)'}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder={
                decision === 'rejected'
                  ? 'Explain clearly why this proof was rejected…'
                  : 'Anything to note about this payout…'
              }
              className="
                w-full bg-bg-raised border border-line-subtle rounded-xl px-4 py-2.5
                text-ink text-sm placeholder:text-ink-faint resize-none
                focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors
              "
            />
          </div>

          {err && (
            <p className="text-sm text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-4 py-3">
              {err}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button className="flex-1" loading={loading} onClick={submit}>
              Confirm {decision}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function AdminWinnersPage() {
  const [activeTab, setActiveTab] = useState('needs_review');

  const tabCfg = TABS.find(t => t.id === activeTab);
  const { data: winners, loading, refetch } = useApi(tabCfg.url);

  const [verifying, setVerifying] = useState(null);   /* winner object | null */
  const [payingId,  setPayingId]  = useState(null);

  const markPaid = async (id) => {
    setPayingId(id);
    try {
      await client.patch(`/winners/admin/${id}/mark-paid/`);
      refetch();
    } catch { /* silently refetch */ refetch(); }
    finally { setPayingId(null); }
  };

  /* Count badges */
  const counts = {
    needs_review:    (winners ?? []).length,
    pending_payment: (winners ?? []).length,
    all:             (winners ?? []).length,
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-ink">Winners</h1>
        <p className="text-ink-muted text-sm mt-1">
          Verify proof screenshots and record prize payouts
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-bg-surface border border-line-subtle rounded-2xl p-1.5 mb-6 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${active
                  ? 'bg-bg-raised text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink'
                }
              `}
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (winners ?? []).length === 0 ? (
        <EmptyState
          icon={CheckCircle}
          title={`Nothing in "${tabCfg.label}"`}
          description={
            activeTab === 'needs_review'
              ? 'No winners have uploaded proof yet.'
              : activeTab === 'pending_payment'
              ? 'All verified winners have been paid.'
              : 'No draws have been published yet.'
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Stats strip */}
          <div className="flex items-center gap-2 text-ink-faint text-sm mb-2">
            <span>{(winners ?? []).length} record{(winners ?? []).length !== 1 ? 's' : ''}</span>
          </div>

          {(winners ?? []).map(w => (
            <WinnerCard
              key={w.id}
              winner={w}
              onVerify={setVerifying}
              onPay={markPaid}
              payingId={payingId}
            />
          ))}
        </div>
      )}

      {/* Verify modal */}
      <VerifyModal
        winner={verifying}
        onClose={() => setVerifying(null)}
        onDone={() => { setVerifying(null); refetch(); }}
      />
    </div>
  );
}
