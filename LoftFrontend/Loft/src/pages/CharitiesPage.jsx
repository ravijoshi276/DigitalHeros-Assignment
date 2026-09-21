import { useEffect, useState } from 'react';
import { Search, Heart, ExternalLink, Calendar } from 'lucide-react';
import client from '../api/client';
import Navbar from '../components/layout/Navbar';
import { Card }   from '../components/ui/Card';
import { Badge }  from '../components/ui/Card';
import { Input }  from '../components/ui/Card';
import { Modal }  from '../components/ui/Card';
import { EmptyState } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { fmtDate } from '../utils/helpers';

export default function CharitiesPage() {
  const [all,       setAll]       = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [query,     setQuery]     = useState('');
  const [featured,  setFeatured]  = useState(false);
  const [selected,  setSelected]  = useState(null);   /* detail modal */

  useEffect(() => {
    const params = new URLSearchParams();
    if (query)    params.set('search', query);
    if (featured) params.set('is_featured', 'true');
    setLoading(true);
    client.get(`/charities/?${params}`)
      .then(r => setAll(r.data?.results ?? r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query, featured]);

  return (
    <div className="min-h-screen bg-bg-base font-body">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-20">
        {/* Header */}
        <div className="mb-10">
          <p className="text-brand text-sm font-medium tracking-widest uppercase mb-2">Giving back</p>
          <h1 className="font-heading text-4xl font-bold text-ink mb-2">Charity directory</h1>
          <p className="text-ink-muted">Every subscriber directs at least 10% of their fee to a cause they choose.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
            <input
              type="search"
              placeholder="Search charities…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="
                w-full bg-bg-raised border border-line-subtle rounded-xl
                pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-faint
                focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20
                transition-colors
              "
            />
          </div>
          <button
            onClick={() => setFeatured(p => !p)}
            className={`
              px-4 py-2.5 rounded-xl border text-sm transition-all
              ${featured
                ? 'bg-brand/10 border-brand/30 text-brand'
                : 'bg-bg-raised border-line-subtle text-ink-muted hover:border-line hover:text-ink'
              }
            `}
          >
            ★ Featured only
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : all.length === 0 ? (
          <EmptyState icon={Heart} title="No charities found" description="Try a different search term." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {all.map(c => (
              <Card key={c.id} hover onClick={() => setSelected(c)}>
                {/* Image */}
                <div className="w-full h-36 rounded-xl bg-bg-raised border border-line-subtle mb-4 overflow-hidden flex items-center justify-center">
                  {c.image
                    ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                    : <Heart size={28} className="text-ink-faint" />
                  }
                </div>

                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-heading font-semibold text-ink leading-tight">{c.name}</h3>
                  {c.is_featured && <Badge variant="brand">Featured</Badge>}
                </div>

                <p className="text-ink-muted text-sm leading-relaxed line-clamp-2 mb-3">{c.description}</p>

                <div className="flex items-center justify-between text-xs text-ink-faint">
                  <span>{c.subscriber_count ?? 0} supporters</span>
                  {c.events?.length > 0 && (
                    <span className="flex items-center gap-1"><Calendar size={11} />{c.events.length} event{c.events.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Charity detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''}>
        {selected && (
          <div className="space-y-4">
            {selected.image && (
              <img src={selected.image} alt={selected.name} className="w-full h-40 object-cover rounded-xl" />
            )}
            <p className="text-ink-muted text-sm leading-relaxed">{selected.description}</p>

            {selected.website && (
              <a
                href={selected.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-brand text-sm hover:underline"
              >
                <ExternalLink size={14} /> Visit website
              </a>
            )}

            {/* Upcoming events */}
            {selected.events?.length > 0 && (
              <div>
                <p className="text-ink text-sm font-semibold mb-2">Upcoming events</p>
                <div className="space-y-2">
                  {selected.events.map(ev => (
                    <div key={ev.id} className="bg-bg-raised border border-line-subtle rounded-xl px-4 py-3">
                      <p className="text-ink text-sm font-medium">{ev.title}</p>
                      <p className="text-ink-faint text-xs mt-0.5">
                        {fmtDate(ev.event_date)} {ev.location && `· ${ev.location}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
