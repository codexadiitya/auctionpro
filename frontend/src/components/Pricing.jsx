import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

/**
 * 7 Pricing Tiers matching the exact visual design requested
 */
const DEFAULT_PACKAGES = [
  { id: 'free',      name: 'Free',     price: 0,    teams: 2,  color: '#EF4444', label: 'Free' },
  { id: 'tier_3000', name: '4 Teams',  price: 3000, teams: 4,  color: '#10B981', label: 'Rs. 3000/-' },
  { id: 'tier_4000', name: '8 Teams',  price: 4000, teams: 8,  color: '#F59E0B', label: 'Rs. 4000/-' },
  { id: 'tier_5000', name: '12 Teams', price: 5000, teams: 12, color: '#3B82F6', label: 'Rs. 5000/-' },
  { id: 'tier_6000', name: '16 Teams', price: 6000, teams: 16, color: '#14B8A6', label: 'Rs. 6000/-' },
  { id: 'tier_7000', name: '22 Teams', price: 7000, teams: 22, color: '#8B5CF6', label: 'Rs. 7000/-' },
  { id: 'tier_8000', name: '30 Teams', price: 8000, teams: 30, color: '#EA580C', label: 'Rs. 8000/-' },
];

export default function Pricing() {
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/packages`)
      .then((r) => {
        if (r.data && Array.isArray(r.data) && r.data.length > 0) {
          setPackages(r.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelect = (pkg) => {
    const token = localStorage.getItem('ap_token');
    if (!token) {
      toast({ title: 'Login required', description: 'Please log in to choose a package for your auction.' });
      navigate('/login');
      return;
    }
    navigate('/dashboard/payments');
  };

  return (
    <section id="pricing" className="relative py-20 lg:py-28 bg-[#0a0a0f] border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">
            Flexible per-auction pricing
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-white">
            AUCTION <span className="brand-gradient-text">PRICING PLANS</span>
          </h2>
          <p className="text-white/60 mt-3 max-w-xl mx-auto text-sm">
            Select the team tier that fits your tournament. Pay only for what you host.
          </p>
        </div>

        {/* ── Top Row (4 Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {packages.slice(0, 4).map((pkg) => (
            <PricingCard key={pkg.id} pkg={pkg} onSelect={() => handleSelect(pkg)} />
          ))}
        </div>

        {/* ── Bottom Row (3 Cards Centered) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.slice(4, 7).map((pkg) => (
            <PricingCard key={pkg.id} pkg={pkg} onSelect={() => handleSelect(pkg)} />
          ))}
        </div>

        <p className="text-center text-white/40 text-xs mt-10">
          🔒 Secure Razorpay checkout • Supports UPI, Cards, Netbanking • Instant auction setup
        </p>
      </div>
    </section>
  );
}

/**
 * Custom Card Component matching the user's reference image style:
 * - Circular price badge popped out at the top
 * - Solid colored top header bar
 * - Center team count display (e.g. "Up to 04 Teams")
 * - Solid colored bottom bar ("Per Auction")
 */
function PricingCard({ pkg, onSelect }) {
  const accentColor = pkg.color || '#FF6B00';
  const priceDisplay = pkg.price === 0 ? 'Free' : `Rs. ${pkg.price.toLocaleString('en-IN')}/-`;
  const teamFormatted = String(pkg.teams).padStart(2, '0');

  return (
    <div
      onClick={onSelect}
      className="relative cursor-pointer transition-all duration-300 transform hover:-translate-y-2 hover:shadow-2xl group"
    >
      {/* ── Outer Card Wrapper ── */}
      <div className="pt-8 relative">

        {/* ── Top Floating Circular Badge ── */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20 w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 border-[#0a0a0f] shadow-lg transition-transform group-hover:scale-110"
          style={{ backgroundColor: '#ffffff', color: accentColor }}
        >
          <span className="font-bold text-xs sm:text-sm text-center px-1 leading-tight">
            {priceDisplay}
          </span>
        </div>

        {/* ── Card Body Box ── */}
        <div className="bg-white rounded-xl overflow-hidden shadow-xl border border-gray-100 flex flex-col justify-between pt-14">

          {/* ── Colored Top Banner ── */}
          <div className="h-6 w-full" style={{ backgroundColor: accentColor }} />

          {/* ── Center Content: Team Count ── */}
          <div className="py-8 px-4 text-center bg-white">
            <div className="text-gray-500 text-xs font-semibold uppercase tracking-wider">
              Up to
            </div>
            <div
              className="font-display text-5xl md:text-6xl font-black my-1 transition-transform group-hover:scale-105"
              style={{ color: accentColor }}
            >
              {teamFormatted}
            </div>
            <div className="text-gray-700 text-sm font-semibold uppercase tracking-wider">
              Teams
            </div>
          </div>

          {/* ── Colored Bottom Banner ── */}
          <div
            className="py-2.5 w-full text-center text-white text-xs font-bold uppercase tracking-widest transition-opacity group-hover:opacity-90 flex items-center justify-center gap-1"
            style={{ backgroundColor: accentColor }}
          >
            <span>Per Auction</span>
          </div>
        </div>
      </div>
    </div>
  );
}
