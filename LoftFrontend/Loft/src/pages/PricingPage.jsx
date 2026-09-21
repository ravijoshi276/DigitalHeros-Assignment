import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';

const features = [
  'Monthly prize draw entry',
  'Golf score tracking (Stableford)',
  'Charity donation allocation',
  'Draw history & results',
  'Winner verification portal',
];

const plans = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: '£9.99',
    period: 'per month',
    note: 'Cancel any time',
    highlight: false,
  },
  {
    id: 'yearly',
    label: 'Yearly',
    price: '£99.99',
    period: 'per year',
    note: 'Save ~17% vs monthly',
    highlight: true,
  },
];

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);   /* which plan is loading */
  const [error,   setError]   = useState('');

  const subscribe = async (plan) => {
    if (!user) { window.location.href = '/register'; return; }
    setError('');
    setLoading(plan);
    try {
      const { data } = await client.post('/subscriptions/create-checkout/', { plan });
      window.location.href = data.checkout_url;   /* redirect to Stripe */
    } catch (e) {
      setError(e?.response?.data?.error ?? 'Could not start checkout. Try again.');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base font-body">
      <Navbar />

      <div className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        <div className="text-center mb-16">
          <p className="text-brand text-sm font-medium tracking-widest uppercase mb-3">Pricing</p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-ink mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-ink-muted text-lg">
            One platform. Monthly draws. Real charitable impact.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`
                relative rounded-2xl border p-8 flex flex-col
                ${plan.highlight
                  ? 'border-brand bg-brand/5'
                  : 'border-line-subtle bg-bg-surface'
                }
              `}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-bg-base text-xs font-semibold px-3 py-1 rounded-full font-heading">
                  Best value
                </span>
              )}

              <div className="mb-6">
                <p className="text-ink-muted text-sm font-medium mb-3">{plan.label}</p>
                <div className="flex items-end gap-1">
                  <span className="font-heading text-4xl font-bold text-ink">{plan.price}</span>
                  <span className="text-ink-muted text-sm mb-1.5">{plan.period}</span>
                </div>
                <p className="text-ink-faint text-xs mt-1">{plan.note}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {features.map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm text-ink-muted">
                    <Check size={15} className="text-brand shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlight ? 'primary' : 'secondary'}
                size="lg"
                className="w-full"
                loading={loading === plan.id}
                onClick={() => subscribe(plan.id)}
              >
                {user ? 'Subscribe now' : 'Get started'}
              </Button>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-status-danger text-sm bg-status-danger/10 border border-status-danger/20 rounded-xl p-4">
            {error}
          </p>
        )}

        <p className="text-center text-ink-faint text-sm mt-8">
          Not subscribed yet?{' '}
          <Link to="/register" className="text-brand hover:underline">Create a free account</Link>
          {' '}first, then choose your plan.
        </p>
      </div>
    </div>
  );
}
