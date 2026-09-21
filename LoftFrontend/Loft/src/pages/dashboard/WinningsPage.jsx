import { useRef, useState } from 'react';
import { Gift, Upload } from 'lucide-react';
import client from '../../api/client';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Badge, Card, EmptyState, Modal, StatTile } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { fmt, fmtDate, payVariant, tierLabel, verifyVariant } from '../../utils/helpers';

export default function WinningsPage() {
  const { data: wins, loading, refetch } = useApi('/winners/mine/');
  const [selected,  setSelected]  = useState(null);   /* win selected for proof upload */
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef();

  const totalWon    = (wins ?? []).reduce((s, w) => s + Number(w.amount), 0);
  const totalPaid   = (wins ?? []).filter(w => w.payment_status === 'paid').reduce((s, w) => s + Number(w.amount), 0);
  const pendingVerif = (wins ?? []).filter(w => w.verification_status === 'pending').length;

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setUploadErr('');
    setUploading(true);
    const fd = new FormData();
    fd.append('proof_image', file);
    try {
      await client.patch(`/winners/${selected.id}/upload-proof/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      refetch();
      setSelected(null);
    } catch (err) {
      setUploadErr(err?.response?.data?.proof_image?.[0] ?? 'Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Spinner full />;

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-ink">Winnings</h1>
        <p className="text-ink-muted text-sm mt-1">Your prize history and payout status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatTile icon={Gift} label="Total won"         value={fmt(totalWon)}  accent />
        <StatTile icon={Gift} label="Total paid out"    value={fmt(totalPaid)} />
        <StatTile icon={Gift} label="Pending proof"     value={pendingVerif}   sub={pendingVerif > 0 ? 'Action needed' : 'All clear'} />
      </div>

      {/* Wins list */}
      {wins?.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="No winnings yet"
          description="Enter draws by keeping your scores up to date. Match 3, 4 or 5 drawn numbers to win."
        />
      ) : (
        <div className="space-y-4">
          {wins.map(w => (
            <Card key={w.id}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-ink-muted text-xs uppercase tracking-widest mb-1">{w.draw_display}</p>
                  <p className="font-heading font-bold text-ink text-xl">{fmt(w.amount)}</p>
                  <p className="text-brand text-sm mt-0.5">{tierLabel[w.prize_tier] ?? w.prize_tier}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={verifyVariant(w.verification_status)}>
                    {w.verification_status_display}
                  </Badge>
                  <Badge variant={payVariant(w.payment_status)}>
                    {w.payment_status_display}
                  </Badge>
                </div>
              </div>

              {/* Proof upload CTA — only when not yet approved */}
              {w.verification_status !== 'approved' && (
                <div className="mt-4 pt-4 border-t border-line-subtle flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-ink text-sm font-medium">Proof of scores required</p>
                    <p className="text-ink-muted text-xs mt-0.5">
                      {w.proof_image
                        ? 'Proof uploaded — awaiting admin review.'
                        : 'Upload a screenshot from your golf platform showing your scores.'}
                    </p>
                  </div>
                  {!w.proof_image && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { setSelected(w); setUploadErr(''); }}
                    >
                      <Upload size={14} /> Upload proof
                    </Button>
                  )}
                </div>
              )}

              {/* Rejection note */}
              {w.verification_status === 'rejected' && w.admin_notes && (
                <div className="mt-3 px-4 py-3 bg-status-danger/5 border border-status-danger/20 rounded-xl">
                  <p className="text-status-danger text-xs font-medium">Rejection reason</p>
                  <p className="text-ink-muted text-sm mt-0.5">{w.admin_notes}</p>
                </div>
              )}

              <p className="text-ink-faint text-xs mt-3">{fmtDate(w.created_at)}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Upload proof modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Upload score proof">
        {selected && (
          <div className="space-y-4">
            <p className="text-ink-muted text-sm">
              Upload a screenshot from your golf platform showing the scores that match your
              <span className="text-brand font-medium"> {tierLabel[selected.prize_tier] ?? selected.prize_tier}</span> win
              of <span className="text-brand font-medium">{fmt(selected.amount)}</span>.
            </p>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={upload}
            />

            {uploadErr && (
              <p className="text-sm text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-4 py-3">
                {uploadErr}
              </p>
            )}

            <Button
              className="w-full"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} /> Choose screenshot
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
