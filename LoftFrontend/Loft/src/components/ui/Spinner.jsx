/* Standalone Spinner component — used in ProtectedRoute and page loading states */
export default function Spinner({ full = false, size = 'md' }) {
  const dim = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  const el = (
    <span className={`${dim} border-2 border-brand/20 border-t-brand rounded-full animate-spin block`} />
  );
  if (!full) return el;
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-base">{el}</div>
  );
}
