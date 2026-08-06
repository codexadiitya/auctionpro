import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap } from 'lucide-react';
import { Button } from './ui/button';

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Auctions', to: '/#auctions' },
  { label: 'Features', to: '/#features' },
  { label: 'Pricing', to: '/#pricing' },
  { label: 'About', to: '/#about' },
  { label: 'Contact', to: '/#contact' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const loc = useLocation();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-[#0a0a0f]/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center glow-orange">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-2xl tracking-wider text-white">AUCTION<span className="brand-gradient-text">PRO</span></div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">Live Player Auction Suite</div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((n) => (
              <a key={n.label} href={n.to}
                 className={`text-sm font-medium tracking-wide transition-colors ${loc.hash===n.to.split('#')[1] ? 'text-orange-400' : 'text-white/70 hover:text-white'}`}>
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <a href="#demo" className="text-sm font-medium text-white/80 hover:text-white">Book Demo</a>
            <a href="#pricing">
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 shadow-lg shadow-orange-500/30">Start Auction</Button>
            </a>
          </div>

          <button className="lg:hidden text-white" onClick={() => setOpen(!open)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden pb-4 space-y-2">
            {navItems.map((n) => (
              <a key={n.label} href={n.to} onClick={()=>setOpen(false)}
                 className="block px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/5">
                {n.label}
              </a>
            ))}
            <a href="#pricing" onClick={()=>setOpen(false)} className="block">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white">Start Auction</Button>
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
