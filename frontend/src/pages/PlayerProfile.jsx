import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, BACKEND } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Zap, LogOut, Trophy } from 'lucide-react';

export default function PlayerProfile() {
  const { user, logout } = useAuth();
  const [players, setPlayers] = useState([]);

  useEffect(() => { api.get('/players/me').then(r=>setPlayers(r.data)).catch(()=>{}); }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="border-b border-white/10 backdrop-blur bg-black/40 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center"><Zap className="w-5 h-5 text-white" fill="white"/></div>
            <div className="font-display text-xl text-white">AUCTION<span className="brand-gradient-text">PRO</span></div>
          </Link>
          <Button variant="outline" onClick={logout} className="border-white/20 text-white bg-transparent hover:bg-white/5 hover:text-orange-400"><LogOut className="w-4 h-4 mr-2"/> Logout</Button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Player Dashboard</div>
        <h1 className="font-display text-4xl text-white">HI, <span className="brand-gradient-text">{user?.name?.toUpperCase()}</span></h1>
        <p className="text-white/60 mt-1">Track your registrations, sold status, and team assignments below.</p>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-semibold">My Auction Registrations</h2>
            <Link to="/register-player"><Button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white">Register for another auction</Button></Link>
          </div>
          {players.length === 0 ? (
            <Card className="bg-white/[0.03] border border-white/10 p-8 text-center">
              <Trophy className="w-10 h-10 mx-auto text-orange-400 mb-2"/>
              <p className="text-white/60">You haven't joined any auction pool yet.</p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {players.map(p => (
                <Card key={p.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {p.photo_url ? <img src={`${BACKEND}${p.photo_url}`} alt={p.name} className="w-full h-full object-cover"/> : <span className="font-display text-2xl text-orange-400">{p.name?.[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-semibold">{p.name}</div>
                      <div className="text-white/50 text-sm">{p.role} • {p.sport}</div>
                      <div className="text-xs text-white/40 mt-1">Base ₹{Number(p.base_price).toLocaleString('en-IN')}</div>
                      <div className="mt-3">
                        {p.status === 'sold' ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">SOLD ₹{Number(p.sold_price).toLocaleString('en-IN')}</Badge>
                        ) : p.status === 'unsold' ? (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Unsold</Badge>
                        ) : (
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Registered</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
