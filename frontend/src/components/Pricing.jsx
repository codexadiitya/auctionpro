import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Sparkles, Shield, Star } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api`;

const DEFAULT_PACKAGES = [
  { id: 'free',      name: 'Free',     price: 0,    teams: 2,  color: '#F43F5E', features: ['1 Live Auction', 'Up to 2 Teams', 'Real-time Socket Bidding', 'Basic Dashboard Access'] },
  { id: 'tier_3000', name: '4 Teams',  price: 3000, teams: 4,  color: '#10B981', features: ['1 Live Auction', 'Up to 4 Teams', 'Real-time Socket Bidding', 'Fortune Wheel Picker', 'WhatsApp Notifications'] },
  { id: 'tier_4000', name: '8 Teams',  price: 4000, teams: 8,  color: '#F59E0B', features: ['1 Live Auction', 'Up to 8 Teams', 'Real-time Socket Bidding', 'Fortune Wheel Picker', 'WhatsApp Notifications'] },
  { id: 'tier_5000', name: '12 Teams', price: 5000, teams: 12, color: '#3B82F6', features: ['1 Live Auction', 'Up to 12 Teams', 'Real-time Socket Bidding', 'Fortune Wheel Picker', 'WhatsApp Notifications', 'Analytics Summary'] },
  { id: 'tier_6000', name: '16 Teams', price: 6000, teams: 16, color: '#14B8A6', features: ['1 Live Auction', 'Up to 16 Teams', 'Real-time Socket Bidding', 'Fortune Wheel Picker', 'WhatsApp Notifications', 'Priority Support'] },
  { id: 'tier_7000', name: '22 Teams', price: 7000, teams: 22, color: '#8B5CF6', features: ['1 Live Auction', 'Up to 22 Teams', 'Real-time Socket Bidding', 'Fortune Wheel Picker', 'WhatsApp Notifications', 'Priority Support'] },
  { id: 'tier_8000', name: '30 Teams', price: 8000, teams: 30, color: '#EA580C', features: ['1 Live Auction', 'Up to 30 Teams', 'Real-time Socket Bidding', 'Fortune Wheel Picker', 'WhatsApp Notifications', 'Dedicated Account Mgr'] },
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
      toast({ title: 'Login required', description: 'Please log in to your coordinator account to purchase a plan.' });
      navigate('/login');
      return;
    }
    navigate('/dashboard/payments');
  };

  return (
    <section id="pricing" className="relative py-24 bg-[#0a0a0f] border-y border-white/5 overflow-hidden">
      {/* Subtle Background Glow Spheres */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-extrabold mb-3 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" /> TRANSPARENT PER-AUCTION PRICING
          </div>
          <h2 className="font-display text-4xl md:text-6xl text-white tracking-wide">
            CHOOSE YOUR <span className="brand-gradient-text">AUCTION TIER</span>
          </h2>
          <p className="text-white/60 mt-3 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            One-time transparent pricing per auction. Pick the exact team capacity your tournament needs.
          </p>
        </div>

        {/* ── Top Row (4 Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {packages.slice(0, 4).map((pkg) => (
            <PremiumGlassCard key={pkg.id} pkg={pkg} onSelect={() => handleSelect(pkg)} />
          ))}
        </div>

        {/* ── Bottom Row (3 Cards Centered) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {packages.slice(4, 7).map((pkg) => (
            <PremiumGlassCard key={pkg.id} pkg={pkg} onSelect={() => handleSelect(pkg)} />
          ))}
        </div>

        <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-6 text-white/50 text-xs">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-orange-400"/> Instant Setup & Activation</span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400"/> Payments via Razorpay (UPI, GPay, PhonePe, Cards)</span>
        </div>
      </div>
    </section>
  );
}

/**
 * Ultra-Premium Dark Glassmorphic Card
 */
function PremiumGlassCard({ pkg, onSelect }) {
  const accentColor = pkg.color || '#FF6B00';
  const priceDisplay = pkg.price === 0 ? 'FREE' : `₹${pkg.price.toLocaleString('en-IN')}`;
  const teamFormatted = String(pkg.teams).padStart(2, '0');
  const isPopular = pkg.id === 'tier_5000' || pkg.id === 'tier_6000';

  return (
    <div
      className={`relative rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-2 hover:shadow-2xl ${
        isPopular
          ? 'bg-gradient-to-b from-orange-500/15 via-amber-500/10 to-slate-900/80 border-2 border-orange-500/60 shadow-orange-500/10 shadow-2xl'
          : 'bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-orange-500/40 backdrop-blur-xl'
      }`}
    >
      {/* Most Popular Ribbon */}
      {isPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black text-[10px] tracking-widest uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-lg z-20">
          <Star className="w-3 h-3" fill="currentColor" /> MOST POPULAR
        </div>
      )}

      <div>
        {/* Card Header Tag */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">PER AUCTION</span>
            <div className="text-xl font-bold text-white mt-0.5">{pkg.name}</div>
          </div>
          {/* Circular Accent Badge */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm border shadow-lg transition-transform group-hover:scale-110"
            style={{
              backgroundColor: `${accentColor}20`,
              borderColor: `${accentColor}60`,
              color: accentColor,
            }}
          >
            {teamFormatted}
          </div>
        </div>

        {/* Hero Price Display */}
        <div className="my-4">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-5xl text-white font-extrabold tracking-tight">
              {priceDisplay}
            </span>
            {pkg.price > 0 && <span className="text-white/40 text-xs">/ auction</span>}
          </div>
          <div className="text-xs text-orange-400 font-bold mt-1 uppercase tracking-wider">
            Up to {pkg.teams} Teams Capacity
          </div>
        </div>

        {/* Features Checklist */}
        <ul className="mt-6 space-y-2.5 border-t border-white/5 pt-5">
          {pkg.features?.map((feat) => (
            <li key={feat} className="text-xs text-white/80 flex items-start gap-2.5">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                style={{ backgroundColor: `${accentColor}30`, color: accentColor }}
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span className="leading-snug">{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <button
        onClick={onSelect}
        className={`mt-8 w-full py-3.5 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg ${
          isPopular
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black shadow-orange-500/25'
            : 'bg-white/10 hover:bg-orange-500 text-white hover:text-slate-950 border border-white/10 hover:border-orange-500'
        }`}
      >
        {pkg.price === 0 ? 'Get Started Free' : `Select ${pkg.teams} Teams Plan`}
      </button>
    </div>
  );
}
