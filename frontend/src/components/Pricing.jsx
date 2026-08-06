import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Check, Loader2, Star } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function Pricing() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState({});
  const { toast } = useToast();

  useEffect(() => {
    axios.get(`${API}/packages`).then((r) => setPackages(r.data)).catch(() => {});
  }, []);

  const buy = async (pkg) => {
    if (pkg.amount === 0) {
      toast({ title: 'Free plan activated', description: 'Sign in to start your free auction (up to 2 teams).' });
      return;
    }
    setLoading((s) => ({ ...s, [pkg.id]: true }));
    try {
      const { data } = await axios.post(`${API}/payments/checkout`, {
        package_id: pkg.id,
        origin_url: window.location.origin,
      });
      window.location.href = data.checkout_url;
    } catch (e) {
      toast({ title: 'Checkout failed', description: e?.response?.data?.detail || 'Please try again.', variant: 'destructive' });
      setLoading((s) => ({ ...s, [pkg.id]: false }));
    }
  };

  const highlight = 'premium';

  return (
    <section id="pricing" className="relative py-20 lg:py-28 bg-white/[0.015] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Transparent per-auction pricing</div>
          <h2 className="font-display text-4xl md:text-5xl text-white">OUR <span className="brand-gradient-text">PRICING</span></h2>
          <p className="text-white/60 mt-4 max-w-xl mx-auto">One-time per auction. No hidden fees. Pay only for what your league needs.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((p) => {
            const isHighlight = p.id === highlight;
            return (
              <Card key={p.id} className={`relative rounded-2xl p-6 border transition-all hover-lift ${isHighlight ? 'bg-gradient-to-b from-orange-500/15 to-amber-500/5 border-orange-500/50' : 'bg-white/[0.03] border-white/10'}`}>
                {isHighlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Star className="w-3 h-3" fill="currentColor"/> MOST POPULAR</div>
                )}
                <div className="text-xs uppercase tracking-widest text-white/60 font-semibold">Per Auction</div>
                <div className="mt-1 text-white text-2xl font-bold">{p.name}</div>
                <div className="mt-5 flex items-baseline gap-1">
                  {p.amount === 0 ? (
                    <span className="font-display text-5xl brand-gradient-text">FREE</span>
                  ) : (
                    <>
                      <span className="text-white/60 text-lg">₹</span>
                      <span className="font-display text-5xl text-white">{p.amount.toLocaleString('en-IN')}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-white/60 text-sm">Up to <span className="text-orange-400 font-bold">{p.teams}</span> teams</div>

                <ul className="mt-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                      <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0"/> {f}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => buy(p)}
                  disabled={!!loading[p.id]}
                  className={`mt-6 w-full font-semibold ${isHighlight ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white' : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'}`}>
                  {loading[p.id] ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Redirecting...</> : (p.amount === 0 ? 'Get Started Free' : 'Buy Now')}
                </Button>
              </Card>
            );
          })}
        </div>
        <p className="text-center text-white/40 text-xs mt-6">Payments powered by Stripe • Use test card <span className="font-mono text-orange-400">4242 4242 4242 4242</span> for demo</p>
      </div>
    </section>
  );
}
