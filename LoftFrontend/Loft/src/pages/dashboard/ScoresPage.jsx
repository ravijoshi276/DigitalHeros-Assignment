import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Plus, Trash2, X } from 'lucide-react';
import client from '../../api/client';
import { useSubscription } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Card, EmptyState, Input, Modal } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { fmtDate, pct } from '../../utils/helpers';

const MAX = 5;    /* rolling max scores */
const STABLEFORD_MAX = 45;

const today = () => new Date().toISOString().split('T')[0];

function ScoreBar({ score }) {
  const pctVal = pct(score, STABLEFORD_MAX);
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-bg-raised overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-all duration-500"
          style={{ width: `${pctVal}%` }}
        />
      </div>
      <span className="text-ink-faint text-xs w-12 text-right">{pctVal}%</span>
    </div>
  );
}

export default function ScoresPage() {
  const { sub }              = useSubscription();
  const [scores,  setScores]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);  /* null | 'add' | score object */
  const [form,    setForm]    = useState({ score: '', date: today() });
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [delId,   setDelId]   = useState(null);

  const load = () => {
    setLoading(true);
    client.get('/scores/')
      .then(r => setScores(r.data?.results ?? r.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd  = ()  => { setForm({ score: '', date: today() }); setErrors({}); setModal('add'); };
  const openEdit = (s) => { setForm({ score: String(s.score), date: s.date }); setErrors({}); setModal(s); };
  const closeModal = () => setModal(null);

  const validate = () => {
    const e = {};
    const n = Number(form.score);
    if (!form.score || isNaN(n)) e.score = 'Enter a number';
    else if (n < 1 || n > STABLEFORD_MAX) e.score = `Must be 1–${STABLEFORD_MAX}`;
    if (!form.date) e.date = 'Date is required';
    return e;
  };

  const save = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const body = { score: Number(form.score), date: form.date };
      if (modal === 'add') {
        await client.post('/scores/', body);
      } else {
        await client.patch(`/scores/${modal.id}/`, body);
      }
      load();
      closeModal();
    } catch (err) {
      const data = err?.response?.data ?? {};
      setErrors({
        score: data.score?.[0],
        date:  data.date?.[0] ?? data.non_field_errors?.[0],
      });
    } finally {
      setSaving(false);
    }
  };

  const del = async (id) => {
    setDelId(id);
    try { await client.delete(`/scores/${id}/`); load(); }
    catch { /* show nothing — load will refresh */ }
    finally { setDelId(null); }
  };

  const isActive = sub?.status === 'active';

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">My Scores</h1>
          <p className="text-ink-muted text-sm mt-1">
            Stableford format · 1–{STABLEFORD_MAX} pts · Last {MAX} kept
          </p>
        </div>
        {isActive && (
          <Button onClick={openAdd} disabled={scores.length === 0 && !isActive} size="sm">
            <Plus size={16} /> Add score
          </Button>
        )}
      </div>

      {/* No subscription gate */}
      {!isActive && (
        <Card className="text-center mb-8 border-accent/20 bg-accent/5">
          <p className="font-heading font-semibold text-accent mb-1">Subscription required</p>
          <p className="text-ink-muted text-sm mb-4">Score tracking is available to active subscribers.</p>
          <Link to="/pricing"><Button variant="accent" size="sm">Subscribe →</Button></Link>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <Card>
          {/* Capacity bar */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-ink-muted text-xs uppercase tracking-widest">Score entries</p>
            <div className="flex gap-1">
              {Array.from({ length: MAX }).map((_, i) => (
                <span
                  key={i}
                  className={`w-5 h-1.5 rounded-full transition-colors ${i < scores.length ? 'bg-brand' : 'bg-bg-raised'}`}
                />
              ))}
            </div>
          </div>

          {scores.length === 0 ? (
            <EmptyState
              icon={Plus}
              title="No scores yet"
              description="Add your first Stableford score to enter monthly draws."
              action={isActive && <Button onClick={openAdd} size="sm"><Plus size={14} />Add score</Button>}
            />
          ) : (
            <div className="space-y-3">
              {scores.map((s, idx) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-bg-raised border border-line-subtle group"
                >
                  {/* Rank */}
                  <span className="text-ink-faint text-xs w-4 shrink-0">{idx + 1}</span>

                  {/* Score badge */}
                  <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
                    <span className="font-heading font-bold text-brand text-lg">{s.score}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-ink-faint text-xs mb-1">{fmtDate(s.date)}</p>
                    <ScoreBar score={s.score} />
                  </div>

                  {/* Actions */}
                  {isActive && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 rounded-lg hover:bg-bg-base text-ink-faint hover:text-ink transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => del(s.id)}
                        disabled={delId === s.id}
                        className="p-1.5 rounded-lg hover:bg-status-danger/10 text-ink-faint hover:text-status-danger transition-colors"
                      >
                        {delId === s.id
                          ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin block" />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Rolling note */}
          {scores.length === MAX && isActive && (
            <p className="text-ink-faint text-xs mt-4 text-center">
              Maximum reached — the oldest score will be replaced when you add a new one.
            </p>
          )}
        </Card>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'add' ? 'Add score' : 'Edit score'}
      >
        <form onSubmit={save} className="space-y-4">
          <Input
            label={`Score (1–${STABLEFORD_MAX} Stableford)`}
            type="number"
            min={1}
            max={STABLEFORD_MAX}
            value={form.score}
            onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
            error={errors.score}
            required
            autoFocus
          />
          <Input
            label="Date played"
            type="date"
            value={form.date}
            max={today()}
            onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
            error={errors.date}
            required
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">Save</Button>
            <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
