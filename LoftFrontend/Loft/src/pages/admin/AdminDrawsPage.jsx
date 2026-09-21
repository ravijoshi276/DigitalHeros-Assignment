import { useState } from 'react';
import { ChevronDown, ChevronUp, Play, RefreshCw, Zap } from 'lucide-react';
import client from '../../api/client';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Badge, Card, EmptyState, Modal } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import { drawStatusVariant, fmt, monthName } from '../../utils/helpers';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ v: i + 1, l: new Date(2000, i).toLocaleString('en-GB', { month: 'long' }) }));
const thisYear  = new Date().getFullYear();
const thisMonth = new Date().getMonth() + 1;

/* Simulation result panel */
function SimResult({ result }) {
  if (!result) return null;
  return (
    <div className="mt-4 p-4 bg-status-info/5 border border-status-info/20 rounded-xl space-y-3 text-sm">
      <p className="font-semibold text-status-info">Simulation complete</p>
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-ink-muted">
        <span>Drawn numbers</span>
        <span className="font-mono text-ink">{result.drawn_numbers?.join(', ')}</span>
        <span>Total entries</span>   <span className="text-ink">{result.total_entries}</span>
        <span>Active subscribers</span> <span className="text-ink">{result.active_subscribers}</span>
        <span>Total prize pool</span> <span className="text-brand font-semibold">{fmt(result.total_prize_pool)}</span>
        {Number(result.rollover_applied) > 0 && (
          <><span>Rollover applied</span><span className="text-accent">{fmt(result.rollover_applied)}</span></>
        )}
      </div>
      <div className="pt-2 border-t border-line-subtle grid grid-cols-3 gap-3">
        {Object.entries(result.tiers ?? {}).map(([tier, t]) => (
          <div key={tier} className="text-center">
            <p className="text-ink-faint text-xs">{tier.replace('_', ' ')}</p>
            <p className="font-heading font-bold text-brand text-sm">{fmt(t.pool)}</p>
            <p className="text-ink-muted text-xs">{t.winners} winner{t.winners !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Single draw card with action buttons */
function DrawCard({ draw, onUpdate }) {
  const [expanded,  setExpanded]  = useState(false);
  const [running,   setRunning]   = useState(false);
  const [publishing,setPublishing]= useState(false);
  const [resetting, setResetting] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [err,       setErr]       = useState('');

  const act = async (action, setter) => {
    setErr('');
    setter(true);
    try {
      const { data } = await client.post(`/draws/admin/${draw.id}/${action}/`);
      if (action === 'run') setSimResult(data.summary);
      onUpdate();
    } catch (e) {
      setErr(e?.response?.data?.detail ?? `${action} failed.`);
    } finally {
      setter(false);
    }
  };

  return (
    <div className="border border-line-subtle rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-raised transition-colors text-left"
      >
        <div>
          <p className="font-heading font-semibold text-ink">{monthName(draw.month, draw.year)}</p>
          <p className="text-ink-faint text-xs capitalize">{draw.draw_type} draw</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={drawStatusVariant(draw.status)}>{draw.status}</Badge>
          {expanded ? <ChevronUp size={15} className="text-ink-faint" /> : <ChevronDown size={15} className="text-ink-faint" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-line-subtle px-5 py-4 bg-bg-raised space-y-4 animate-fade-in">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-ink-faint text-xs">Prize pool</p>
              <p className="font-heading font-bold text-brand">{fmt(draw.total_prize_pool)}</p>
            </div>
            <div>
              <p className="text-ink-faint text-xs">Subscribers</p>
              <p className="font-heading font-bold text-ink">{draw.active_subscriber_count}</p>
            </div>
            <div>
              <p className="text-ink-faint text-xs">Numbers</p>
              <p className="font-heading font-bold text-ink">
                {draw.drawn_numbers?.length > 0 ? draw.drawn_numbers.join(', ') : '—'}
              </p>
            </div>
          </div>

          {err && <p className="text-status-danger text-sm">{err}</p>}

          {simResult && <SimResult result={simResult} />}

          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            {draw.status === 'pending' && (
              <Button size="sm" loading={running} onClick={() => act('run', setRunning)}>
                <Play size={14} /> Run simulation
              </Button>
            )}
            {draw.status === 'simulated' && (
              <>
                <Button size="sm" loading={publishing} onClick={() => act('publish', setPublishing)}>
                  <Zap size={14} /> Publish results
                </Button>
                <Button variant="secondary" size="sm" loading={resetting} onClick={() => act('reset', setResetting)}>
                  <RefreshCw size={14} /> Reset & re-run
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDrawsPage() {
  const { data: draws, loading, refetch } = useApi('/draws/admin/');
  const [createModal, setCreateModal] = useState(false);
  const [form,   setForm]   = useState({ month: thisMonth, year: thisYear, draw_type: 'random' });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await client.post('/draws/admin/create/', form);
      refetch();
      setCreateModal(false);
    } catch (e) {
      setErr(e?.response?.data?.non_field_errors?.[0] ?? e?.response?.data?.detail ?? 'Failed to create draw.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Draws</h1>
          <p className="text-ink-muted text-sm mt-1">Create, simulate and publish monthly draws</p>
        </div>
        <Button size="sm" onClick={() => setCreateModal(true)}>+ New draw</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (draws ?? []).length === 0 ? (
        <EmptyState
          icon={Play}
          title="No draws yet"
          description="Create your first monthly draw to get started."
          action={<Button size="sm" onClick={() => setCreateModal(true)}>Create draw</Button>}
        />
      ) : (
        <div className="space-y-3">
          {(draws ?? []).map(d => <DrawCard key={d.id} draw={d} onUpdate={refetch} />)}
        </div>
      )}

      {/* Create modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create draw">
        <form onSubmit={create} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink-muted block mb-1.5">Month</label>
            <select
              value={form.month}
              onChange={e => setForm(p => ({ ...p, month: Number(e.target.value) }))}
              className="w-full bg-bg-raised border border-line-subtle rounded-xl px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-brand"
            >
              {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-ink-muted block mb-1.5">Year</label>
            <input
              type="number"
              value={form.year}
              min={2024}
              onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))}
              className="w-full bg-bg-raised border border-line-subtle rounded-xl px-4 py-2.5 text-ink text-sm focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink-muted block mb-1.5">Draw type</label>
            <div className="grid grid-cols-2 gap-3">
              {['random', 'algorithmic'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, draw_type: t }))}
                  className={`py-2.5 rounded-xl border text-sm capitalize transition-all ${form.draw_type === t ? 'border-brand bg-brand/10 text-brand' : 'border-line-subtle text-ink-muted hover:border-line'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-ink-faint text-xs mt-2">
              Algorithmic weights numbers by score frequency — more common scores are more likely to be drawn.
            </p>
          </div>

          {err && <p className="text-status-danger text-sm">{err}</p>}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={saving} className="flex-1">Create</Button>
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)} className="flex-1">Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
