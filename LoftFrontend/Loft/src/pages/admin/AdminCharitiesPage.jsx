import { useRef, useState } from 'react';
import { Edit2, Heart, ImagePlus, Star, Trash2 } from 'lucide-react';
import client from '../../api/client';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Badge, Card, EmptyState, Input, Modal } from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';

const BLANK = {
  name: '', description: '', website: '',
  is_featured: false, is_active: true,
};

/* ── Form shared by add + edit modals ──────────────────────────────────────── */
function CharityForm({ form, setForm, image, imageRef, onImagePick, err, saving, onSubmit, onCancel, isEdit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        label="Charity name"
        value={form.name}
        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        placeholder="Full legal name"
        required
      />

      <div>
        <label className="text-sm font-medium text-ink-muted block mb-1.5">Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          rows={3}
          required
          placeholder="What does this charity do?"
          className="
            w-full bg-bg-raised border border-line-subtle rounded-xl px-4 py-2.5
            text-ink text-sm placeholder:text-ink-faint resize-none
            focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors
          "
        />
      </div>

      <Input
        label="Website URL"
        type="url"
        value={form.website}
        onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
        placeholder="https://example.org"
      />

      {/* Image picker */}
      <div>
        <label className="text-sm font-medium text-ink-muted block mb-1.5">Image</label>
        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={onImagePick} />
        <button
          type="button"
          onClick={() => imageRef.current?.click()}
          className="
            w-full py-3 border border-dashed border-line-subtle rounded-xl
            text-sm text-ink-muted hover:border-brand hover:text-brand
            flex items-center justify-center gap-2 transition-all
          "
        >
          <ImagePlus size={15} />
          {image ? image.name : isEdit ? 'Replace image (optional)' : 'Upload image (optional)'}
        </button>
      </div>

      {/* Checkboxes */}
      <div className="flex gap-6">
        {[
          { key: 'is_featured', label: 'Featured on homepage' },
          { key: 'is_active',   label: 'Active in directory'  },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
              className="w-4 h-4 rounded accent-brand"
            />
            <span className="text-ink-muted text-sm">{label}</span>
          </label>
        ))}
      </div>

      {err && (
        <p className="text-sm text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-4 py-3">
          {err}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={saving} className="flex-1">
          {isEdit ? 'Save changes' : 'Add charity'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function AdminCharitiesPage() {
  /* Data */
  const { data: charities, loading, refetch } = useApi('/charities/');

  /* Modal state */
  const [modal,  setModal]  = useState(null);   /* null | 'add' | charity-object */
  const [form,   setForm]   = useState(BLANK);
  const [image,  setImage]  = useState(null);   /* File | null */
  const imageRef = useRef();

  /* Action state */
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  /* ── Open modals ──────────────────────────────────────────────────────── */
  const openAdd = () => {
    setForm(BLANK); setImage(null); setErr('');
    setModal('add');
  };
  const openEdit = (c) => {
    setForm({
      name:        c.name,
      description: c.description,
      website:     c.website ?? '',
      is_featured: c.is_featured,
      is_active:   c.is_active ?? true,
    });
    setImage(null); setErr('');
    setModal(c);
  };
  const closeModal = () => setModal(null);

  /* ── Save (add or edit) ───────────────────────────────────────────────── */
  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.description.trim()) {
      setErr('Name and description are required.'); return;
    }
    setSaving(true); setErr('');

    /* Use FormData so image upload works alongside JSON fields */
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (image) fd.append('image', image);

    try {
      if (modal === 'add') {
        await client.post('/charities/admin/', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await client.patch(`/charities/admin/${modal.id}/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      refetch();
      closeModal();
    } catch (e) {
      const d = e?.response?.data ?? {};
      setErr(d.name?.[0] ?? d.detail ?? 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ───────────────────────────────────────────────────────────── */
  const del = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    setDeletingId(c.id);
    try {
      await client.delete(`/charities/admin/${c.id}/`);
      refetch();
    } catch {
      /* Silently refetch — backend may reject if charity has subscribers */
      refetch();
    } finally {
      setDeletingId(null);
    }
  };

  /* ── Toggle featured ──────────────────────────────────────────────────── */
  const toggleFeatured = async (c) => {
    setTogglingId(c.id);
    try {
      const fd = new FormData();
      fd.append('is_featured', !c.is_featured);
      /* Also re-send required fields so the serializer is happy */
      fd.append('name',        c.name);
      fd.append('description', c.description);
      await client.patch(`/charities/admin/${c.id}/`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      refetch();
    } catch { /* ignore */ }
    finally { setTogglingId(null); }
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-5xl mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-ink">Charities</h1>
          <p className="text-ink-muted text-sm mt-1">
            {charities?.length ?? 0} active &nbsp;·&nbsp; subscribers choose one at sign-up
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          + Add charity
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (charities ?? []).length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No charities yet"
          description="Add at least one charity so subscribers can donate."
          action={<Button size="sm" onClick={openAdd}>Add charity</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(charities ?? []).map(c => (
            <Card key={c.id}>
              {/* Image */}
              <div className="w-full h-28 rounded-xl bg-bg-raised border border-line-subtle mb-4 overflow-hidden flex items-center justify-center">
                {c.image
                  ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                  : <Heart size={22} className="text-ink-faint" />
                }
              </div>

              {/* Name + badges */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-heading font-semibold text-ink text-sm leading-snug flex-1">
                  {c.name}
                </h3>
                <div className="flex gap-1.5 shrink-0">
                  {c.is_featured && <Badge variant="brand">Featured</Badge>}
                </div>
              </div>

              <p className="text-ink-muted text-xs leading-relaxed line-clamp-2 mb-3">
                {c.description}
              </p>

              <p className="text-ink-faint text-xs mb-4">
                {c.subscriber_count ?? 0} supporter{(c.subscriber_count ?? 0) !== 1 ? 's' : ''}
              </p>

              {/* Action row */}
              <div className="flex gap-2">
                {/* Edit */}
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(c)}
                >
                  <Edit2 size={13} /> Edit
                </Button>

                {/* Toggle featured */}
                <button
                  onClick={() => toggleFeatured(c)}
                  disabled={togglingId === c.id}
                  title={c.is_featured ? 'Remove from featured' : 'Mark as featured'}
                  className={`
                    p-2 rounded-xl border transition-all text-sm
                    ${c.is_featured
                      ? 'border-brand/30 bg-brand/10 text-brand'
                      : 'border-line-subtle text-ink-faint hover:border-brand/30 hover:text-brand hover:bg-brand/5'
                    }
                    disabled:opacity-40
                  `}
                >
                  {togglingId === c.id
                    ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin block" />
                    : <Star size={14} />
                  }
                </button>

                {/* Delete */}
                <button
                  onClick={() => del(c)}
                  disabled={deletingId === c.id}
                  title="Delete charity"
                  className="
                    p-2 rounded-xl border border-line-subtle text-ink-faint
                    hover:border-status-danger/30 hover:text-status-danger hover:bg-status-danger/5
                    transition-all disabled:opacity-40
                  "
                >
                  {deletingId === c.id
                    ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin block" />
                    : <Trash2 size={14} />
                  }
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal === 'add' ? 'Add charity' : `Edit — ${modal?.name ?? ''}`}
      >
        <CharityForm
          form={form}
          setForm={setForm}
          image={image}
          imageRef={imageRef}
          onImagePick={e => setImage(e.target.files?.[0] ?? null)}
          err={err}
          saving={saving}
          onSubmit={save}
          onCancel={closeModal}
          isEdit={modal !== 'add'}
        />
      </Modal>
    </div>
  );
}
