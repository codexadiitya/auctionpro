import React, { useEffect, useState } from 'react';
import { Link, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { api, BACKEND } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { LayoutDashboard, Trophy, Users, User, CreditCard, Settings, LogOut, Plus, Play, Trash2, Edit3, Zap, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/auctions', label: 'My Auctions', icon: Trophy },
  { to: '/dashboard/teams', label: 'Teams', icon: Users },
  { to: '/dashboard/players', label: 'Players', icon: User },
  { to: '/dashboard/payments', label: 'Payments', icon: CreditCard },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
];

function Sidebar() {
  const loc = useLocation();
  const { user, logout } = useAuth();
  return (
    <aside className="w-64 shrink-0 border-r border-white/10 bg-black/40 backdrop-blur h-screen sticky top-0 flex flex-col">
      <Link to="/" className="flex items-center gap-2 p-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center glow-orange"><Zap className="w-5 h-5 text-white" fill="white"/></div>
        <div className="font-display text-xl text-white">AUCTION<span className="brand-gradient-text">PRO</span></div>
      </Link>
      <nav className="p-3 flex-1 space-y-1">
        {nav.map(n => {
          const active = n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase().replace(/ /g,'-')}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
              <n.icon className="w-4 h-4"/> {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="text-xs text-white/50 mb-2 px-2">{user?.email}</div>
        <Button variant="outline" size="sm" onClick={logout} className="w-full border-white/20 text-white bg-transparent hover:bg-white/5 hover:text-orange-400"><LogOut className="w-4 h-4 mr-2"/> Logout</Button>
      </div>
    </aside>
  );
}

function Overview() {
  const { toast } = useToast();
  const [stats, setStats] = useState({ total_auctions: 0, active_auctions: 0, total_players: 0, total_revenue: 0 });
  useEffect(() => {
    api.get('/dashboard/stats')
      .then(r => setStats(r.data))
      .catch(() => toast({ title: 'Could not load stats', variant: 'destructive' }));
  }, []);
  const cards = [
    { label: 'Total Auctions', val: stats.total_auctions, icon: Trophy },
    { label: 'Active Auctions', val: stats.active_auctions, icon: Play },
    { label: 'Registered Players', val: stats.total_players, icon: User },
    { label: 'Total Revenue', val: `₹${Number(stats.total_revenue).toLocaleString('en-IN')}`, icon: CreditCard },
  ];
  return (
    <div>
      <h1 className="font-display text-4xl text-white">DASHBOARD <span className="brand-gradient-text">OVERVIEW</span></h1>
      <p className="text-white/60 mt-1">Welcome back — here's what's happening across your leagues.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {cards.map(c => (
          <Card key={c.label} data-testid={`stat-${c.label.toLowerCase().replace(/ /g,'-')}`} className="bg-white/[0.03] border border-white/10 p-5 rounded-2xl hover-lift">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400"><c.icon className="w-5 h-5"/></div>
            </div>
            <div className="mt-4 font-display text-4xl text-white">{c.val}</div>
            <div className="text-xs uppercase tracking-widest text-white/50 mt-1">{c.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MyAuctions() {
  const { toast } = useToast();
  const nav = useNavigate();
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [delId, setDelId] = useState(null);
  const [form, setForm] = useState({ name:'', sport:'Cricket', date:new Date().toISOString().slice(0,10), base_price:100000, max_teams:8, budget_per_team:5000000, description:'' });
  const load = () => api.get('/auctions?mine=true').then(r=>setList(r.data));
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post('/auctions', { ...form, base_price:Number(form.base_price), max_teams:Number(form.max_teams), budget_per_team:Number(form.budget_per_team) }); setOpen(false); load(); toast({ title:'Auction created' }); }
    catch(err){ toast({ title:'Failed', description: err?.response?.data?.detail, variant:'destructive' }); }
  };
  const remove = async () => { await api.delete(`/auctions/${delId}`); setDelId(null); load(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-4xl text-white">MY <span className="brand-gradient-text">AUCTIONS</span></h1>
          <p className="text-white/60 mt-1">Create and manage your tournament auctions.</p>
        </div>
        <Button data-testid="create-auction-btn" onClick={()=>setOpen(true)} className="bg-gradient-to-r from-orange-500 to-amber-500 text-white"><Plus className="w-4 h-4 mr-2"/> New Auction</Button>
      </div>
      {list.length === 0 ? (
        <Card className="bg-white/[0.03] border border-white/10 p-10 text-center"><Trophy className="w-10 h-10 mx-auto text-orange-400 mb-2"/><p className="text-white/60">No auctions yet. Create your first one!</p></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map(a => (
            <Card key={a.id} className="bg-white/[0.03] border border-white/10 p-5 rounded-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-orange-400 text-xs uppercase tracking-widest">{a.sport}</div>
                  <div className="text-white font-display text-2xl mt-1">{a.name}</div>
                  <div className="text-white/50 text-sm mt-1">{a.date} • Max {a.max_teams} teams • Budget ₹{Number(a.budget_per_team).toLocaleString('en-IN')}</div>
                  <Badge className="mt-3 bg-orange-500/20 text-orange-300 border-orange-500/30">{a.status}</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={()=>nav(`/auction/${a.id}/room`)} className="bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30"><Play className="w-4 h-4 mr-1"/> Room</Button>
                  <Button size="sm" variant="outline" onClick={()=>setDelId(a.id)} className="border-red-500/40 text-red-400 bg-transparent hover:bg-red-500/10"><Trash2 className="w-4 h-4"/></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0f0f14] border border-white/10 text-white sm:max-w-lg">
          <DialogHeader><DialogTitle>Create Auction</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div><Label>Name</Label><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sport</Label><Input value={form.sport} onChange={e=>setForm({...form,sport:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
              <div><Label>Base Price (₹)</Label><Input type="number" value={form.base_price} onChange={e=>setForm({...form,base_price:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
              <div><Label>Max Teams</Label><Input type="number" value={form.max_teams} onChange={e=>setForm({...form,max_teams:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
              <div className="col-span-2"><Label>Budget per Team (₹)</Label><Input type="number" value={form.budget_per_team} onChange={e=>setForm({...form,budget_per_team:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
            <DialogFooter><Button type="submit" data-testid="submit-create-auction" className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">Create</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!delId} onOpenChange={(v)=>!v && setDelId(null)}>
        <AlertDialogContent className="bg-[#0f0f14] border-white/10 text-white">
          <AlertDialogHeader><AlertDialogTitle>Delete auction?</AlertDialogTitle><AlertDialogDescription className="text-white/60">This deletes all teams, players and bids too. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="bg-white/5 border-white/10 text-white">Cancel</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TeamsPage() {
  const { toast } = useToast();
  const [auctions, setAuctions] = useState([]);
  const [aid, setAid] = useState('');
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ name:'', owner_name:'', color:'#FF6B00', purse:'' });
  useEffect(() => { api.get('/auctions?mine=true').then(r=>{ setAuctions(r.data); if(r.data[0]) setAid(r.data[0].id); }); }, []);
  useEffect(() => { if(aid) api.get(`/teams?auction_id=${aid}`).then(r=>setTeams(r.data)); }, [aid]);
  const create = async (e) => {
    e.preventDefault();
    try { await api.post('/teams', { auction_id: aid, ...form, purse: form.purse ? Number(form.purse) : undefined }); setForm({ name:'', owner_name:'', color:'#FF6B00', purse:'' }); api.get(`/teams?auction_id=${aid}`).then(r=>setTeams(r.data)); toast({title:'Team added'}); }
    catch(err){ toast({title:'Failed', description: err?.response?.data?.detail, variant:'destructive'}); }
  };
  const del = async (id) => { await api.delete(`/teams/${id}`); api.get(`/teams?auction_id=${aid}`).then(r=>setTeams(r.data)); };

  return (
    <div>
      <h1 className="font-display text-4xl text-white">TEAMS</h1>
      <p className="text-white/60 mt-1">Add teams to an auction and set their budget.</p>
      <div className="mt-6"><Label className="text-white/70">Auction</Label>
        <select value={aid} onChange={e=>setAid(e.target.value)} className="mt-1.5 h-10 rounded-md bg-white/5 border border-white/10 text-white px-3">
          {auctions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      {aid && (
        <Card className="mt-4 bg-white/[0.03] border border-white/10 p-5">
          <form onSubmit={create} className="grid sm:grid-cols-5 gap-3 items-end">
            <div><Label className="text-white/70">Team Name</Label><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
            <div><Label className="text-white/70">Owner</Label><Input required value={form.owner_name} onChange={e=>setForm({...form,owner_name:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
            <div><Label className="text-white/70">Purse (₹)</Label><Input type="number" placeholder="default" value={form.purse} onChange={e=>setForm({...form,purse:e.target.value})} className="mt-1.5 bg-white/5 border-white/10 text-white"/></div>
            <div><Label className="text-white/70">Color</Label><Input type="color" value={form.color} onChange={e=>setForm({...form,color:e.target.value})} className="mt-1.5 h-10 bg-white/5 border-white/10"/></div>
            <Button data-testid="add-team-btn" className="bg-gradient-to-r from-orange-500 to-amber-500 text-white h-10"><Plus className="w-4 h-4 mr-1"/> Add</Button>
          </form>
        </Card>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {teams.map(t => (
          <Card key={t.id} className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-3 h-3 rounded-full mb-2" style={{background:t.color}}/>
                <div className="text-white font-semibold">{t.name}</div>
                <div className="text-white/50 text-sm">Owner: {t.owner_name}</div>
                <div className="text-orange-400 text-sm mt-2">Purse: ₹{Number(t.purse).toLocaleString('en-IN')}</div>
                <div className="text-white/40 text-xs">Squad: {t.squad_count || 0} players</div>
              </div>
              <Button size="sm" variant="outline" onClick={()=>del(t.id)} className="border-red-500/40 text-red-400 bg-transparent"><Trash2 className="w-4 h-4"/></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function PlayersPage() {
  const { toast } = useToast();
  const [auctions, setAuctions] = useState([]);
  const [aid, setAid] = useState('');
  const [players, setPlayers] = useState([]);
  const [statusLoading, setStatusLoading] = useState(null);
  useEffect(() => { api.get('/auctions?mine=true').then(r=>{ setAuctions(r.data); if(r.data[0]) setAid(r.data[0].id); }); }, []);
  const load = () => { if(aid) api.get(`/players?auction_id=${aid}`).then(r=>setPlayers(r.data)); };
  useEffect(load, [aid]);
  const setStatus = async (p, status) => {
    setStatusLoading(p.id + status);
    try {
      await api.put(`/players/${p.id}`, { status });
      toast({ title: `Marked ${status}` });
      load();
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    } finally {
      setStatusLoading(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-4xl text-white">PLAYERS</h1>
      <p className="text-white/60 mt-1">Players registered to your auction pools.</p>
      <div className="mt-6"><Label className="text-white/70">Auction</Label>
        <select value={aid} onChange={e=>setAid(e.target.value)} className="mt-1.5 h-10 rounded-md bg-white/5 border border-white/10 text-white px-3">
          {auctions.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {players.map(p => (
          <Card key={p.id} data-testid={`player-card-${p.id}`} className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                {p.photo_url ? <img src={`${BACKEND}${p.photo_url}`} alt={p.name} className="w-full h-full object-cover"/> : <span className="font-display text-xl text-orange-400">{p.name?.[0]}</span>}
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold">{p.name}</div>
                <div className="text-white/50 text-xs">{p.role} • Base ₹{Number(p.base_price).toLocaleString('en-IN')}</div>
                <div className="mt-2">
                  {p.status === 'sold' ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">SOLD</Badge> :
                   p.status === 'unsold' ? <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Unsold</Badge> :
                   <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30">Registered</Badge>}
                </div>
              <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" disabled={statusLoading === p.id+'unsold'} onClick={()=>setStatus(p,'unsold')} className="border-white/20 text-white bg-transparent">{statusLoading===p.id+'unsold'?<Loader2 className="w-3 h-3 animate-spin"/>:'Unsold'}</Button>
                  <Button size="sm" variant="outline" disabled={statusLoading === p.id+'registered'} onClick={()=>setStatus(p,'registered')} className="border-white/20 text-white bg-transparent">{statusLoading===p.id+'registered'?<Loader2 className="w-3 h-3 animate-spin"/>:'Reset'}</Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * PaymentsPage — Razorpay payment integration
 *
 * Flow:
 *   1. User clicks "Buy" on a package card
 *   2. We call POST /api/checkout to create a Razorpay order (backend)
 *   3. We open the Razorpay checkout modal using their JS SDK
 *   4. User pays inside the modal
 *   5. We call POST /api/payment/verify to confirm with the backend
 *   6. Payment is saved and shown in the transaction history table
 */

/** Dynamically load the Razorpay checkout script from their CDN */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id  = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Available pricing packages */
const PACKAGES = [
  { id: 'starter',    name: 'Starter',    price: 999,   auctions: 1,  teams: 4,  features: ['1 Auction', 'Up to 4 Teams', '50 Players'] },
  { id: 'pro',        name: 'Pro',         price: 2999,  auctions: 5,  teams: 12, features: ['5 Auctions', 'Up to 12 Teams', '200 Players', 'Analytics'] },
  { id: 'enterprise', name: 'Enterprise',  price: 7999,  auctions: 20, teams: 20, features: ['20 Auctions', 'Unlimited Teams', 'Custom Branding'] },
  { id: 'tournament', name: 'Tournament',  price: 14999, auctions: -1, teams: -1, features: ['Unlimited Everything', 'White Label', 'API Access'] },
];

function PaymentsPage() {
  const { user }      = useAuth();
  const { toast }     = useToast();
  const [history, setHistory]       = useState([]);
  const [purchasing, setPurchasing] = useState(null);   // ID of package being purchased

  // Load existing payment history on mount
  useEffect(() => {
    api.get('/payments')
      .then(r => setHistory(r.data))
      .catch(() => { /* No payments yet — show empty state */ });
  }, []);

  /**
   * Handle the full Razorpay payment flow for a chosen package.
   * @param {Object} pkg - The package object with name and price
   */
  const handleBuy = async (pkg) => {
    setPurchasing(pkg.id);

    try {
      // Step 1: Load the Razorpay JS SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast({ title: 'Could not load payment gateway', description: 'Check your internet connection.', variant: 'destructive' });
        return;
      }

      // Step 2: Create a Razorpay order on the backend
      const { data: orderData } = await api.post('/checkout', {
        package_name: pkg.name,
        amount:       pkg.price,
      });

      // Step 3: Open the Razorpay checkout modal
      const razorpay = new window.Razorpay({
        key:         orderData.key_id,
        amount:      orderData.amount,
        currency:    orderData.currency,
        order_id:    orderData.order_id,
        name:        'AuctionPro',
        description: `${pkg.name} Package`,
        prefill: {
          name:  user?.name  || '',
          email: user?.email || '',
        },
        theme: { color: '#F97316' },  // Orange brand color

        // Step 4: Called by Razorpay after successful payment
        handler: async (response) => {
          try {
            // Step 5: Verify the payment signature on the backend
            await api.post('/payment/verify', {
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              package_name:        pkg.name,
              amount:              pkg.price,
            });

            // Step 6: Show success and refresh payment history
            toast({ title: `✅ Payment successful! ${pkg.name} package activated.` });
            const refreshed = await api.get('/payments');
            setHistory(refreshed.data);
          } catch {
            toast({ title: 'Payment verification failed', description: 'Contact support with your payment ID.', variant: 'destructive' });
          }
        },

        modal: {
          ondismiss: () => {
            toast({ title: 'Payment cancelled', variant: 'destructive' });
          },
        },
      });

      razorpay.open();

    } catch (err) {
      toast({
        title:       'Payment failed',
        description: err?.response?.data?.detail || 'Please try again.',
        variant:     'destructive',
      });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-4xl text-white">PAYMENTS</h1>
      <p className="text-white/60 mt-1">Choose a package to unlock more auctions and features.</p>

      {/* ── Pricing Cards ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {PACKAGES.map(pkg => (
          <Card key={pkg.id} className="bg-white/[0.03] border border-white/10 p-5 rounded-2xl flex flex-col">
            <div className="text-orange-400 text-xs uppercase tracking-widest font-semibold">{pkg.name}</div>
            <div className="font-display text-4xl text-white mt-2">₹{pkg.price.toLocaleString('en-IN')}</div>
            <div className="text-white/40 text-xs mt-1">one-time</div>
            <ul className="mt-4 space-y-1.5 flex-1">
              {pkg.features.map(f => (
                <li key={f} className="text-white/70 text-sm flex items-center gap-2">
                  <span className="text-orange-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button
              data-testid={`buy-${pkg.id}`}
              onClick={() => handleBuy(pkg)}
              disabled={purchasing === pkg.id}
              className="mt-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white w-full"
            >
              {purchasing === pkg.id
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Processing...</>
                : 'Buy Now'}
            </Button>
          </Card>
        ))}
      </div>

      {/* ── Transaction History ── */}
      <h2 className="font-display text-2xl text-white mt-10 mb-3">TRANSACTION <span className="brand-gradient-text">HISTORY</span></h2>
      <Card className="bg-white/[0.03] border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5 text-white/60">
              <th className="text-left p-3">Package</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Payment ID</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-white/40">
                  No transactions yet. Purchase a package above to get started.
                </td>
              </tr>
            )}
            {history.map(row => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="p-3 text-white">{row.package_name}</td>
                <td className="p-3 text-orange-400">₹{Number(row.amount).toLocaleString('en-IN')}</td>
                <td className="p-3 text-white/50 font-mono text-xs">{row.payment_id || '—'}</td>
                <td className="p-3">
                  {row.payment_status === 'paid'
                    ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Paid</Badge>
                    : <Badge className="bg-white/10 text-white/70">{row.payment_status}</Badge>}
                </td>
                <td className="p-3 text-white/50">{new Date(row.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function SettingsPage() {
  const { user } = useAuth();
  return (
    <div>
      <h1 className="font-display text-4xl text-white">SETTINGS</h1>
      <p className="text-white/60 mt-1">Your account details.</p>
      <Card className="mt-6 bg-white/[0.03] border border-white/10 p-6 max-w-xl">
        <div className="space-y-3">
          <div><Label className="text-white/60 text-xs uppercase tracking-widest">Name</Label><div className="text-white">{user?.name}</div></div>
          <div><Label className="text-white/60 text-xs uppercase tracking-widest">Email</Label><div className="text-white">{user?.email}</div></div>
          <div><Label className="text-white/60 text-xs uppercase tracking-widest">Role</Label><div className="text-white capitalize">{user?.role}</div></div>
          <div><Label className="text-white/60 text-xs uppercase tracking-widest">Phone</Label><div className="text-white">{user?.phone || '—'}</div></div>
        </div>
      </Card>
    </div>
  );
}

export default function CoordinatorDashboard() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex">
      <Sidebar/>
      <main className="flex-1 p-6 lg:p-10 overflow-auto">
        <Routes>
          <Route index element={<Overview/>}/>
          <Route path="auctions" element={<MyAuctions/>}/>
          <Route path="teams" element={<TeamsPage/>}/>
          <Route path="players" element={<PlayersPage/>}/>
          <Route path="payments" element={<PaymentsPage/>}/>
          <Route path="settings" element={<SettingsPage/>}/>
        </Routes>
      </main>
    </div>
  );
}
