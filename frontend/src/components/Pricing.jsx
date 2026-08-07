import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Check, Loader2, Star } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

export default function Pricing() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/packages`)
      .then((r) => setPackages(r.data))
      .catch(() => {
        // Fallback default packages if backend unreachable
        setPackages([
          { id: 'starter', name: 'Starter', price: 999, auctions: 1, teams: 4, features: ['1 Auction', 'Up to 4 Teams', '50 Players', 'Email Support'] },
          { id: 'pro', name: 'Pro', price: 2999, auctions: 5, teams: 12, features: ['5 Auctions', 'Up to 12 Teams', '200 Players', 'Priority Support', 'Analytics'] },
          { id: 'enterprise', name: 'Enterprise', price: 7999, auctions: 20, teams: 20, features: ['20 Auctions', 'Unlimited Teams', 'Unlimited Players', 'Dedicated Support'] },
          { id: 'tournament', name: 'Tournament', price: 14999, auctions: -1, teams: -1, features: ['Unlimited Everything', 'White Label', 'API Access', '24/7 Dedicated Support'] },
        ]);
      });
  }, []);

  const handleBuyClick = (pkg) => {
    const token = localStorage.getItem('ap_token');
    if (!token) {
      toast({ title: 'Login required', description: 'Please log in to your coordinator account to purchase a package.' });
      navigate('/login');
      return;
    }
    navigate('/dashboard/payments');
  };

  const highlight = 'pro';

  return (
    <section id="pricing" className="relative py-20 lg:py-28 bg-white/[0.015] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Transparent per-auction pricing</div>
          <h2 className="font-display text-4xl md:text-5xl text-white">OUR <span className="brand-gradient-text">PRICING</span></h2>
          <p className="text-white/60 mt-4 max-w-xl mx-auto">One-time payment per package. No hidden fees. Instant access to all live auction features.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((p) => {
            const isHighlight = p.id === highlight;
            const price = p.price ?? p.amount ?? 0;
            return (
              <Card key={p.id} className={`relative rounded-2xl p-6 border flex flex-col justify-between transition-all hover-lift ${isHighlight ? 'bg-gradient-to-b from-orange-500/15 to-amber-500/5 border-orange-500/50' : 'bg-white/[0.03] border-white/10'}`}>
                <div>
                  {isHighlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"><Star className="w-3 h-3" fill="currentColor"/> MOST POPULAR</div>
                  )}
                  <div className="text-xs uppercase tracking-widest text-white/60 font-semibold">Package</div>
                  <div className="mt-1 text-white text-2xl font-bold">{p.name}</div>
                  <div className="mt-5 flex items-baseline gap-1">
                    {price === 0 ? (
                      <span className="font-display text-5xl brand-gradient-text">FREE</span>
                    ) : (
                      <>
                        <span className="text-white/60 text-lg">₹</span>
                        <span className="font-display text-5xl text-white">{price.toLocaleString('en-IN')}</span>
                      </>
                    )}
                  </div>
                  <div className="mt-1 text-white/60 text-sm">
                    {p.teams > 0 ? <>Up to <span className="text-orange-400 font-bold">{p.teams}</span> teams</> : <span className="text-orange-400 font-bold">Unlimited Teams</span>}
                  </div>

                  <ul className="mt-6 space-y-2">
                    {p.features?.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                        <Check className="w-4 h-4 text-orange-400 mt-0.5 shrink-0"/> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handleBuyClick(p)}
                  disabled={!!loading[p.id]}
                  className={`mt-6 w-full font-semibold ${isHighlight ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white' : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'}`}>
                  {price === 0 ? 'Get Started Free' : 'Buy Now'}
                </Button>
              </Card>
            );
          })}
        </div>
        <p className="text-center text-white/40 text-xs mt-6">Instant activation • Payments secured by Razorpay (UPI, Credit/Debit Card, Netbanking)</p>
      </div>
    </section>
  );
}
