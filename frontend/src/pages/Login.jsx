import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Zap, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(form.email, form.password);
      const from = loc.state?.from;
      if (from) nav(from);
      else nav(u.role === 'coordinator' ? '/dashboard' : '/player/profile');
    } catch (err) {
      // Log the full error so we can see network / CORS / server details
      console.error('Login error:', err);

      const serverDetail = err?.response?.data?.detail;
      const status = err?.response?.status;
      const message = serverDetail || err?.message || JSON.stringify(err);
      const description = status ? `(${status}) ${message}` : message;

      toast({ title: 'Login failed', description, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg flex items-center justify-center px-4">
      <Card data-testid="login-card" className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 max-w-md w-full">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center glow-orange">
            <Zap className="w-6 h-6 text-white" fill="white"/>
          </div>
          <div className="font-display text-2xl tracking-wider text-white">AUCTION<span className="brand-gradient-text">PRO</span></div>
        </Link>
        <h1 className="font-display text-3xl text-white text-center">WELCOME BACK</h1>
        <p className="text-white/60 text-center text-sm mt-1">Sign in to your AuctionPro account</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <Label className="text-white/70">Email</Label>
            <Input data-testid="login-email" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
              placeholder="you@league.com" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
          </div>
          <div>
            <Label className="text-white/70">Password</Label>
            <Input data-testid="login-password" required type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
              placeholder="••••••••" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
          </div>
          <Button data-testid="login-submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-md">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Signing in...</> : 'Sign In'}
          </Button>
        </form>
        <p className="text-center text-white/60 text-sm mt-6">
          Don't have an account? <Link to="/register" className="text-orange-400 hover:underline">Sign up</Link>
        </p>
        <p className="text-center text-white/40 text-xs mt-2">
          Are you a player? <Link to="/register-player" className="text-orange-400 hover:underline">Register here</Link>
        </p>
      </Card>
    </div>
  );
}
