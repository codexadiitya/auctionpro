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
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/85 border-b border-white/10 transition-colors shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="white" />
            </div>
            <div className="leading-none">
              <div className="font-display text-xl sm:text-2xl tracking-wider text-white">AUCTION<span className="brand-gradient-text">PRO</span></div>
              <div className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold mt-0.5">Live Player Auction Suite</div>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden xl:flex items-center gap-6">
            {navItems.map((n) => (
              <a key={n.label} href={n.to}
                 className={`text-sm font-medium tracking-wide transition-colors ${loc.hash===n.to.split('#')[1] ? 'text-orange-400 font-semibold' : 'text-white/70 hover:text-white'}`}>
                {n.label}
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            {/* ☀️ / 🌙 Day Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all flex items-center justify-center border border-white/10 hover:border-orange-500/50"
              title={isDark ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
              aria-label="Toggle Theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-orange-400" />
              )}
            </button>

            <Link to="/register-player" className="text-xs sm:text-sm font-medium text-white/80 hover:text-orange-400 transition-colors px-2 py-1">Player Register</Link>
            {user ? (
              <>
                <Link to={dashHref}><Button data-testid="header-dashboard-btn" className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-semibold"><LayoutDashboard className="w-4 h-4 mr-1.5"/> {user.role === 'coordinator' ? 'Dashboard' : 'My Profile'}</Button></Link>
                <Button variant="outline" onClick={logout} className="border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-orange-400 font-medium">Logout</Button>
              </>
            ) : (
              <>
                <Link to="/login"><Button data-testid="header-login-btn" variant="outline" className="border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-orange-400 font-medium"><LogIn className="w-4 h-4 mr-1.5"/> Login</Button></Link>
                <Link to="/register"><Button data-testid="header-signup-btn" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-orange-500/30 transition-transform active:scale-95">Start Auction</Button></Link>
              </>
            )}
          </div>

          {/* Mobile Header Controls */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-white/10 text-white border border-white/10"
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-orange-400" />}
            </button>
            <button className="text-white p-2 rounded-xl bg-white/5 border border-white/10" onClick={() => setOpen(!open)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {open && (
          <div className="lg:hidden pb-6 pt-2 space-y-3 border-t border-white/10 mt-2">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((n) => (
                <a key={n.label} href={n.to} onClick={()=>setOpen(false)}
                   className="block px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 bg-white/5 border border-white/5 text-center">
                  {n.label}
                </a>
              ))}
            </div>
            <Link to="/register-player" onClick={()=>setOpen(false)} className="block px-4 py-3 rounded-xl text-center font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20">
              ⚡ Player Registration Form
            </Link>
            {user ? (
              <div className="space-y-2 pt-2">
                <Link to={dashHref} onClick={()=>setOpen(false)} className="block"><Button className="w-full bg-white/10 text-white h-11">Go to Dashboard</Button></Link>
                <Button variant="outline" onClick={() => { logout(); setOpen(false); }} className="w-full border-white/20 text-white bg-transparent h-11">Logout</Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link to="/login" onClick={()=>setOpen(false)} className="block"><Button variant="outline" className="w-full border-white/20 text-white bg-transparent h-11">Login</Button></Link>
                <Link to="/register" onClick={()=>setOpen(false)} className="block"><Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white h-11 font-bold">Start Auction</Button></Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
