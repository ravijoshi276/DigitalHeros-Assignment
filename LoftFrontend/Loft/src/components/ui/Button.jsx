/* Reusable button. Extend variants map to add new styles without touching JSX. */
const variants = {
  primary:   'bg-brand hover:bg-brand-dark text-bg-base font-semibold shadow-lg shadow-brand/20',
  secondary: 'bg-bg-raised border border-line text-ink hover:border-brand hover:text-brand',
  ghost:     'text-ink-muted hover:text-ink hover:bg-bg-raised',
  danger:    'bg-status-danger/10 border border-status-danger/30 text-status-danger hover:bg-status-danger/20',
  accent:    'bg-accent hover:bg-accent-dark text-bg-base font-semibold',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        transition-all duration-150 ease-out cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
