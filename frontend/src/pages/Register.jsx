import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Zap, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'player' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await register(form);
      toast({ title: 'Account created!', description: `Welcome ${u.name}` });
      nav('/player/profile');
    } catch (err) {
      console.error('[Register Error]', err);
      const msg = err.userMessage || err?.response?.data?.error?.message || 'Registration failed';
      toast({ title: 'Registration failed', description: msg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg flex items-center justify-center px-4 py-8">
      <Card data-testid="register-card" className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 max-w-md w-full">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center glow-orange">
            <Zap className="w-6 h-6 text-white" fill="white"/>
          </div>
          <div className="font-display text-2xl tracking-wider text-white">AUCTION<span className="brand-gradient-text">PRO</span></div>
        </Link>
        <h1 className="font-display text-3xl text-white text-center">CREATE ACCOUNT</h1>
        <p className="text-white/60 text-center text-sm mt-1">Create your AuctionPro account</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input type="hidden" name="role" value="player" />
          <div>
            <Label className="text-white/70">Full Name</Label>
            <Input data-testid="register-name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
          </div>
          <div>
            <Label className="text-white/70">Email</Label>
            <Input data-testid="register-email" required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@league.com" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
          </div>
          <div>
            <Label className="text-white/70">Phone</Label>
            <Input data-testid="register-phone" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91-..." className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
          </div>
          <div>
            <Label className="text-white/70">Password (min 8 chars)</Label>
            <Input data-testid="register-password" required type="password" minLength={8} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
          </div>
          <Button data-testid="register-submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Creating...</> : 'Create Account'}
          </Button>
        </form>
        <p className="text-center text-white/60 text-sm mt-6">
          Already have an account? <Link to="/login" className="text-orange-400 hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
