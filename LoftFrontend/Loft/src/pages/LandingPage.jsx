import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Shield, Trophy } from 'lucide-react';
import client from '../api/client';
import Navbar from '../components/layout/Navbar';
import Button from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const steps = [
  {
    icon: Shield,
    title: 'Subscribe',
    body: 'Choose monthly or yearly. A portion of every subscription goes directly to your chosen charity.',
  },
  {
    icon: Trophy,
    title: 'Score & Enter',
    body: 'Log your last 5 Stableford scores. Your scores become your lottery numbers — performance matters.',
  },
  {
    icon: Heart,
    title: 'Win & Give',
    body: 'Monthly draws award cash prizes across three tiers. Unclaimed jackpots roll over to the next draw.',
  },
];

export default function LandingPage() {
  const [charities,   setCharities]   = useState([]);
  const [currentDraw, setCurrentDraw] = useState(null);

  useEffect(() => {
    client.get('/charities/featured/').then(r => setCharities(r.data.results ?? r.data)).catch(() => {});
    client.get('/draws/current/').then(r => setCurrentDraw(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-bg-base font-body">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-brand border border-brand/20 bg-brand/5 px-3 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-slow" />
            Monthly draws · Active now
          </span>

          <h1 className="font-heading text-5xl md:text-7xl font-bold text-ink leading-[1.05] mb-6">
            Score big.<br />
            <span className="text-gradient">Give back.</span>
          </h1>

          <p className="text-ink-muted text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            A golf subscription platform where your scores enter you into monthly prize draws —
            and every subscription supports a charity you choose.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register">
              <Button size="lg" className="gap-2 shadow-xl shadow-brand/25">
                Start playing <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/charities">
              <Button variant="secondary" size="lg">Browse charities</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Current jackpot banner ───────────────────────────────────────── */}
      {currentDraw?.exists && currentDraw?.prize_tiers && (
        <section className="px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="glass rounded-2xl px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-ink-muted text-sm">Current jackpot</p>
                <p className="font-heading text-3xl font-bold text-brand">
                  £{Number(currentDraw.prize_tiers?.[0]?.total_pool ?? 0).toLocaleString()}
                </p>
                <p className="text-ink-faint text-xs mt-0.5">
                  {currentDraw.display_month} · {currentDraw.active_subscriber_count} players
                </p>
              </div>
              <Link to="/register">
                <Button variant="accent">Enter this draw →</Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-brand text-sm font-medium tracking-widest uppercase mb-3">How it works</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-ink">
              Three simple steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <Card key={i} className="relative">
                {/* Step number */}
                <span className="absolute top-5 right-5 font-heading text-5xl font-bold text-brand/5 select-none">
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4">
                  <step.icon size={20} className="text-brand" />
                </div>
                <h3 className="font-heading font-semibold text-ink text-lg mb-2">{step.title}</h3>
                <p className="text-ink-muted text-sm leading-relaxed">{step.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured charities ───────────────────────────────────────────── */}
      {charities.length > 0 && (
        <section className="px-6 py-20 border-t border-line-subtle">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-brand text-sm font-medium tracking-widest uppercase mb-2">Giving back</p>
                <h2 className="font-heading text-3xl font-bold text-ink">Featured charities</h2>
              </div>
              <Link to="/charities" className="text-brand text-sm hover:underline">
                View all →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {charities.slice(0, 3).map(c => (
                <Card key={c.id} hover>
                  {/* Charity image placeholder */}
                  <div className="w-full h-32 rounded-xl bg-bg-raised border border-line-subtle mb-4 flex items-center justify-center overflow-hidden">
                    {c.image
                      ? <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                      : <Heart size={28} className="text-ink-faint" />
                    }
                  </div>
                  <h3 className="font-heading font-semibold text-ink mb-1">{c.name}</h3>
                  <p className="text-ink-muted text-sm line-clamp-2">{c.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA strip ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-brand/5 border border-brand/15 rounded-3xl px-8 py-14 text-center">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-ink mb-4">
              Ready to play your part?
            </h2>
            <p className="text-ink-muted max-w-lg mx-auto mb-8">
              From £9.99 a month. Cancel anytime. Every subscription puts money into the prize pool
              and into a charity you care about.
            </p>
            <Link to="/pricing">
              <Button size="lg" className="shadow-xl shadow-brand/20">
                See pricing <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line-subtle px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-ink-faint text-sm">
          <span className="font-heading font-semibold text-ink">digital.<span className="text-brand">HEROES</span></span>
          <span>© {new Date().getFullYear()} Digital Heroes · digitalheroes.co.in</span>
        </div>
      </footer>
    </div>
  );
}