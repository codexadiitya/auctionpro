import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, BACKEND } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card } from '../components/ui/card';
import { Zap, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const ROLES = ['Batsman','Bowler','All-Rounder','Wicketkeeper','Defender','Midfielder','Forward','Goalkeeper','Raider','Other'];

export default function PlayerRegister() {
  const { toast } = useToast();
  const [auctions, setAuctions] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    auction_id: '', name: '', role: 'Batsman', sport: 'Cricket',
    base_price: 100000, city: '', phone: '', jersey_number: '', bio: '',
  });

  useEffect(() => {
    api.get('/auctions/public').then(r => setAuctions(r.data)).catch(()=>{});
  }, []);

  const uploadPhoto = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const t = localStorage.getItem('ap_token');
    if (!t) { toast({ title: 'Sign in first', description: 'Please create a free player account to upload a photo.', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', f);
      const { data } = await api.post('/uploads/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPhotoUrl(data.url);
    } catch (err) { toast({ title: 'Upload failed', variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.auction_id) { toast({ title: 'Choose an auction', variant: 'destructive' }); return; }
    setLoading(true);
    try {
      await api.post('/players', {
        ...form,
        base_price: Number(form.base_price),
        jersey_number: form.jersey_number ? Number(form.jersey_number) : null,
        photo_url: photoUrl || null,
      });
      setDone(true);
    } catch (err) {
      toast({ title: 'Registration failed', description: err?.response?.data?.detail || 'Try again', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] grid-bg flex items-center justify-center px-4">
        <Card className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center glow-orange mb-4">
            <CheckCircle2 className="w-10 h-10 text-white"/>
          </div>
          <h1 className="font-display text-3xl text-white">YOU'RE IN <span className="brand-gradient-text">THE POOL!</span></h1>
          <p className="text-white/70 mt-3">Thank you {form.name}. You'll appear in the auction pool and can track your status by signing in.</p>
          <Link to="/login" className="inline-block mt-6"><Button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">Sign in to track</Button></Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] grid-bg py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center glow-orange"><Zap className="w-6 h-6 text-white" fill="white"/></div>
          <div className="font-display text-2xl tracking-wider text-white">AUCTION<span className="brand-gradient-text">PRO</span></div>
        </Link>
        <Card className="bg-white/[0.04] border border-white/10 rounded-3xl p-8">
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Player registration</div>
          <h1 className="font-display text-3xl text-white">JOIN AN <span className="brand-gradient-text">AUCTION</span></h1>
          <p className="text-white/60 text-sm mt-1">Fill in your details to enter the pool. Coordinators will see you when the auction goes live.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label className="text-white/70">Select Auction Pool *</Label>
              <select data-testid="player-auction-select" required value={form.auction_id} onChange={e=>setForm({...form,auction_id:e.target.value})} className="mt-1.5 w-full h-10 rounded-md bg-white/5 border border-white/10 text-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                <option value="">-- Choose an active auction --</option>
                {auctions.map(a => <option key={a.id} value={a.id}>{a.name} • {a.sport} • {a.date}</option>)}
              </select>
              {auctions.length === 0 && <p className="text-xs text-white/40 mt-1">No open auctions right now. Please check back later.</p>}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center">
                {photoUrl ? <img src={`${BACKEND}${photoUrl}`} alt="me" className="w-full h-full object-cover"/> : <Upload className="w-6 h-6 text-white/30"/>}
              </div>
              <div>
                <Label className="text-white/70">Player Photo</Label>
                <input data-testid="player-photo-input" type="file" accept="image/*" onChange={uploadPhoto} className="block mt-1.5 text-sm text-white/70 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-orange-500/20 file:text-orange-300 hover:file:bg-orange-500/30"/>
                {uploading && <p className="text-xs text-white/50 mt-1">Uploading...</p>}
                <p className="text-xs text-white/40 mt-1">Sign in with a player account to upload a photo.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label className="text-white/70">Full Name *</Label><Input data-testid="player-name" required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white focus-visible:ring-orange-500"/></div>
              <div><Label className="text-white/70">Sport</Label><Input value={form.sport} onChange={e=>setForm({...form,sport:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white focus-visible:ring-orange-500"/></div>
              <div><Label className="text-white/70">Role *</Label>
                <select required value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="mt-1.5 w-full h-10 rounded-md bg-white/5 border border-white/10 text-white px-3 outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                  {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div><Label className="text-white/70">Base Price (₹)</Label><Input type="number" value={form.base_price} onChange={e=>setForm({...form,base_price:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white focus-visible:ring-orange-500"/></div>
              <div><Label className="text-white/70">City</Label><Input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white focus-visible:ring-orange-500"/></div>
              <div><Label className="text-white/70">Phone</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white focus-visible:ring-orange-500"/></div>
              <div><Label className="text-white/70">Jersey Number</Label><Input type="number" value={form.jersey_number} onChange={e=>setForm({...form,jersey_number:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white focus-visible:ring-orange-500"/></div>
            </div>
            <div>
              <Label className="text-white/70">Short Bio</Label>
              <Textarea rows={3} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white focus-visible:ring-orange-500"/>
            </div>
            <Button data-testid="player-submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Submitting...</> : 'Join Auction Pool'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
