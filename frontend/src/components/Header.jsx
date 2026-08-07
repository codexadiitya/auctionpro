import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Zap, LogIn, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

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
  const { user, logout } = useAuth() || {};
  const { isDark, toggleTheme } = useTheme();

  const dashHref = user?.role === 'coordinator' ? '/dashboard' : '/player/profile';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-lg bg-[#0a0a0f]/80 border-b border-white/5 transition-colors">
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
            {/* ☀️ / 🌙 Day Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all flex items-center justify-center border border-white/10"
              title={isDark ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-orange-400" />
              )}
            </button>

            <Link to="/register-player" className="text-sm font-medium text-white/80 hover:text-orange-400">Player Register</Link>
            {user ? (
              <>
                <Link to={dashHref}><Button data-testid="header-dashboard-btn" className="bg-white/10 hover:bg-white/15 text-white border border-white/10"><LayoutDashboard className="w-4 h-4 mr-2"/> {user.role === 'coordinator' ? 'Dashboard' : 'My Profile'}</Button></Link>
                <Button variant="outline" onClick={logout} className="border-white/20 text-white bg-transparent hover:bg-white/5 hover:text-orange-400">Logout</Button>
              </>
            ) : (
              <>
                <Link to="/login"><Button data-testid="header-login-btn" variant="outline" className="border-white/20 text-white bg-transparent hover:bg-white/5 hover:text-orange-400"><LogIn className="w-4 h-4 mr-2"/> Login</Button></Link>
                <Link to="/register"><Button data-testid="header-signup-btn" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-6 shadow-lg shadow-orange-500/30">Start Auction</Button></Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {/* Mobile Day/Night Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/10 text-white border border-white/10"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-orange-400" />}
            </button>
            <button className="text-white p-2" onClick={() => setOpen(!open)}>
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden pb-4 space-y-2">
            {navItems.map((n) => (
              <a key={n.label} href={n.to} onClick={()=>setOpen(false)}
                 className="block px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/5">
                {n.label}
              </a>
            ))}
            <Link to="/register-player" onClick={()=>setOpen(false)} className="block px-3 py-2 rounded-md text-white/80 hover:text-white hover:bg-white/5">Player Register</Link>
            {user ? (
              <>
                <Link to={dashHref} onClick={()=>setOpen(false)} className="block"><Button className="w-full bg-white/10 text-white">Dashboard</Button></Link>
                <Button variant="outline" onClick={logout} className="w-full border-white/20 text-white bg-transparent">Logout</Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={()=>setOpen(false)} className="block"><Button variant="outline" className="w-full border-white/20 text-white bg-transparent">Login</Button></Link>
                <Link to="/register" onClick={()=>setOpen(false)} className="block"><Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white">Start Auction</Button></Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
