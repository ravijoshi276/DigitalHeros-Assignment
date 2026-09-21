/* ── Card ─────────────────────────────────────────────────────────────────── */
export function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={`
        bg-bg-surface border border-line-subtle rounded-2xl p-6
        ${hover ? 'transition-all duration-200 hover:border-line hover:bg-bg-raised cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="font-heading font-semibold text-ink text-lg">{title}</h3>
        {subtitle && <p className="text-ink-muted text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────────── */
const badgeVariants = {
  green:   'bg-status-success/10 text-status-success border-status-success/20',
  amber:   'bg-status-warning/10 text-status-warning border-status-warning/20',
  red:     'bg-status-danger/10  text-status-danger  border-status-danger/20',
  blue:    'bg-status-info/10    text-status-info    border-status-info/20',
  muted:   'bg-bg-raised         text-ink-muted      border-line-subtle',
  brand:   'bg-brand/10          text-brand          border-brand/20',
};

export function Badge({ children, variant = 'muted', className = '' }) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5
        text-xs font-medium rounded-full border
        ${badgeVariants[variant]} ${className}
      `}
    >
      {children}
    </span>
  );
}

/* ── Input ───────────────────────────────────────────────────────────────── */
export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-ink-muted">{label}</label>
      )}
      <input
        className={`
          w-full bg-bg-raised border rounded-xl px-4 py-2.5
          text-ink placeholder:text-ink-faint text-sm
          transition-colors duration-150
          focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20
          ${error ? 'border-status-danger' : 'border-line-subtle'}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-status-danger">{error}</p>}
    </div>
  );
}

/* ── Spinner ─────────────────────────────────────────────────────────────── */
export default function Spinner({ full = false, size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  const spinner = (
    <span
      className={`${s} border-2 border-brand/20 border-t-brand rounded-full animate-spin block`}
    />
  );
  if (!full) return spinner;
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-base">
      {spinner}
    </div>
  );
}

/* ── Modal ───────────────────────────────────────────────────────────────── */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      {/* Panel */}
      <div
        className="relative bg-bg-surface border border-line-subtle rounded-2xl p-6 w-full max-w-md animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-semibold text-ink text-lg">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink transition-colors p-1 rounded-lg hover:bg-bg-raised"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Stat tile — used on dashboard + admin overview ─────────────────────── */
export function StatTile({ label, value, sub, icon: Icon, accent = false }) {
  return (
    <Card className={accent ? 'border-brand/30 bg-brand-faint' : ''}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ink-muted text-sm">{label}</p>
          <p className={`font-heading text-2xl font-bold mt-1 ${accent ? 'text-brand' : 'text-ink'}`}>
            {value}
          </p>
          {sub && <p className="text-ink-faint text-xs mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${accent ? 'bg-brand/20' : 'bg-bg-raised'}`}>
            <Icon size={18} className={accent ? 'text-brand' : 'text-ink-muted'} />
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-bg-raised border border-line-subtle flex items-center justify-center mb-4">
          <Icon size={24} className="text-ink-muted" />
        </div>
      )}
      <p className="font-heading font-semibold text-ink text-lg">{title}</p>
      {description && <p className="text-ink-muted text-sm mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
