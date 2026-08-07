import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, BACKEND } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Zap, Users, Trophy, Volume2, VolumeX, Shield, Timer } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LiveSpectator() {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [player, setPlayer] = useState(null);
  const [bid, setBid] = useState(0);
  const [team, setTeam] = useState(null);
  const [soldStatusOverlay, setSoldStatusOverlay] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    api.get(`/auctions/${id}`).then(r=>setAuction(r.data)).catch(()=>{});
    api.get(`/teams?auction_id=${id}`).then(r=>setTeams(r.data));
    api.get(`/players?auction_id=${id}`).then(r=>setPlayers(r.data));
  }, [id]);

  useEffect(() => {
    const s = getSocket();
    s.emit('join_auction', { auction_id: id });
    s.on('bid', ({ bid, team }) => { setBid(bid.amount); setTeam(team); setSoldStatusOverlay(null); });
    s.on('next_player', ({ player, base_price }) => { setPlayer(player); setBid(base_price); setTeam(null); setSoldStatusOverlay(null); });
    s.on('sold', ({ player, team, price }) => {
      setSoldStatusOverlay('sold');
      confetti({ particleCount: 140, spread: 90 });
      api.get(`/teams?auction_id=${id}`).then(r=>setTeams(r.data));
      api.get(`/players?auction_id=${id}`).then(r=>setPlayers(r.data));
    });
    s.on('unsold', () => {
      setSoldStatusOverlay('unsold');
      api.get(`/players?auction_id=${id}`).then(r=>setPlayers(r.data));
    });
    return () => s.emit('leave_auction', { auction_id: id });
  }, [id]);

  const soldCount = players.filter(p=>p.status==='sold').length;
  const unsoldCount = players.filter(p=>p.status==='unsold').length;
  const avlCount = players.filter(p=>p.status==='registered').length;

  return (
    <div className="min-h-screen bg-[#060812] text-white select-none">
      {/* ── Top TV Broadcast Header Bar ── */}
      <header className="border-b border-white/10 bg-[#0a0f24] backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Trophy className="w-5 h-5 text-white"/>
            </div>
            <div>
              <div className="font-display text-2xl tracking-wider text-white leading-tight uppercase">{auction?.name || 'LIVE AUCTION'}</div>
              <div className="text-[11px] text-amber-400 font-semibold tracking-widest uppercase">{auction?.sport} LEAGUE BROADCAST</div>
            </div>
          </div>

          {/* Center Broadcast Counters: SOLD, UNSOLD, AVAILABLE */}
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
              <span>SOLD :</span> <span className="text-sm font-black">{soldCount}</span>
            </div>
            <div className="bg-rose-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
              <span>UNSOLD :</span> <span className="text-sm font-black">{unsoldCount}</span>
            </div>
            <div className="bg-amber-500/90 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
              <span>AVL :</span> <span className="text-sm font-black">{avlCount}</span>
            </div>
          </div>

          <Badge className="bg-red-600 text-white border-none font-bold text-xs uppercase px-3 py-1.5 shadow flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping"/> LIVE TV BROADCAST
          </Badge>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto p-4 lg:p-6 grid lg:grid-cols-[1fr_400px] gap-6">
        {/* Left: Player Card on the Block */}
        <section>
          <Card className="relative bg-[#0d142d] border border-blue-900/40 p-6 rounded-3xl overflow-hidden shadow-2xl min-h-[420px]">
            {player ? (
              <div className="relative">
                {/* Lot Number Badge */}
                <div className="absolute -top-2 -left-2 bg-amber-400 text-slate-950 font-black text-2xl w-12 h-12 flex items-center justify-center rounded-xl shadow-lg z-20 border-2 border-slate-950">
                  {player.lot_number || 1}
                </div>

                <div className="grid md:grid-cols-[240px_1fr] gap-6 items-center pt-3">
                  <div className="w-56 h-56 mx-auto rounded-2xl overflow-hidden border-4 border-amber-400/80 bg-slate-900 shadow-2xl">
                    {player.photo_url ? (
                      <img src={`${BACKEND}${player.photo_url}`} alt={player.name} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display text-8xl text-amber-400 bg-gradient-to-t from-slate-950 to-slate-800">
                        {player.name?.[0]}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="text-amber-400 text-xs uppercase tracking-[0.3em] font-extrabold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/> ON THE BLOCK
                    </div>
                    <h1 className="font-display text-5xl text-white tracking-wide uppercase leading-tight">{player.name}</h1>
                    <div className="space-y-1 text-xs text-slate-300 font-semibold tracking-wider uppercase">
                      <div><span className="text-slate-400">ROLE:</span> <span className="text-white font-bold">{player.role || 'ALL ROUNDER'}</span></div>
                      <div><span className="text-slate-400">BAT:</span> <span className="text-white font-bold">{player.batting_style || 'RIGHT HAND BATSMAN'}</span></div>
                      <div><span className="text-slate-400">BOWL:</span> <span className="text-white font-bold">{player.bowling_style || 'RIGHT ARM MEDIUM'}</span></div>
                      <div><span className="text-slate-400">AGE:</span> <span className="text-white font-bold">{player.age || 21} YRS</span></div>
                    </div>
                  </div>
                </div>

                {/* Banner */}
                <div className="mt-8 bg-gradient-to-r from-red-700 via-rose-600 to-red-700 rounded-2xl p-4 flex items-center justify-between border border-red-500/40 shadow-xl">
                  <div>
                    <div className="text-[10px] text-red-200 uppercase tracking-widest font-extrabold">CURRENT LEADING BIDDER</div>
                    <div className="text-2xl font-black text-white uppercase tracking-wider">{team ? team.name : 'NO BIDS YET'}</div>
                  </div>
                  <div className="font-display text-4xl font-black text-amber-300">
                    ₹{Number(bid).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Stamp overlays */}
                {soldStatusOverlay === 'sold' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl flex items-center justify-center z-30">
                    <div className="border-8 border-emerald-500 text-emerald-400 text-6xl md:text-8xl font-black px-8 py-4 uppercase tracking-wider rounded-3xl transform -rotate-12 shadow-2xl bg-emerald-950/80 backdrop-blur text-center">
                      SOLD!
                      <div className="text-2xl text-white font-bold mt-2 font-sans">{team?.name} • ₹{bid.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                )}
                {soldStatusOverlay === 'unsold' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl flex items-center justify-center z-30">
                    <div className="border-8 border-rose-600 text-rose-500 text-5xl md:text-7xl font-black px-8 py-4 uppercase tracking-wider rounded-3xl transform -rotate-12 shadow-2xl bg-rose-950/80 backdrop-blur text-center">
                      REMAINS<br/>UNSOLD
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 font-display text-3xl tracking-wider">
                WAITING FOR NEXT PLAYER...
              </div>
            )}
          </Card>
        </section>

        {/* Right: Team Cards Grid */}
        <section className="space-y-3">
          <h3 className="font-display text-2xl text-white">TEAMS ({teams.length})</h3>
          <div className="space-y-3">
            {teams.map(t => {
              const maxBid = Math.max(0, t.purse - 5500);
              return (
                <Card key={t.id} className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-lg">
                        {t.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-white text-base">{t.name}</div>
                        <div className="text-xs text-slate-400">Players: {t.squad_count||0}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl text-amber-300">₹{Number(t.purse).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-emerald-400 font-bold">Max Bid: ₹{maxBid.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
