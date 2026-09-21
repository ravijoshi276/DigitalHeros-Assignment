import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Card';

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    password: '', re_password: '',
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.first_name) e.first_name = 'Required';
    if (!form.last_name)  e.last_name  = 'Required';
    if (!form.email)      e.email      = 'Required';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.re_password) e.re_password = 'Passwords do not match';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await register(form);
      nav('/dashboard', { replace: true });
    } catch (err) {
      const data = err?.response?.data ?? {};
      /* Map Django field errors to our form errors */
      const mapped = {};
      Object.entries(data).forEach(([k, v]) => {
        mapped[k] = Array.isArray(v) ? v[0] : v;
      });
      setErrors(mapped);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 bg-bg-surface border-r border-line-subtle p-12">
        <Link to="/" className="font-heading font-semibold text-ink text-xl">
          digital.<span className="text-brand">HEROES</span>
        </Link>
        <div className="space-y-6">
          {[
            { n: '£9.99', label: 'per month' },
            { n: '10%',   label: 'minimum to charity' },
            { n: '3',     label: 'prize tiers per draw' },
          ].map(({ n, label }) => (
            <div key={label}>
              <p className="font-heading text-3xl font-bold text-brand">{n}</p>
              <p className="text-ink-muted text-sm">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-ink-faint text-xs">Cancel anytime · Secure payments via Stripe</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          <Link to="/" className="lg:hidden block mb-8 font-heading font-semibold text-ink text-lg">
            digital.<span className="text-brand">HEROES</span>
          </Link>

          <h1 className="font-heading text-2xl font-bold text-ink mb-1">Create account</h1>
          <p className="text-ink-muted text-sm mb-8">
            Already have one?{' '}
            <Link to="/login" className="text-brand hover:underline">Sign in</Link>
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" value={form.first_name} onChange={set('first_name')} error={errors.first_name} required />
              <Input label="Last name"  value={form.last_name}  onChange={set('last_name')}  error={errors.last_name}  required />
            </div>
            <Input label="Email"   type="email"    value={form.email}       onChange={set('email')}       error={errors.email}       required />
            <Input label="Phone"   type="tel"      value={form.phone}       onChange={set('phone')}       placeholder="Optional" />
            <Input label="Password" type="password" value={form.password}   onChange={set('password')}   error={errors.password}   required />
            <Input label="Confirm password" type="password" value={form.re_password} onChange={set('re_password')} error={errors.re_password} required />

            {errors.non_field_errors && (
              <p className="text-sm text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-xl px-4 py-3">
                {errors.non_field_errors}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Create account
            </Button>
          </form>

          <p className="text-center text-ink-faint text-xs mt-6 leading-relaxed">
            By continuing you agree to our Terms of Service.
            You'll choose a subscription plan after sign-up.
          </p>
        </div>
      </div>
    </div>
  );
}
