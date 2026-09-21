import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Card';

export default function LoginPage() {
  const { login }  = useAuth();
  const nav        = useNavigate();
  const location   = useLocation();
  const destination = location.state?.from?.pathname ?? '/dashboard';

  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      nav(destination, { replace: true });
    } catch (err) {
      const msg = err?.response?.data;
      setError(msg?.detail ?? msg?.non_field_errors?.[0] ?? 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-bg-surface border-r border-line-subtle p-12">
        <Link to="/" className="font-heading font-semibold text-ink text-xl">
          digital.<span className="text-brand">HEROES</span>
        </Link>
        <div>
          <p className="font-heading text-4xl font-bold text-ink leading-tight mb-4">
            Welcome<br />back.
          </p>
          <p className="text-ink-muted text-sm leading-relaxed">
            Sign in to track your scores, check your draw entries and see your prize history.
          </p>
        </div>
        {/* Decorative grid of score numbers */}
        <div className="grid grid-cols-5 gap-2 opacity-20 select-none">
          {Array.from({ length: 25 }, (_, i) => (i * 2) + 1).map(n => (
            <div key={n} className="w-8 h-8 rounded-lg bg-brand/30 flex items-center justify-center text-brand text-xs font-mono">
              {n}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden block mb-8 font-heading font-semibold text-ink text-lg">
            digital.<span className="text-brand">HEROES</span>
          </Link>

          <h1 className="font-heading text-2xl font-bold text-ink mb-1">Sign in</h1>
          <p className="text-ink-muted text-sm mb-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand hover:underline">Create one free</Link>
          </p>

          <form onSubmit={submit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-sm text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-center text-ink-faint text-xs mt-8">
            <Link to="/pricing" className="hover:text-ink-muted transition-colors">
              View pricing & plans →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
